"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { recalculateWalletBalance } from "@/lib/recalculateWalletBalance";
import { formatCurrency } from "@/lib/formatCurrency";
import { createTransfer, getErrorMessage } from "@/lib/transferHelpers";
import {
  CategoryRecord,
  ensureDefaultCategories,
  fetchUserCategories,
  findCategoryByName,
} from "@/lib/categoryHelpers";
import {
  SubcategoryRecord,
  ensureDefaultSubcategories,
  fetchUserSubcategories,
  findSubcategoryByName,
} from "@/lib/subcategoryHelpers";
import { addOneMonthToDate } from "@/lib/goalDebtAnalytics";

type Wallet = {
  id: string;
  wallet_name: string;
  current_balance?: number | null;
  currency?: string | null;
};

type SavingsGoal = {
  id: string;
  goal_name: string;
  current_amount?: number | null;
  target_amount?: number | null;
  currency?: string | null;
};

type Debt = {
  id: string;
  debt_name: string;
  remaining_amount?: number | null;
  total_amount?: number | null;
  due_date?: string | null;
  last_paid_date?: string | null;
};

type BillFrequency =
  | "weekly"
  | "monthly"
  | "quarterly"
  | "bi-yearly"
  | "yearly";

type RecurringBill = {
  id: string;
  bill_name: string;
  amount: number;
  currency: string | null;
  category: string | null;
  category_id?: string | null;
  next_due_date: string | null;
  frequency: BillFrequency;
  wallet_id: string | null;
  is_active: boolean;
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

export default function AddTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryRecord[]>([]);
  const [incomeSubcategories, setIncomeSubcategories] = useState<SubcategoryRecord[]>([]);
  const [expenseSubcategories, setExpenseSubcategories] = useState<SubcategoryRecord[]>([]);

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [actionType, setActionType] = useState("expense");

  const [transactionType, setTransactionType] = useState("expense");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [subcategory, setSubcategory] = useState("");
  const [walletId, setWalletId] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [note, setNote] = useState("");

  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [selectedDebtId, setSelectedDebtId] = useState("");
  const [selectedRecurringBillId, setSelectedRecurringBillId] = useState("");

  const [transferFromWalletId, setTransferFromWalletId] = useState("");
  const [transferToWalletId, setTransferToWalletId] = useState("");

  useEffect(() => {
    const action = searchParams.get("action");

    if (
      action === "income" ||
      action === "expense" ||
      action === "transfer" ||
      action === "saving" ||
      action === "debt_repayment" ||
      action === "recurring_bill_payment"
    ) {
      setActionType(action);
    }
  }, [searchParams]);

  async function fetchFormData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoadingData(false);
      return;
    }

    await ensureDefaultCategories(user.id);

    const [incomeCategoryRows, expenseCategoryRows] = await Promise.all([
      fetchUserCategories(user.id, "income"),
      fetchUserCategories(user.id, "expense"),
    ]);

    await ensureDefaultSubcategories(user.id, [...incomeCategoryRows, ...expenseCategoryRows]);

    const [
      { data: walletData, error: walletError },
      { data: goalsData, error: goalsError },
      { data: debtsData, error: debtsError },
      { data: recurringBillsData, error: recurringBillsError },
      incomeSubcategoryRows,
      expenseSubcategoryRows,
    ] = await Promise.all([
      supabase
        .from("wallets")
        .select("id, wallet_name, current_balance, currency")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("savings_goals")
        .select("id, goal_name, current_amount, target_amount, currency")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("debts")
        .select("id, debt_name, remaining_amount, total_amount, due_date, last_paid_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("recurring_bills")
        .select("id, bill_name, amount, currency, category, category_id, next_due_date, frequency, wallet_id, is_active")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("bill_name", { ascending: true }),
      fetchUserSubcategories(user.id, undefined),
      fetchUserSubcategories(user.id, undefined),
    ]);

    if (walletError) console.error("Wallet fetch error:", walletError);
    if (goalsError) console.error("Goals fetch error:", goalsError);
    if (debtsError) console.error("Debts fetch error:", debtsError);
    if (recurringBillsError) console.error("Recurring bills fetch error:", recurringBillsError);

    const walletRows = (walletData ?? []) as Wallet[];
    const goalRows = (goalsData ?? []) as SavingsGoal[];
    const debtRows = (debtsData ?? []) as Debt[];
    const billRows = (recurringBillsData ?? []) as RecurringBill[];

    setWallets(walletRows);
    setGoals(goalRows);
    setDebts(debtRows);
    setRecurringBills(billRows);
    setIncomeCategories(incomeCategoryRows);
    setExpenseCategories(expenseCategoryRows);
    setIncomeSubcategories(
      (incomeSubcategoryRows ?? []).filter((item) =>
        incomeCategoryRows.some((category) => category.id === item.category_id)
      )
    );
    setExpenseSubcategories(
      (expenseSubcategoryRows ?? []).filter((item) =>
        expenseCategoryRows.some((category) => category.id === item.category_id)
      )
    );

    if (walletRows.length > 0 && !walletId) {
      setWalletId(walletRows[0].id);
    }

    if (walletRows.length > 0 && !transferFromWalletId) {
      setTransferFromWalletId(walletRows[0].id);
    }

    if (walletRows.length > 1 && !transferToWalletId) {
      setTransferToWalletId(walletRows[1].id);
    } else if (walletRows.length > 0 && !transferToWalletId) {
      setTransferToWalletId(walletRows[0].id);
    }

    const requestedGoalId = searchParams.get("goalId");
    const requestedDebtId = searchParams.get("debtId");
    const requestedBillId = searchParams.get("billId");

    if (requestedGoalId && goalRows.some((goal) => goal.id === requestedGoalId)) {
      setSelectedGoalId(requestedGoalId);
    } else if (goalRows.length > 0) {
      setSelectedGoalId(goalRows[0].id);
    }

    if (requestedDebtId && debtRows.some((debt) => debt.id === requestedDebtId)) {
      setSelectedDebtId(requestedDebtId);
    } else if (debtRows.length > 0) {
      setSelectedDebtId(debtRows[0].id);
    }

    if (requestedBillId && billRows.some((bill) => bill.id === requestedBillId)) {
      setSelectedRecurringBillId(requestedBillId);
    } else if (billRows.length > 0) {
      setSelectedRecurringBillId(billRows[0].id);
    }

    setLoadingData(false);
  }

  useEffect(() => {
    fetchFormData();
  }, [searchParams]);

  const currentCategoryOptions =
    actionType === "income" ? incomeCategories : expenseCategories;

  const currentSubcategoryOptions = useMemo(() => {
    const selectedCategory =
      actionType === "income"
        ? findCategoryByName(incomeCategories, category)
        : findCategoryByName(expenseCategories, category);

    if (!selectedCategory) return [];

    const source = actionType === "income" ? incomeSubcategories : expenseSubcategories;
    return source.filter((item) => item.category_id === selectedCategory.id);
  }, [
    actionType,
    category,
    incomeCategories,
    expenseCategories,
    incomeSubcategories,
    expenseSubcategories,
  ]);

  useEffect(() => {
    if (actionType === "income") {
      setTransactionType("income");
      const defaultCategory = incomeCategories[0]?.name || "Salary";
      setCategory(defaultCategory);
      setTitle("");
    } else if (actionType === "expense") {
      setTransactionType("expense");
      const defaultCategory = expenseCategories[0]?.name || "Food";
      setCategory(defaultCategory);
      setTitle("");
    } else if (actionType === "transfer") {
      setTransactionType("expense");
      setCategory("Transfer");
      setSubcategory("");
      setTitle("");
    } else if (actionType === "saving") {
      setTransactionType("expense");
      setCategory("Savings");
      setSubcategory("");
      setTitle("");
    } else if (actionType === "debt_repayment") {
      setTransactionType("expense");
      setCategory("Debt");
      setSubcategory("");
      setTitle("");
    } else if (actionType === "recurring_bill_payment") {
      setTransactionType("expense");
      const defaultCategory = expenseCategories[0]?.name || "Utilities";
      setCategory(defaultCategory);
      setTitle("");
    }
  }, [actionType, incomeCategories, expenseCategories]);

  useEffect(() => {
    if (currentSubcategoryOptions.length === 0) {
      setSubcategory("");
      return;
    }

    const exists = currentSubcategoryOptions.some((item) => item.name === subcategory);
    if (!exists) {
      setSubcategory(currentSubcategoryOptions[0].name);
    }
  }, [currentSubcategoryOptions, subcategory]);

  useEffect(() => {
    if (actionType !== "recurring_bill_payment") return;

    const selectedBill = recurringBills.find((bill) => bill.id === selectedRecurringBillId);
    if (!selectedBill) return;

    setAmount(String(selectedBill.amount || ""));
    setCategory(selectedBill.category || expenseCategories[0]?.name || "Other");
    setSubcategory("");
    if (selectedBill.wallet_id) {
      setWalletId(selectedBill.wallet_id);
    }
    if (selectedBill.next_due_date) {
      setTransactionDate(selectedBill.next_due_date);
    }
  }, [actionType, selectedRecurringBillId, recurringBills, expenseCategories]);

  const selectedWallet = wallets.find((wallet) => wallet.id === walletId) || null;
  const selectedGoal = goals.find((goal) => goal.id === selectedGoalId) || null;
  const selectedDebt = debts.find((debt) => debt.id === selectedDebtId) || null;
  const selectedBill =
    recurringBills.find((bill) => bill.id === selectedRecurringBillId) || null;
  const transferFromWallet =
    wallets.find((wallet) => wallet.id === transferFromWalletId) || null;
  const transferToWallet =
    wallets.find((wallet) => wallet.id === transferToWalletId) || null;

  const selectedCategoryRecord =
    actionType === "income"
      ? findCategoryByName(incomeCategories, category)
      : findCategoryByName(expenseCategories, category);

  const selectedSubcategoryRecord =
    actionType === "income"
      ? findSubcategoryByName(incomeSubcategories, subcategory)
      : findSubcategoryByName(expenseSubcategories, subcategory);

  const pageCopy = useMemo(() => {
    if (actionType === "income") {
      return {
        heading: "Add Income",
        subheading: "Record money coming in.",
        amountLabel: "Amount Received",
        walletLabel: "Destination Wallet",
        noteLabel: "Income Note",
        submitLabel: "Save Income",
        helper: "Use this for salary, bonus, business income, refunds, or any money received.",
      };
    }

    if (actionType === "expense") {
      return {
        heading: "Add Expense",
        subheading: "Record money going out.",
        amountLabel: "Amount Spent",
        walletLabel: "Source Wallet",
        noteLabel: "Expense Note",
        submitLabel: "Save Expense",
        helper: "Use this for daily spending like food, transport, utilities, shopping, and everything else not tied to savings, debts, or recurring bills.",
      };
    }

    if (actionType === "transfer") {
      return {
        heading: "Transfer Between Wallets",
        subheading: "Move money between your wallets.",
        amountLabel: "Transfer Amount",
        walletLabel: "Wallets",
        noteLabel: "Transfer Note",
        submitLabel: "Save Transfer",
        helper: "This moves money internally between wallets. It does not count as spending or income.",
      };
    }

    if (actionType === "saving") {
      return {
        heading: "Add Saving",
        subheading: "Move money from a wallet into a savings goal.",
        amountLabel: "Contribution Amount",
        walletLabel: "Source Wallet",
        noteLabel: "Saving Note",
        submitLabel: "Save Contribution",
        helper: "This creates a linked expense transaction, updates the selected savings goal, and reduces the selected wallet balance.",
      };
    }

    if (actionType === "debt_repayment") {
      return {
        heading: "Add Debt Repayment",
        subheading: "Record a repayment made from a wallet.",
        amountLabel: "Repayment Amount",
        walletLabel: "Source Wallet",
        noteLabel: "Repayment Note",
        submitLabel: "Save Repayment",
        helper: "This creates a linked expense transaction, reduces the selected debt balance, updates last paid date, and moves the next due date one month forward.",
      };
    }

    return {
      heading: "Pay Recurring Bill",
      subheading: "Record a recurring bill payment.",
      amountLabel: "Bill Amount",
      walletLabel: "Source Wallet",
      noteLabel: "Payment Note",
      submitLabel: "Pay Bill",
      helper: "This creates an expense transaction and automatically updates the recurring bill paid date and next due date.",
    };
  }, [actionType]);

  function getRedirectPath() {
    if (actionType === "saving") return "/savings-goals";
    if (actionType === "debt_repayment") return "/debts";
    if (actionType === "recurring_bill_payment") return "/recurring-bills";
    return "/transactions";
  }

  async function handleStandardTransaction(userId: string, numericAmount: number) {
    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: userId,
      wallet_id: walletId,
      title: title.trim(),
      transaction_type: transactionType,
      category,
      category_id: selectedCategoryRecord?.id || null,
      subcategory: subcategory || null,
      subcategory_id: selectedSubcategoryRecord?.id || null,
      amount: numericAmount,
      currency: selectedWallet?.currency || "MYR",
      note: note.trim(),
      transaction_date: transactionDate,
    });

    if (insertError) throw insertError;

    await recalculateWalletBalance(walletId);
  }

  async function handleSavingAction(userId: string, numericAmount: number) {
    const selectedGoal = goals.find((goal) => goal.id === selectedGoalId);

    if (!selectedGoal) {
      throw new Error("Savings goal not found.");
    }

    const selectedWallet = wallets.find((wallet) => wallet.id === walletId);
    const walletBalance = Number(selectedWallet?.current_balance || 0);

    if (numericAmount > walletBalance) {
      throw new Error("Not enough wallet balance for this savings contribution.");
    }

    const { data: transactionData, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        wallet_id: walletId,
        title: `Savings Contribution: ${selectedGoal.goal_name}`,
        transaction_type: "expense",
        category: "Savings",
        category_id: null,
        subcategory: null,
        subcategory_id: null,
        amount: numericAmount,
        currency: selectedGoal.currency || selectedWallet?.currency || "MYR",
        note: note.trim() || null,
        transaction_date: transactionDate,
      })
      .select("id")
      .single();

    if (transactionError || !transactionData) {
      throw transactionError || new Error("Failed to create linked transaction.");
    }

    const linkedTransactionId = transactionData.id as string;

    const { error: contributionError } = await supabase
      .from("savings_goal_contributions")
      .insert({
        user_id: userId,
        savings_goal_id: selectedGoal.id,
        wallet_id: walletId,
        linked_transaction_id: linkedTransactionId,
        amount: numericAmount,
        contribution_date: transactionDate,
        note: note.trim() || null,
      });

    if (contributionError) {
      throw contributionError;
    }

    const newCurrentAmount = Number(selectedGoal.current_amount || 0) + numericAmount;

    const { error: goalUpdateError } = await supabase
      .from("savings_goals")
      .update({
        current_amount: newCurrentAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedGoal.id);

    if (goalUpdateError) {
      throw goalUpdateError;
    }

    await recalculateWalletBalance(walletId);
  }

  async function handleDebtRepaymentAction(userId: string, numericAmount: number) {
    const selectedDebt = debts.find((debt) => debt.id === selectedDebtId);

    if (!selectedDebt) {
      throw new Error("Debt not found.");
    }

    const selectedWallet = wallets.find((wallet) => wallet.id === walletId);
    const walletBalance = Number(selectedWallet?.current_balance || 0);

    if (numericAmount > walletBalance) {
      throw new Error("Not enough wallet balance for this debt repayment.");
    }

    const effectiveDate = transactionDate;
    const currentDueDate = selectedDebt.due_date || effectiveDate;
    const nextDueDate = addOneMonthToDate(currentDueDate);

    const newRemainingAmount = Math.max(
      0,
      Number(selectedDebt.remaining_amount || 0) - numericAmount
    );

    const { data: transactionData, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        wallet_id: walletId,
        title: `Debt Repayment: ${selectedDebt.debt_name}`,
        transaction_type: "expense",
        category: "Debt",
        category_id: null,
        subcategory: null,
        subcategory_id: null,
        amount: numericAmount,
        currency: selectedWallet?.currency || "MYR",
        note: note.trim() || null,
        transaction_date: effectiveDate,
      })
      .select("id")
      .single();

    if (transactionError || !transactionData) {
      throw transactionError || new Error("Failed to create linked transaction.");
    }

    const linkedTransactionId = transactionData.id as string;

    const { error: repaymentError } = await supabase
      .from("debt_repayments")
      .insert({
        user_id: userId,
        debt_id: selectedDebt.id,
        wallet_id: walletId,
        linked_transaction_id: linkedTransactionId,
        amount: numericAmount,
        repayment_date: effectiveDate,
        note: note.trim() || null,
      });

    if (repaymentError) {
      throw repaymentError;
    }

    const { error: debtUpdateError } = await supabase
      .from("debts")
      .update({
        remaining_amount: newRemainingAmount,
        last_paid_date: effectiveDate,
        due_date: newRemainingAmount <= 0 ? currentDueDate : nextDueDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedDebt.id);

    if (debtUpdateError) {
      throw debtUpdateError;
    }

    await recalculateWalletBalance(walletId);
  }

  async function handleRecurringBillPaymentAction(userId: string, numericAmount: number) {
    const selectedBill = recurringBills.find((bill) => bill.id === selectedRecurringBillId);
    if (!selectedBill) throw new Error("Recurring bill not found.");
    if (!selectedBill.is_active) throw new Error("This recurring bill is inactive.");

    const selectedWallet = wallets.find((wallet) => wallet.id === walletId);
    const walletBalance = Number(selectedWallet?.current_balance || 0);

    if (numericAmount > walletBalance) {
      throw new Error("Not enough wallet balance for this recurring bill payment.");
    }

    const effectiveDate = transactionDate || selectedBill.next_due_date;
    if (!effectiveDate) {
      throw new Error("Please select a payment date.");
    }

    const nextBaseDate = selectedBill.next_due_date || effectiveDate;
    const newNextDueDate = addNextDueDate(nextBaseDate, selectedBill.frequency);
    const billCategoryRecord =
      findCategoryByName(expenseCategories, selectedBill.category) ||
      findCategoryByName(expenseCategories, category);

    const { data: transactionData, error: transactionError } = await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        wallet_id: walletId,
        title: `Recurring Bill: ${selectedBill.bill_name}`,
        transaction_type: "expense",
        category: selectedBill.category || category || "Other",
        category_id: billCategoryRecord?.id || null,
        subcategory: null,
        subcategory_id: null,
        amount: numericAmount,
        currency: selectedBill.currency || selectedWallet?.currency || "MYR",
        note: note.trim() || "Recurring bill payment",
        transaction_date: effectiveDate,
      })
      .select("id")
      .single();

    if (transactionError || !transactionData) {
      throw transactionError || new Error("Failed to create recurring bill transaction.");
    }

    const linkedTransactionId = transactionData.id as string;

    const { error: billUpdateError } = await supabase
      .from("recurring_bills")
      .update({
        last_paid_date: effectiveDate,
        next_due_date: newNextDueDate,
        wallet_id: walletId,
        linked_transaction_id: linkedTransactionId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedBill.id);

    if (billUpdateError) throw billUpdateError;

    await recalculateWalletBalance(walletId);
  }

  async function handleSaveTransaction(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not found.");

      if (actionType === "transfer") {
        if (!transferFromWalletId) throw new Error("Please select source wallet.");
        if (!transferToWalletId) throw new Error("Please select destination wallet.");
        if (!amount || Number(amount) <= 0) throw new Error("Please enter a valid amount.");
        if (!transactionDate) throw new Error("Please select a date.");

        await createTransfer({
          userId: user.id,
          fromWalletId: transferFromWalletId,
          toWalletId: transferToWalletId,
          amount: Number(amount),
          transferDate: transactionDate,
          note,
        });

        router.push("/transactions");
        router.refresh();
        return;
      }

      if (!walletId) throw new Error("Please select a wallet.");
      if (!amount || Number(amount) <= 0) throw new Error("Please enter a valid amount.");
      if (!transactionDate && actionType !== "recurring_bill_payment") {
        throw new Error("Please select a date.");
      }

      if ((actionType === "income" || actionType === "expense") && !title.trim()) {
        throw new Error("Please enter a title.");
      }

      if (actionType === "income" && !selectedCategoryRecord) {
        throw new Error("Please select a valid income category.");
      }

      if (actionType === "expense" && !selectedCategoryRecord) {
        throw new Error("Please select a valid expense category.");
      }

      if (
        (actionType === "income" || actionType === "expense") &&
        currentSubcategoryOptions.length > 0 &&
        !selectedSubcategoryRecord
      ) {
        throw new Error("Please select a valid subcategory.");
      }

      if (actionType === "saving" && !selectedGoalId) {
        throw new Error("Please select a savings goal.");
      }

      if (actionType === "debt_repayment" && !selectedDebtId) {
        throw new Error("Please select a debt.");
      }

      if (actionType === "recurring_bill_payment" && !selectedRecurringBillId) {
        throw new Error("Please select a recurring bill.");
      }

      const numericAmount = Number(amount);

      if (actionType === "saving") {
        await handleSavingAction(user.id, numericAmount);
      } else if (actionType === "debt_repayment") {
        await handleDebtRepaymentAction(user.id, numericAmount);
      } else if (actionType === "recurring_bill_payment") {
        await handleRecurringBillPaymentAction(user.id, numericAmount);
      } else {
        await handleStandardTransaction(user.id, numericAmount);
      }

      router.push(getRedirectPath());
      router.refresh();
    } catch (error) {
      alert(getErrorMessage(error));
      setSaving(false);
      return;
    }
  }

  function renderLinkedSummary() {
    if (actionType === "transfer") {
      return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm text-zinc-400">Transfer Summary</p>
          <div className="mt-3 grid gap-2 text-sm text-zinc-400 md:grid-cols-2">
            <p>
              From:{" "}
              {transferFromWallet
                ? `${transferFromWallet.wallet_name} (${formatCurrency(
                    Number(transferFromWallet.current_balance || 0),
                    transferFromWallet.currency || "MYR"
                  )})`
                : "Not selected"}
            </p>
            <p>
              To:{" "}
              {transferToWallet
                ? `${transferToWallet.wallet_name} (${formatCurrency(
                    Number(transferToWallet.current_balance || 0),
                    transferToWallet.currency || "MYR"
                  )})`
                : "Not selected"}
            </p>
          </div>
        </div>
      );
    }

    if (actionType === "saving") {
      if (!selectedGoal) {
        return (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            No savings goal available yet. Create one first in Savings Goals.
          </div>
        );
      }

      const current = Number(selectedGoal.current_amount || 0);
      const target = Number(selectedGoal.target_amount || 0);
      const remaining = Math.max(0, target - current);

      return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm text-zinc-400">Selected Savings Goal</p>
          <h3 className="mt-2 text-lg font-semibold">{selectedGoal.goal_name}</h3>
          <div className="mt-3 grid gap-2 text-sm text-zinc-400 md:grid-cols-3">
            <p>Saved: {formatCurrency(current, selectedGoal.currency || "MYR")}</p>
            <p>Target: {formatCurrency(target, selectedGoal.currency || "MYR")}</p>
            <p>Remaining: {formatCurrency(remaining, selectedGoal.currency || "MYR")}</p>
          </div>
        </div>
      );
    }

    if (actionType === "debt_repayment") {
      if (!selectedDebt) {
        return (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            No debt available yet. Create one first in Debts.
          </div>
        );
      }

      const remaining = Number(selectedDebt.remaining_amount || 0);
      const total = Number(selectedDebt.total_amount || 0);
      const paid = Math.max(0, total - remaining);

      return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm text-zinc-400">Selected Debt</p>
          <h3 className="mt-2 text-lg font-semibold">{selectedDebt.debt_name}</h3>
          <div className="mt-3 grid gap-2 text-sm text-zinc-400 md:grid-cols-2">
            <p>Remaining: {formatCurrency(remaining, "MYR")}</p>
            <p>Total: {formatCurrency(total, "MYR")}</p>
            <p>Paid: {formatCurrency(paid, "MYR")}</p>
            <p>Next Due Date: {selectedDebt.due_date || "Not set"}</p>
          </div>
        </div>
      );
    }

    if (actionType === "recurring_bill_payment") {
      if (!selectedBill) {
        return (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
            No active recurring bill available yet. Create one first in Recurring Bills.
          </div>
        );
      }

      return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <p className="text-sm text-zinc-400">Selected Recurring Bill</p>
          <h3 className="mt-2 text-lg font-semibold">{selectedBill.bill_name}</h3>
          <div className="mt-3 grid gap-2 text-sm text-zinc-400 md:grid-cols-3">
            <p>Amount: {formatCurrency(selectedBill.amount, selectedBill.currency || "MYR")}</p>
            <p>Due Date: {selectedBill.next_due_date || "Not set"}</p>
            <p>Frequency: {selectedBill.frequency}</p>
          </div>
        </div>
      );
    }

    return null;
  }

  if (loadingData) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-3xl text-zinc-400">Loading form...</div>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
          You need to add at least one wallet before creating a transaction.
        </div>
      </div>
    );
  }

  const isStandardTransaction = actionType === "income" || actionType === "expense";
  const walletBalance = Number(selectedWallet?.current_balance || 0);
  const walletCurrency = selectedWallet?.currency || "MYR";

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">{pageCopy.heading}</h1>
          <p className="mt-2 text-zinc-400">{pageCopy.subheading}</p>
        </div>

        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">
          {pageCopy.helper}
        </div>

        {renderLinkedSummary() ? <div className="mb-6">{renderLinkedSummary()}</div> : null}

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <form className="space-y-5" onSubmit={handleSaveTransaction}>
            <div>
              <label className="mb-2 block text-sm">Action Type</label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
                <option value="saving">Saving</option>
                <option value="debt_repayment">Debt Repayment</option>
                <option value="recurring_bill_payment">Recurring Bill Payment</option>
              </select>
            </div>

            {actionType === "transfer" ? (
              <>
                <div>
                  <label className="mb-2 block text-sm">From Wallet</label>
                  <select
                    value={transferFromWalletId}
                    onChange={(e) => setTransferFromWalletId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                  >
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.wallet_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm">To Wallet</label>
                  <select
                    value={transferToWalletId}
                    onChange={(e) => setTransferToWalletId(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                  >
                    {wallets.map((wallet) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.wallet_name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : null}

            {isStandardTransaction ? (
              <>
                <div>
                  <label className="mb-2 block text-sm">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter transaction title"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                  >
                    {currentCategoryOptions.map((item) => (
                      <option key={item.id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm">Subcategory</label>
                  <select
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    disabled={currentSubcategoryOptions.length === 0}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none disabled:opacity-60"
                  >
                    {currentSubcategoryOptions.length === 0 ? (
                      <option value="">No subcategory available</option>
                    ) : (
                      currentSubcategoryOptions.map((item) => (
                        <option key={item.id} value={item.name}>
                          {item.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </>
            ) : null}

            {actionType === "saving" ? (
              <div>
                <label className="mb-2 block text-sm">Savings Goal</label>
                <select
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  {goals.length === 0 ? (
                    <option value="">No savings goals available</option>
                  ) : (
                    goals.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.goal_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            ) : null}

            {actionType === "debt_repayment" ? (
              <div>
                <label className="mb-2 block text-sm">Debt</label>
                <select
                  value={selectedDebtId}
                  onChange={(e) => setSelectedDebtId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  {debts.length === 0 ? (
                    <option value="">No debts available</option>
                  ) : (
                    debts.map((debt) => (
                      <option key={debt.id} value={debt.id}>
                        {debt.debt_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            ) : null}

            {actionType === "recurring_bill_payment" ? (
              <div>
                <label className="mb-2 block text-sm">Recurring Bill</label>
                <select
                  value={selectedRecurringBillId}
                  onChange={(e) => setSelectedRecurringBillId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  {recurringBills.length === 0 ? (
                    <option value="">No recurring bills available</option>
                  ) : (
                    recurringBills.map((bill) => (
                      <option key={bill.id} value={bill.id}>
                        {bill.bill_name}
                      </option>
                    ))
                  )}
                </select>
              </div>
            ) : null}

            {actionType !== "transfer" ? (
              <div>
                <label className="mb-2 block text-sm">{pageCopy.walletLabel}</label>
                <select
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.wallet_name}
                    </option>
                  ))}
                </select>

                {selectedWallet ? (
                  <p className="mt-2 text-xs text-zinc-500">
                    Available in {selectedWallet.wallet_name}:{" "}
                    {formatCurrency(walletBalance, walletCurrency)}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div>
              <label className="mb-2 block text-sm">{pageCopy.amountLabel}</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Date</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">{pageCopy.noteLabel}</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add note"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                rows={4}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Saving..." : pageCopy.submitLabel}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}