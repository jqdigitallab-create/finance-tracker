import { supabase } from "@/lib/supabase";

type WalletBalanceRow = {
  current_balance: number | null;
};

type SavingsGoalRow = {
  current_amount: number | null;
};

export type SafeToSpendSummary = {
  safeToSpend: number;
  savedAmount: number;
  totalBalance: number;
};

export async function getSafeToSpendSummary(userId: string): Promise<SafeToSpendSummary> {
  const [
    { data: walletData, error: walletError },
    { data: savingsData, error: savingsError },
  ] = await Promise.all([
    supabase
      .from("wallets")
      .select("current_balance")
      .eq("user_id", userId),
    supabase
      .from("savings_goals")
      .select("current_amount")
      .eq("user_id", userId),
  ]);

  if (walletError) {
    throw walletError;
  }

  if (savingsError) {
    throw savingsError;
  }

  const safeToSpend = ((walletData ?? []) as WalletBalanceRow[]).reduce(
    (sum, wallet) => sum + Number(wallet.current_balance || 0),
    0
  );

  const savedAmount = ((savingsData ?? []) as SavingsGoalRow[]).reduce(
    (sum, goal) => sum + Number(goal.current_amount || 0),
    0
  );

  return {
    safeToSpend,
    savedAmount,
    totalBalance: safeToSpend + savedAmount,
  };
}