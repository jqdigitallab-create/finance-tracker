import { supabase } from "@/lib/supabase";
import { recalculateWalletBalance } from "@/lib/recalculateWalletBalance";

type BillFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "bi-yearly"
  | "yearly";

type RecurringBill = {
  id: string;
  bill_name: string;
  amount: number | null;
  currency: string | null;
  category: string | null;
  next_due_date: string | null;
  frequency: BillFrequency;
  wallet_id: string | null;
  auto_pay: boolean;
  is_active: boolean;
  last_auto_paid_due_date: string | null;
};

type WalletRow = {
  current_balance: number | null;
};

function addNextDueDate(dateString: string, frequency: BillFrequency) {
  const date = new Date(dateString);

  if (frequency === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (frequency === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else if (frequency === "quarterly") {
    date.setMonth(date.getMonth() + 3);
  } else if (frequency === "bi-yearly") {
    date.setMonth(date.getMonth() + 6);
  } else if (frequency === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date.toISOString().split("T")[0];
}

export async function processAutoPayRecurringBills(userId: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data: billsData, error: billsError } = await supabase
    .from("recurring_bills")
    .select(
      "id, bill_name, amount, currency, category, next_due_date, frequency, wallet_id, auto_pay, is_active, last_auto_paid_due_date"
    )
    .eq("user_id", userId)
    .eq("auto_pay", true)
    .eq("is_active", true)
    .lte("next_due_date", today);

  if (billsError) {
    throw billsError;
  }

  const dueBills = (billsData ?? []) as RecurringBill[];

  for (const bill of dueBills) {
    if (!bill.next_due_date || !bill.wallet_id) {
      continue;
    }

    if (bill.last_auto_paid_due_date === bill.next_due_date) {
      continue;
    }

    const billAmount = Number(bill.amount || 0);

    if (billAmount <= 0) {
      await supabase
        .from("recurring_bills")
        .update({
          auto_pay_failed_at: new Date().toISOString(),
          auto_pay_failure_reason: "Invalid bill amount",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bill.id);

      continue;
    }

    const { data: walletData, error: walletError } = await supabase
      .from("wallets")
      .select("current_balance")
      .eq("id", bill.wallet_id)
      .single();

    if (walletError || !walletData) {
      await supabase
        .from("recurring_bills")
        .update({
          auto_pay_failed_at: new Date().toISOString(),
          auto_pay_failure_reason: "Linked wallet not found",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bill.id);

      continue;
    }

    const walletBalance = Number((walletData as WalletRow).current_balance || 0);

    if (billAmount > walletBalance) {
      await supabase
        .from("recurring_bills")
        .update({
          auto_pay_failed_at: new Date().toISOString(),
          auto_pay_failure_reason: "Insufficient wallet balance",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bill.id);

      continue;
    }

    const { data: transactionData, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        wallet_id: bill.wallet_id,
        title: `Recurring Bill Auto Pay: ${bill.bill_name}`,
        transaction_type: "expense",
        category: bill.category || "Other",
        amount: billAmount,
        currency: bill.currency || "MYR",
        note: "Recurring bill auto pay",
        transaction_date: bill.next_due_date,
      })
      .select("id")
      .single();

    if (transactionError || !transactionData) {
      await supabase
        .from("recurring_bills")
        .update({
          auto_pay_failed_at: new Date().toISOString(),
          auto_pay_failure_reason: "Failed to create payment transaction",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bill.id);

      continue;
    }

    const nextDueDate = addNextDueDate(bill.next_due_date, bill.frequency);

    const { error: updateError } = await supabase
      .from("recurring_bills")
      .update({
        last_paid_date: bill.next_due_date,
        next_due_date: nextDueDate,
        linked_transaction_id: transactionData.id,
        last_auto_paid_due_date: bill.next_due_date,
        auto_pay_failed_at: null,
        auto_pay_failure_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bill.id);

    if (updateError) {
      continue;
    }

    await recalculateWalletBalance(bill.wallet_id);
  }
}