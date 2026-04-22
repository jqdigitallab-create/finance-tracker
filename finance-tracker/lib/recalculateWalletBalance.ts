import { supabase } from "@/lib/supabase";

export async function recalculateWalletBalance(walletId: string) {
  const { data: wallet, error: walletError } = await supabase
    .from("wallets")
    .select("starting_balance")
    .eq("id", walletId)
    .single();

  if (walletError) {
    throw new Error(walletError.message);
  }

  const { data: transactions, error: transactionError } = await supabase
    .from("transactions")
    .select("transaction_type, amount")
    .eq("wallet_id", walletId);

  if (transactionError) {
    throw new Error(transactionError.message);
  }

  const startingBalance = Number(wallet?.starting_balance || 0);

  const income = (transactions ?? [])
    .filter((item) => item.transaction_type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expenses = (transactions ?? [])
    .filter((item) => item.transaction_type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const newBalance = startingBalance + income - expenses;

  const { error: updateError } = await supabase
    .from("wallets")
    .update({
      current_balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", walletId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  return newBalance;
}