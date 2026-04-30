"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recalculateWalletBalance } from "@/lib/recalculateWalletBalance";
import { formatCurrency } from "@/lib/formatCurrency";
import { getSafeToSpendSummary } from "@/lib/safeToSpendHelpers";
import {
  getSavingsGoalAnalytics,
  getDebtAnalytics,
  SavingsGoalAnalytics,
  DebtAnalytics,
} from "@/lib/goalDebtAnalytics";
import {
  getBillsDueWithinDays,
  getMonthlyRecurringCommitment,
  getOverdueBills,
  getRecurringBillAnalytics,
  RecurringBillAnalytics,
} from "@/lib/recurringBillAnalytics";

type Profile = {
  full_name: string | null;
  default_currency: string | null;
  premium_status: string | null;
};

type Transaction = {
  transaction_type: string;
  amount: number | null;
  transaction_date?: string;
};

type RecentTransaction = {
  id: string;
  title: string;
  transaction_type: string;
  category: string | null;
  subcategory: string | null;
  amount: number;
  currency: string | null;
  transaction_date: string;
};

type RecurringBill = {
  id: string;
  bill_name: string;
  amount: number | null;
  currency: string | null;
  frequency: "weekly" | "monthly" | "quarterly" | "bi-yearly" | "yearly";
  next_due_date: string | null;
  last_paid_date: string | null;
  category: string | null;
  is_active: boolean | null;
};

type BillStatus = "Overdue" | "Due Soon" | "Upcoming" | "No Due Date";

type SavingsGoalRow = {
  id: string;
  goal_name: string;
  target_amount: number | null;
  current_amount: number | null;
  target_date: string | null;
  currency: string | null;
};

type DebtRow = {
  id: string;
  debt_name: string;
  total_amount: number | null;
  remaining_amount: number | null;
  monthly_payment: number | null;
  due_date: string | null;
  last_paid_date: string | null;
};

function getBillStatus(nextDueDate: string | null): BillStatus {
  if (!nextDueDate) return "No Due Date";

  const today = new Date();
  const dueDate = new Date(nextDueDate);

  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  const diffMs = dueDate.getTime() - today.getTime();
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  if (diffDays < 0) return "Overdue";
  if (diffDays <= 7) return "Due Soon";
  return "Upcoming";
}

export default function DashboardPage() {
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);

  const [totalBalance, setTotalBalance] = useState(0);
  const [savedAmount, setSavedAmount] = useState(0);
  const [safeToSpend, setSafeToSpend] = useState(0);

  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const [monthIncome, setMonthIncome] = useState(0);
  const [monthExpenses, setMonthExpenses] = useState(0);
  const [monthCashflow, setMonthCashflow] = useState(0);

  const [walletCount, setWalletCount] = useState(0);
  const [budgetCount, setBudgetCount] = useState(0);
  const [goalCount, setGoalCount] = useState(0);
  const [debtCount, setDebtCount] = useState(0);
  const [billCount, setBillCount] = useState(0);

  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [upcomingBills, setUpcomingBills] = useState<RecurringBill[]>([]);
  const [topGoal, setTopGoal] = useState<SavingsGoalAnalytics | null>(null);
  const [topDebt, setTopDebt] = useState<DebtAnalytics | null>(null);
  const [topBill, setTopBill] = useState<RecurringBillAnalytics | null>(null);
  const [monthlyRecurringCommitment, setMonthlyRecurringCommitment] = useState(0);
  const [overdueBillTotal, setOverdueBillTotal] = useState(0);
  const [due7DayTotal, setDue7DayTotal] = useState(0);

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

      try {
        const summary = await getSafeToSpendSummary(user.id);
        setSafeToSpend(summary.safeToSpend);
        setSavedAmount(summary.savedAmount);
        setTotalBalance(summary.totalBalance);
      } catch (error) {
        console.error("Safe-to-spend summary error:", error);
      }

      const { data: transactionData } = await supabase
        .from("transactions")
        .select("transaction_type, amount, transaction_date")
        .eq("user_id", user.id);

      if (transactionData) {
        const allTransactions = transactionData as Transaction[];

        const income = allTransactions
          .filter((item) => item.transaction_type === "income")
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        const expenses = allTransactions
          .filter((item) => item.transaction_type === "expense")
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        setTotalIncome(income);
        setTotalExpenses(expenses);

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        const monthlyTransactions = allTransactions.filter((item) => {
          if (!item.transaction_date) return false;
          const txDate = new Date(item.transaction_date);
          return (
            txDate.getFullYear() === currentYear &&
            txDate.getMonth() === currentMonth
          );
        });

        const monthlyIncome = monthlyTransactions
          .filter((item) => item.transaction_type === "income")
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        const monthlyExpenses = monthlyTransactions
          .filter((item) => item.transaction_type === "expense")
          .reduce((sum, item) => sum + Number(item.amount || 0), 0);

        setMonthIncome(monthlyIncome);
        setMonthExpenses(monthlyExpenses);
        setMonthCashflow(monthlyIncome - monthlyExpenses);
      }

      const { data: recentTransactionData } = await supabase
        .from("transactions")
        .select(
          "id, title, transaction_type, category, subcategory, amount, currency, transaction_date"
        )
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false })
        .limit(5);

      if (recentTransactionData) {
        setRecentTransactions(
          recentTransactionData.map((item) => ({
            ...item,
            amount: Number(item.amount || 0),
          })) as RecentTransaction[]
        );
      }

      const { data: billData } = await supabase
        .from("recurring_bills")
        .select(
          "id, bill_name, amount, currency, frequency, next_due_date, last_paid_date, category, is_active"
        )
        .eq("user_id", user.id);

      if (billData) {
        const rawBills = billData as RecurringBill[];
        const sortedBills = [...rawBills].sort((a, b) => {
          if (!a.next_due_date) return 1;
          if (!b.next_due_date) return -1;
          return a.next_due_date.localeCompare(b.next_due_date);
        });

        setUpcomingBills(sortedBills.slice(0, 5));

        const analytics = getRecurringBillAnalytics(rawBills);
        setTopBill(analytics[0] || null);
        setMonthlyRecurringCommitment(getMonthlyRecurringCommitment(analytics));
        setOverdueBillTotal(
          getOverdueBills(analytics).reduce((sum, item) => sum + item.amount, 0)
        );
        setDue7DayTotal(
          getBillsDueWithinDays(analytics, 7).reduce((sum, item) => sum + item.amount, 0)
        );
      }

      const { data: savingsGoalsData } = await supabase
        .from("savings_goals")
        .select("id, goal_name, target_amount, current_amount, target_date, currency")
        .eq("user_id", user.id);

      if (savingsGoalsData) {
        const goalAnalytics = getSavingsGoalAnalytics(
          savingsGoalsData as SavingsGoalRow[]
        );
        setTopGoal(goalAnalytics[0] || null);
      }

      const { data: debtsData } = await supabase
        .from("debts")
        .select("id, debt_name, total_amount, remaining_amount, monthly_payment, due_date, last_paid_date")
        .eq("user_id", user.id);

      if (debtsData) {
        const debtAnalytics = getDebtAnalytics(debtsData as DebtRow[]);
        setTopDebt(debtAnalytics[0] || null);
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

        <div className="mb-8 flex flex-wrap gap-4">
          <Link
            href="/net-worth"
            className="inline-block rounded-full bg-white px-5 py-3 font-semibold text-black"
          >
            View Net Worth
          </Link>

          <Link
            href="/transactions"
            className="inline-block rounded-full border border-zinc-700 px-5 py-3 font-semibold text-white"
          >
            View Transactions
          </Link>
        </div>

        <div className="mb-4 rounded-2xl border border-blue-900 bg-blue-950/30 p-5">
          <p className="text-sm text-blue-300">Safe-to-Spend Logic</p>
          <p className="mt-2 text-sm text-zinc-300">
            Safe to Spend is the money currently available in your wallets.
            Saved Amount is tracked separately in your savings goals.
            Total Balance combines both.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Balance</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalBalance, displayCurrency)}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Saved Amount</p>
            <h2 className="mt-2 text-2xl font-semibold text-blue-400">
              {formatCurrency(savedAmount, displayCurrency)}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Safe to Spend</p>
            <h2 className="mt-2 text-2xl font-semibold text-green-400">
              {formatCurrency(safeToSpend, displayCurrency)}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Income</p>
            <h2 className="mt-2 text-2xl font-semibold text-green-400">
              {formatCurrency(totalIncome, displayCurrency)}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Expenses</p>
            <h2 className="mt-2 text-2xl font-semibold text-red-400">
              {formatCurrency(totalExpenses, displayCurrency)}
            </h2>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Recurring Monthly Commitment</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {formatCurrency(monthlyRecurringCommitment, displayCurrency)}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Overdue Bills Total</p>
            <h2 className="mt-2 text-2xl font-semibold text-red-400">
              {formatCurrency(overdueBillTotal, displayCurrency)}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Bills Due in 7 Days</p>
            <h2 className="mt-2 text-2xl font-semibold text-yellow-400">
              {formatCurrency(due7DayTotal, displayCurrency)}
            </h2>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Top Savings Goal Focus</p>
            {topGoal ? (
              <>
                <h2 className="mt-2 text-xl font-semibold">{topGoal.goal_name}</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Remaining: {formatCurrency(topGoal.remaining_amount, topGoal.currency)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Monthly Needed:{" "}
                  {formatCurrency(Number(topGoal.monthly_needed || 0), topGoal.currency)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Target Date: {topGoal.target_date || "Not set"}
                </p>
              </>
            ) : (
              <p className="mt-3 text-zinc-400">No savings goals yet.</p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Top Debt Focus</p>
            {topDebt ? (
              <>
                <h2 className="mt-2 text-xl font-semibold">{topDebt.debt_name}</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Remaining: {formatCurrency(topDebt.remaining_amount, "MYR")}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Payoff Months:{" "}
                  {topDebt.estimated_months_to_payoff === null
                    ? "Unknown"
                    : topDebt.estimated_months_to_payoff}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Next Due Date: {topDebt.due_date || "Not set"}
                </p>
              </>
            ) : (
              <p className="mt-3 text-zinc-400">No debts yet.</p>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Top Bill Focus</p>
            {topBill ? (
              <>
                <h2 className="mt-2 text-xl font-semibold">{topBill.bill_name}</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  Amount: {formatCurrency(topBill.amount, topBill.currency)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">Status: {topBill.status}</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Next Due Date: {topBill.next_due_date || "Not set"}
                </p>
              </>
            ) : (
              <p className="mt-3 text-zinc-400">No recurring bills yet.</p>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">This Month Income</p>
            <h2 className="mt-2 text-2xl font-semibold text-green-400">
              {formatCurrency(monthIncome, displayCurrency)}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">This Month Expenses</p>
            <h2 className="mt-2 text-2xl font-semibold text-red-400">
              {formatCurrency(monthExpenses, displayCurrency)}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">This Month Cashflow</p>
            <h2
              className={`mt-2 text-2xl font-semibold ${
                monthCashflow >= 0 ? "text-green-400" : "text-red-400"
              }`}
            >
              {formatCurrency(monthCashflow, displayCurrency)}
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

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold">Recent Transactions</h2>

            {recentTransactions.length === 0 ? (
              <p className="mt-4 text-zinc-400">No recent transactions yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between border-b border-zinc-800 pb-4 last:border-b-0 last:pb-0"
                  >
                    <div>
                      <p className="font-medium">{transaction.title}</p>
                      <p className="text-sm text-zinc-500">
                        {transaction.category}
                        {transaction.subcategory ? ` • ${transaction.subcategory}` : ""}
                        {" • "}
                        {transaction.transaction_date}
                      </p>
                    </div>

                    <p
                      className={
                        transaction.transaction_type === "income"
                          ? "font-medium text-green-400"
                          : "font-medium text-red-400"
                      }
                    >
                      {formatCurrency(transaction.amount, transaction.currency || "MYR")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="text-2xl font-semibold">Upcoming Bills</h2>

            {upcomingBills.length === 0 ? (
              <p className="mt-4 text-zinc-400">No recurring bills yet.</p>
            ) : (
              <div className="mt-4 space-y-4">
                {upcomingBills.map((bill) => {
                  const status = getBillStatus(bill.next_due_date);

                  return (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between border-b border-zinc-800 pb-4 last:border-b-0 last:pb-0"
                    >
                      <div>
                        <p className="font-medium">{bill.bill_name}</p>
                        <p className="text-sm text-zinc-500">
                          {bill.next_due_date || "No due date"} • {bill.frequency}
                        </p>
                        <p
                          className={`mt-1 text-sm font-medium ${
                            status === "Overdue"
                              ? "text-red-400"
                              : status === "Due Soon"
                              ? "text-yellow-400"
                              : status === "Upcoming"
                              ? "text-green-400"
                              : "text-zinc-400"
                          }`}
                        >
                          {status}
                        </p>
                      </div>

                      <p className="font-medium">
                        {formatCurrency(Number(bill.amount || 0), bill.currency || "MYR")}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}