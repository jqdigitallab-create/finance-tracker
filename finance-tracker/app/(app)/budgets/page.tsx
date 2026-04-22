"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Budget = {
  id: string;
  category: string;
  amount_limit: number;
  currency: string | null;
  period_type: "weekly" | "monthly";
  start_date: string;
  end_date: string;
};

type Transaction = {
  category: string;
  amount: number | null;
  transaction_type: string;
  transaction_date: string;
};

type BudgetWithSpent = Budget & {
  spent: number;
  status: "On Track" | "Over Budget";
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<BudgetWithSpent[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [category, setCategory] = useState("Food");
  const [amountLimit, setAmountLimit] = useState("");
  const [currency, setCurrency] = useState("MYR");
  const [periodType, setPeriodType] = useState<"weekly" | "monthly">("monthly");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function fetchBudgets() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data: budgetData, error: budgetError } = await supabase
      .from("budgets")
      .select("id, category, amount_limit, currency, period_type, start_date, end_date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (budgetError) {
      console.error("Budget fetch error:", budgetError);
      setLoading(false);
      return;
    }

    const { data: transactionData, error: transactionError } = await supabase
      .from("transactions")
      .select("category, amount, transaction_type, transaction_date")
      .eq("user_id", user.id)
      .eq("transaction_type", "expense");

    if (transactionError) {
      console.error("Transaction fetch error:", transactionError);
      setLoading(false);
      return;
    }

    const budgetRows = (budgetData ?? []) as Budget[];
    const transactionRows = (transactionData ?? []) as Transaction[];

    const budgetsWithSpent: BudgetWithSpent[] = budgetRows.map((budget) => {
      const spent = transactionRows
        .filter((transaction) => {
          return (
            transaction.category === budget.category &&
            transaction.transaction_date >= budget.start_date &&
            transaction.transaction_date <= budget.end_date
          );
        })
        .reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

      return {
        ...budget,
        spent,
        status: spent > Number(budget.amount_limit) ? "Over Budget" : "On Track",
      };
    });

    setBudgets(budgetsWithSpent);
    setLoading(false);
  }

  useEffect(() => {
    fetchBudgets();
  }, []);

  async function handleAddBudget(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSaving(false);
      alert("User not found.");
      return;
    }

    if (!amountLimit || Number(amountLimit) <= 0) {
      setSaving(false);
      alert("Please enter a valid budget amount.");
      return;
    }

    if (!startDate || !endDate) {
      setSaving(false);
      alert("Please select a start date and end date.");
      return;
    }

    const { error } = await supabase.from("budgets").insert({
      user_id: user.id,
      category,
      amount_limit: Number(amountLimit),
      currency,
      period_type: periodType,
      start_date: startDate,
      end_date: endDate,
    });

    setSaving(false);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    alert("Budget added successfully.");

    setCategory("Food");
    setAmountLimit("");
    setCurrency("MYR");
    setPeriodType("monthly");
    setStartDate("");
    setEndDate("");

    await fetchBudgets();
  }

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl text-zinc-400">Loading budgets...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Budgets</h1>
          <p className="mt-2 text-zinc-400">
            Set and monitor spending limits across your categories.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-2xl font-semibold">Add Budget</h2>

          <form className="space-y-4" onSubmit={handleAddBudget}>
            <div>
              <label className="mb-2 block text-sm">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option>Food</option>
                <option>Transport</option>
                <option>Utilities</option>
                <option>Entertainment</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Amount Limit</label>
              <input
                type="number"
                value={amountLimit}
                onChange={(e) => setAmountLimit(e.target.value)}
                placeholder="Enter budget amount"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option>MYR</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Period Type</label>
              <select
                value={periodType}
                onChange={(e) => setPeriodType(e.target.value as "weekly" | "monthly")}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Adding Budget..." : "Add Budget"}
            </button>
          </form>
        </div>

        {budgets.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No budgets yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {budgets.map((budget) => (
              <div
                key={budget.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <p className="text-sm text-zinc-400">{budget.category}</p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {(budget.currency || "MYR")} {Number(budget.amount_limit).toFixed(2)}
                </h2>
                <p className="mt-3 text-sm text-zinc-500">
                  Spent: {(budget.currency || "MYR")} {budget.spent.toFixed(2)}
                </p>
                <p
                  className={`mt-4 text-sm font-medium ${
                    budget.status === "Over Budget" ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {budget.status}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  {budget.start_date} to {budget.end_date}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}