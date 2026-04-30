"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/formatCurrency";
import { processMonthlyBudgets } from "@/lib/processMonthlyBudgets";
import {
  CategoryRecord,
  ensureDefaultCategories,
  fetchUserCategories,
} from "@/lib/categoryHelpers";

type Budget = {
  id: string;
  budget_name: string;
  category: string;
  category_id?: string | null;
  budget_amount?: number | null;
  amount_limit?: number | null;
  spent_amount?: number | null;
  currency?: string | null;
  period_month?: number | null;
  period_year?: number | null;
  period_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type BudgetHistory = {
  id: string;
  budget_id: string;
  budget_name: string;
  category: string;
  budget_amount?: number | null;
  amount_limit?: number | null;
  actual_spent?: number | null;
  currency?: string | null;
  period_month?: number | null;
  period_year?: number | null;
  period_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
};

type ExpenseTransaction = {
  id: string;
  title: string;
  category: string;
  amount: number | null;
  currency: string | null;
  transaction_date: string;
  note: string | null;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

function getMonthLabel(month: number, year: number) {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function getBudgetLimitValue(item: {
  budget_amount?: number | null;
  amount_limit?: number | null;
}) {
  return Number(item.budget_amount ?? item.amount_limit ?? 0);
}

function getMonthStartDate(year: number, month: number) {
  return new Date(year, month - 1, 1).toISOString().split("T")[0];
}

function getMonthEndDate(year: number, month: number) {
  return new Date(year, month, 0).toISOString().split("T")[0];
}

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [budgetHistory, setBudgetHistory] = useState<BudgetHistory[]>([]);
  const [currentMonthExpenses, setCurrentMonthExpenses] = useState<ExpenseTransaction[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [budgetName, setBudgetName] = useState("");
  const [category, setCategory] = useState("Food");
  const [budgetAmount, setBudgetAmount] = useState("");
  const [currency, setCurrency] = useState("MYR");

  const [editBudgetName, setEditBudgetName] = useState("");
  const [editCategory, setEditCategory] = useState("Food");
  const [editBudgetAmount, setEditBudgetAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState("MYR");

  async function fetchBudgets() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      await ensureDefaultCategories(user.id);
      await processMonthlyBudgets(user.id);
    } catch (error) {
      console.error("Budget monthly processing error:", error);
    }

    const [
      { data: budgetsData, error: budgetsError },
      { data: historyData, error: historyError },
      { data: expenseData, error: expenseError },
      expenseCategoryRows,
    ] = await Promise.all([
      supabase
        .from("budgets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("budget_history")
        .select("*")
        .eq("user_id", user.id)
        .order("period_year", { ascending: false })
        .order("period_month", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("transactions")
        .select("id, title, category, amount, currency, transaction_date, note")
        .eq("user_id", user.id)
        .eq("transaction_type", "expense")
        .neq("category", "Transfer")
        .order("transaction_date", { ascending: false }),
      fetchUserCategories(user.id, "expense"),
    ]);

    if (budgetsError || historyError || expenseError) {
      console.error("Budgets page query error:", {
        budgetsError,
        historyError,
        expenseError,
      });
      setLoading(false);
      return;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const expenseRows = (expenseData ?? []) as ExpenseTransaction[];

    const currentMonthExpenseRows = expenseRows.filter((item) => {
      const txDate = new Date(item.transaction_date);
      return (
        txDate.getMonth() + 1 === currentMonth &&
        txDate.getFullYear() === currentYear
      );
    });

    const computedBudgets = ((budgetsData ?? []) as Budget[]).map((budget) => {
      const spentAmount = currentMonthExpenseRows
        .filter((item) => item.category === budget.category)
        .reduce((sum, item) => sum + Number(item.amount || 0), 0);

      return {
        ...budget,
        spent_amount: spentAmount,
      };
    });

    setBudgets(computedBudgets);
    setBudgetHistory((historyData ?? []) as BudgetHistory[]);
    setCurrentMonthExpenses(currentMonthExpenseRows);
    setExpenseCategories(expenseCategoryRows);

    if (expenseCategoryRows.length > 0 && !category) {
      setCategory(expenseCategoryRows[0].name);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchBudgets();
  }, []);

  async function handleAddBudget(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not found.");
      }

      if (!budgetName.trim()) {
        throw new Error("Please enter a budget name.");
      }

      if (!budgetAmount || Number(budgetAmount) <= 0) {
        throw new Error("Please enter a valid budget amount.");
      }

      const selectedCategory = expenseCategories.find((item) => item.name === category);

      if (!selectedCategory) {
        throw new Error("Please select a valid expense category.");
      }

      const now = new Date();
      const periodMonth = now.getMonth() + 1;
      const periodYear = now.getFullYear();
      const numericBudgetAmount = Number(budgetAmount);

      const { error } = await supabase.from("budgets").insert({
        user_id: user.id,
        budget_name: budgetName.trim(),
        category,
        category_id: selectedCategory.id,
        budget_amount: numericBudgetAmount,
        amount_limit: numericBudgetAmount,
        spent_amount: 0,
        currency,
        period_month: periodMonth,
        period_year: periodYear,
        period_type: "monthly",
        start_date: getMonthStartDate(periodYear, periodMonth),
        end_date: getMonthEndDate(periodYear, periodMonth),
      });

      if (error) {
        throw error;
      }

      setBudgetName("");
      setCategory(expenseCategories[0]?.name || "Food");
      setBudgetAmount("");
      setCurrency("MYR");

      await fetchBudgets();
      alert("Budget added successfully.");
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSaving(false);
  }

  function handleStartEdit(budget: Budget) {
    setEditingId(budget.id);
    setEditBudgetName(budget.budget_name);
    setEditCategory(budget.category);
    setEditBudgetAmount(String(getBudgetLimitValue(budget)));
    setEditCurrency(budget.currency || "MYR");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditBudgetName("");
    setEditCategory(expenseCategories[0]?.name || "Food");
    setEditBudgetAmount("");
    setEditCurrency("MYR");
  }

  async function handleUpdateBudget(e: React.FormEvent) {
    e.preventDefault();

    if (!editingId) return;

    try {
      if (!editBudgetName.trim()) {
        throw new Error("Please enter a budget name.");
      }

      if (!editBudgetAmount || Number(editBudgetAmount) <= 0) {
        throw new Error("Please enter a valid budget amount.");
      }

      const selectedCategory = expenseCategories.find((item) => item.name === editCategory);

      if (!selectedCategory) {
        throw new Error("Please select a valid expense category.");
      }

      const existingBudget = budgets.find((item) => item.id === editingId);
      const periodMonth = Number(existingBudget?.period_month || new Date().getMonth() + 1);
      const periodYear = Number(existingBudget?.period_year || new Date().getFullYear());

      setSavingEdit(true);
      const numericBudgetAmount = Number(editBudgetAmount);

      const { error } = await supabase
        .from("budgets")
        .update({
          budget_name: editBudgetName.trim(),
          category: editCategory,
          category_id: selectedCategory.id,
          budget_amount: numericBudgetAmount,
          amount_limit: numericBudgetAmount,
          currency: editCurrency,
          period_type: "monthly",
          start_date: getMonthStartDate(periodYear, periodMonth),
          end_date: getMonthEndDate(periodYear, periodMonth),
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) {
        throw error;
      }

      await fetchBudgets();
      alert("Budget updated successfully.");
      handleCancelEdit();
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSavingEdit(false);
  }

  async function handleDeleteBudget(budgetId: string) {
    const confirmed = window.confirm("Delete this budget?");
    if (!confirmed) return;

    setDeletingId(budgetId);

    const { error } = await supabase.from("budgets").delete().eq("id", budgetId);

    setDeletingId(null);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    await fetchBudgets();
    alert("Budget deleted successfully.");
  }

  const totalBudgeted = useMemo(
    () => budgets.reduce((sum, budget) => sum + getBudgetLimitValue(budget), 0),
    [budgets]
  );

  const totalSpent = useMemo(
    () => budgets.reduce((sum, budget) => sum + Number(budget.spent_amount || 0), 0),
    [budgets]
  );

  function getBudgetTransactions(categoryName: string) {
    return currentMonthExpenses.filter((item) => item.category === categoryName);
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
            Track your current month budgets, see matching transactions, and review past budget performance.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Current Total Budgeted</p>
            <h2 className="mt-2 text-2xl font-semibold">
              {formatCurrency(totalBudgeted, "MYR")}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Current Total Spent</p>
            <h2 className="mt-2 text-2xl font-semibold text-red-400">
              {formatCurrency(totalSpent, "MYR")}
            </h2>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-2xl font-semibold">Add Budget</h2>

          <form className="space-y-4" onSubmit={handleAddBudget}>
            <div>
              <label className="mb-2 block text-sm">Budget Name</label>
              <input
                type="text"
                value={budgetName}
                onChange={(e) => setBudgetName(e.target.value)}
                placeholder="Enter budget name"
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
                {expenseCategories.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Budget Amount</label>
              <input
                type="number"
                value={budgetAmount}
                onChange={(e) => setBudgetAmount(e.target.value)}
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

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Budget"}
            </button>
          </form>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Current Month Budgets</h2>

          {budgets.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
              No budgets yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {budgets.map((budget) => {
                const budgeted = getBudgetLimitValue(budget);
                const spent = Number(budget.spent_amount || 0);
                const remaining = budgeted - spent;
                const progress = budgeted > 0 ? (spent / budgeted) * 100 : 0;
                const progressWidth = Math.min(progress, 100);
                const budgetTransactions = getBudgetTransactions(budget.category);

                return (
                  <div
                    key={budget.id}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                  >
                    <p className="text-sm text-zinc-400">{budget.budget_name}</p>
                    <h3 className="mt-2 text-xl font-semibold">{budget.category}</h3>
                    <p className="mt-3 text-sm text-zinc-500">
                      Period:{" "}
                      {getMonthLabel(
                        Number(budget.period_month || new Date().getMonth() + 1),
                        Number(budget.period_year || new Date().getFullYear())
                      )}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      Budgeted: {formatCurrency(budgeted, budget.currency || "MYR")}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      Spent: {formatCurrency(spent, budget.currency || "MYR")}
                    </p>
                    <p className="mt-2 text-sm text-zinc-500">
                      Remaining: {formatCurrency(remaining, budget.currency || "MYR")}
                    </p>

                    <div className="mt-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-zinc-400">Usage</span>
                        <span className={progress > 100 ? "text-red-400" : "text-green-400"}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>

                      <div className="h-3 w-full rounded-full bg-zinc-800">
                        <div
                          className={`h-3 rounded-full ${
                            progress > 100 ? "bg-red-500" : "bg-green-500"
                          }`}
                          style={{ width: `${progressWidth}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-6">
                      <h4 className="mb-3 text-lg font-semibold">Matching Transactions</h4>

                      {budgetTransactions.length === 0 ? (
                        <p className="text-sm text-zinc-400">
                          No matching transactions this month.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {budgetTransactions.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-medium">{item.title}</p>
                                  <p className="mt-1 text-sm text-zinc-500">
                                    {item.transaction_date}
                                  </p>
                                </div>
                                <p className="font-medium text-red-400">
                                  {formatCurrency(
                                    Number(item.amount || 0),
                                    item.currency || budget.currency || "MYR"
                                  )}
                                </p>
                              </div>

                              {item.note ? (
                                <p className="mt-2 text-sm text-zinc-500">{item.note}</p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex gap-4">
                      <button
                        onClick={() => handleStartEdit(budget)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteBudget(budget.id)}
                        disabled={deletingId === budget.id}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        {deletingId === budget.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-2xl font-semibold">Budget History</h2>

          {budgetHistory.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
              No budget history yet.
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
              <div className="grid grid-cols-6 gap-4 border-b border-zinc-800 px-6 py-4 text-sm font-medium text-zinc-400">
                <div>Budget</div>
                <div>Category</div>
                <div>Period</div>
                <div className="text-right">Budgeted</div>
                <div className="text-right">Actual</div>
                <div className="text-right">Variance</div>
              </div>

              {budgetHistory.map((item) => {
                const budgeted = getBudgetLimitValue(item);
                const variance = budgeted - Number(item.actual_spent || 0);

                return (
                  <div
                    key={item.id}
                    className="grid grid-cols-6 gap-4 border-b border-zinc-900 px-6 py-4 text-sm"
                  >
                    <div>{item.budget_name}</div>
                    <div>{item.category}</div>
                    <div>
                      {item.period_month && item.period_year
                        ? getMonthLabel(item.period_month, item.period_year)
                        : "-"}
                    </div>
                    <div className="text-right">
                      {formatCurrency(budgeted, item.currency || "MYR")}
                    </div>
                    <div className="text-right">
                      {formatCurrency(Number(item.actual_spent || 0), item.currency || "MYR")}
                    </div>
                    <div
                      className={`text-right font-medium ${
                        variance >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {formatCurrency(variance, item.currency || "MYR")}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {editingId && (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Edit Budget</h2>

            <form className="space-y-4" onSubmit={handleUpdateBudget}>
              <div>
                <label className="mb-2 block text-sm">Budget Name</label>
                <input
                  type="text"
                  value={editBudgetName}
                  onChange={(e) => setEditBudgetName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  {expenseCategories.map((item) => (
                    <option key={item.id} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">Budget Amount</label>
                <input
                  type="number"
                  value={editBudgetAmount}
                  onChange={(e) => setEditBudgetAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Currency</label>
                <select
                  value={editCurrency}
                  onChange={(e) => setEditCurrency(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option>MYR</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-full border border-zinc-700 px-6 py-3 font-semibold text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}