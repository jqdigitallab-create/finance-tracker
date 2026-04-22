"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recalculateWalletBalance } from "@/lib/recalculateWalletBalance";

type Profile = {
  full_name: string | null;
  default_currency: string | null;
  premium_status: string | null;
};

type Wallet = {
  current_balance: number | null;
};

type Transaction = {
  transaction_type: string;
  amount: number | null;
};

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  const [totalBalance, setTotalBalance] = useState(0);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [walletCount, setWalletCount] = useState(0);
  const [budgetCount, setBudgetCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);
  const [debtCount, setDebtCount] = useState(0);
  const [billCount, setBillCount] = useState(0);

  useEffect(() => {
    async function loadDashboard() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      if (user.email) {
        setUserEmail(user.email);
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, default_currency, premium_status")
        .eq("id", user.id)
        .single();

      if (profileData) {
        setProfile(profileData);
      }

      const { data: walletList } = await supabase
        .from("wallets")
        .select("id")
        .eq("user_id", user.id);

      if (walletList) {
        setWalletCount(walletList.length);

        for (const wallet of walletList) {
          try {
            await recalculateWalletBalance(wallet.id);
          } catch (error) {
            console.error("Dashboard wallet recalculate error:", error);
          }
        }
      }

      const { data: walletData } = await supabase
        .from("wallets")
        .select("current_balance")
        .eq("user_id", user.id);

      if (walletData) {
        const balance = (walletData as Wallet[]).reduce(
          (sum, wallet) => sum + Number(wallet.current_balance || 0),
          0
        );
        setTotalBalance(balance);
      }

      const { data: transactionData } = await supabase
        .from("transactions")
        .select("transaction_type, amount")
        .eq("user_id", user.id);

      if (transactionData) {
        const income = (transactionData as Transaction[])
          .filter((item) => item.transaction_type === "income")
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        const expenses = (transactionData as Transaction[])
          .filter((item) => item.transaction_type === "expense")
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        setTotalIncome(income);
        setTotalExpenses(expenses);
      }

      const { count: budgetsCount } = await supabase
        .from("budgets")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setBudgetCount(budgetsCount || 0);

      const { count: goalsCount } = await supabase
        .from("savings_goals")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setGoalCount(goalsCount || 0);

      const { count: debtsCount } = await supabase
        .from("debts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setDebtCount(debtsCount || 0);

      const { count: billsCount } = await supabase
        .from("recurring_bills")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setBillCount(billsCount || 0);
    }

    loadDashboard();
  }, []);

  const displayCurrency = profile?.default_currency || "MYR";

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="mt-2 text-zinc-400">
            Welcome back. Here is your financial overview.
          </p>

          <div className="mt-4 space-y-1 text-sm text-zinc-500">
            <p>Logged in as: {userEmail || "Unknown user"}</p>
            <p>Full name: {profile?.full_name || "No name set"}</p>
            <p>Currency: {profile?.default_currency || "Not set"}</p>
            <p>Plan: {profile?.premium_status || "Unknown"}</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Balance</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {displayCurrency} {totalBalance.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Income</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {displayCurrency} {totalIncome.toFixed(2)}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Expenses</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {displayCurrency} {totalExpenses.toFixed(2)}
            </h2>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Wallets</p>
            <h3 className="mt-2 text-2xl font-semibold">{walletCount}</h3>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Budgets</p>
            <h3 className="mt-2 text-2xl font-semibold">{budgetCount}</h3>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Savings Goals</p>
            <h3 className="mt-2 text-2xl font-semibold">{goalCount}</h3>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Debts</p>
            <h3 className="mt-2 text-2xl font-semibold">{debtCount}</h3>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Recurring Bills</p>
            <h3 className="mt-2 text-2xl font-semibold">{billCount}</h3>
          </div>
        </div>
      </div>
    </div>
  );
}