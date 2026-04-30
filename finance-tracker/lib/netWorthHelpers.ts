import { supabase } from "@/lib/supabase";

export type WalletRow = {
  id: string;
  wallet_name: string;
  current_balance: number | null;
  currency: string | null;
};

export type SavingsGoalRow = {
  id: string;
  goal_name: string;
  current_amount: number | null;
  currency: string | null;
};

export type DebtRow = {
  id: string;
  debt_name: string;
  remaining_amount: number | null;
};

export type NetWorthAssetRow = {
  id: string;
  asset_name: string;
  asset_type: "cash" | "investment" | "property" | "vehicle" | "business" | "other";
  amount: number | null;
  currency: string | null;
  note: string | null;
  is_active: boolean;
};

export type NetWorthLiabilityRow = {
  id: string;
  liability_name: string;
  liability_type:
    | "loan"
    | "credit_card"
    | "mortgage"
    | "vehicle_loan"
    | "personal_debt"
    | "tax"
    | "other";
  amount: number | null;
  currency: string | null;
  note: string | null;
  is_active: boolean;
};

export type NetWorthSummary = {
  walletAssets: number;
  savingsAssets: number;
  manualAssets: number;
  debtLiabilities: number;
  manualLiabilities: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
};

export async function getNetWorthData(userId: string) {
  const [
    { data: walletData, error: walletError },
    { data: savingsData, error: savingsError },
    { data: debtData, error: debtError },
    { data: assetData, error: assetError },
    { data: liabilityData, error: liabilityError },
  ] = await Promise.all([
    supabase
      .from("wallets")
      .select("id, wallet_name, current_balance, currency")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("savings_goals")
      .select("id, goal_name, current_amount, currency")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("debts")
      .select("id, debt_name, remaining_amount")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    supabase
      .from("net_worth_assets")
      .select("id, asset_name, asset_type, amount, currency, note, is_active")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("net_worth_liabilities")
      .select("id, liability_name, liability_type, amount, currency, note, is_active")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  ]);

  if (walletError) throw walletError;
  if (savingsError) throw savingsError;
  if (debtError) throw debtError;
  if (assetError) throw assetError;
  if (liabilityError) throw liabilityError;

  const wallets = (walletData ?? []) as WalletRow[];
  const savingsGoals = (savingsData ?? []) as SavingsGoalRow[];
  const debts = (debtData ?? []) as DebtRow[];
  const manualAssets = (assetData ?? []) as NetWorthAssetRow[];
  const manualLiabilities = (liabilityData ?? []) as NetWorthLiabilityRow[];

  const walletAssets = wallets.reduce(
    (sum, item) => sum + Number(item.current_balance || 0),
    0
  );

  const savingsAssets = savingsGoals.reduce(
    (sum, item) => sum + Number(item.current_amount || 0),
    0
  );

  const manualAssetsTotal = manualAssets
    .filter((item) => item.is_active)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const debtLiabilities = debts.reduce(
    (sum, item) => sum + Number(item.remaining_amount || 0),
    0
  );

  const manualLiabilitiesTotal = manualLiabilities
    .filter((item) => item.is_active)
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalAssets = walletAssets + savingsAssets + manualAssetsTotal;
  const totalLiabilities = debtLiabilities + manualLiabilitiesTotal;
  const netWorth = totalAssets - totalLiabilities;

  const summary: NetWorthSummary = {
    walletAssets,
    savingsAssets,
    manualAssets: manualAssetsTotal,
    debtLiabilities,
    manualLiabilities: manualLiabilitiesTotal,
    totalAssets,
    totalLiabilities,
    netWorth,
  };

  return {
    wallets,
    savingsGoals,
    debts,
    manualAssets,
    manualLiabilities,
    summary,
  };
}