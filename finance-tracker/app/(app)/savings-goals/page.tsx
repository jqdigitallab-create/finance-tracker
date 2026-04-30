"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  getSavingsGoalAnalytics,
  SavingsGoalAnalytics,
} from "@/lib/goalDebtAnalytics";

type SavingsGoal = {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number | null;
  currency: string | null;
  target_date: string | null;
};

type Wallet = {
  id: string;
  wallet_name: string;
};

type Contribution = {
  id: string;
  savings_goal_id: string;
  wallet_id: string;
  linked_transaction_id: string | null;
  amount: number;
  contribution_date: string;
  note: string | null;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

function getGoalStatus(goal: SavingsGoalAnalytics) {
  if (goal.remaining_amount <= 0) return "Completed";
  if (goal.days_left !== null && goal.days_left < 0) return "Overdue";
  if (goal.days_left !== null && goal.days_left <= 30) return "Urgent";
  if (goal.days_left !== null && goal.days_left <= 90) return "Watch";
  return "On Track";
}

function getGoalStatusClass(status: string) {
  if (status === "Completed") return "text-green-400";
  if (status === "Overdue") return "text-red-400";
  if (status === "Urgent") return "text-yellow-400";
  if (status === "Watch") return "text-orange-400";
  return "text-blue-400";
}

export default function SavingsGoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [goalAnalytics, setGoalAnalytics] = useState<SavingsGoalAnalytics[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [currency, setCurrency] = useState("MYR");
  const [targetDate, setTargetDate] = useState("");

  const [editGoalName, setEditGoalName] = useState("");
  const [editTargetAmount, setEditTargetAmount] = useState("");
  const [editCurrentAmount, setEditCurrentAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState("MYR");
  const [editTargetDate, setEditTargetDate] = useState("");

  async function fetchGoals() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const [
      { data: goalsData, error: goalsError },
      { data: walletsData, error: walletsError },
      { data: contributionsData, error: contributionsError },
    ] = await Promise.all([
      supabase
        .from("savings_goals")
        .select("id, goal_name, target_amount, current_amount, currency, target_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("wallets")
        .select("id, wallet_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("savings_goal_contributions")
        .select(
          "id, savings_goal_id, wallet_id, linked_transaction_id, amount, contribution_date, note"
        )
        .eq("user_id", user.id)
        .order("contribution_date", { ascending: false }),
    ]);

    if (goalsError || walletsError || contributionsError) {
      console.error(goalsError || walletsError || contributionsError);
      setLoading(false);
      return;
    }

    const goalRows = (goalsData ?? []) as SavingsGoal[];

    setGoals(goalRows);
    setWallets((walletsData ?? []) as Wallet[]);
    setContributions((contributionsData ?? []) as Contribution[]);
    setGoalAnalytics(getSavingsGoalAnalytics(goalRows));
    setLoading(false);
  }

  useEffect(() => {
    fetchGoals();
  }, []);

  async function handleAddGoal(e: React.FormEvent) {
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

    if (!goalName.trim()) {
      setSaving(false);
      alert("Please enter a goal name.");
      return;
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      setSaving(false);
      alert("Please enter a valid target amount.");
      return;
    }

    const { error } = await supabase.from("savings_goals").insert({
      user_id: user.id,
      goal_name: goalName.trim(),
      target_amount: Number(targetAmount),
      current_amount: Number(currentAmount || 0),
      currency,
      target_date: targetDate || null,
    });

    setSaving(false);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    alert("Savings goal added successfully.");

    setGoalName("");
    setTargetAmount("");
    setCurrentAmount("");
    setCurrency("MYR");
    setTargetDate("");

    await fetchGoals();
  }

  function handleStartEdit(goal: SavingsGoal) {
    setEditingId(goal.id);
    setEditGoalName(goal.goal_name);
    setEditTargetAmount(String(goal.target_amount));
    setEditCurrentAmount(String(goal.current_amount || 0));
    setEditCurrency(goal.currency || "MYR");
    setEditTargetDate(goal.target_date || "");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditGoalName("");
    setEditTargetAmount("");
    setEditCurrentAmount("");
    setEditCurrency("MYR");
    setEditTargetDate("");
  }

  async function handleUpdateGoal(e: React.FormEvent) {
    e.preventDefault();

    if (!editingId) return;

    if (!editGoalName.trim()) {
      alert("Please enter a goal name.");
      return;
    }

    if (!editTargetAmount || Number(editTargetAmount) <= 0) {
      alert("Please enter a valid target amount.");
      return;
    }

    setSavingEdit(true);

    const { error } = await supabase
      .from("savings_goals")
      .update({
        goal_name: editGoalName.trim(),
        target_amount: Number(editTargetAmount),
        current_amount: Number(editCurrentAmount || 0),
        currency: editCurrency,
        target_date: editTargetDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingId);

    setSavingEdit(false);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    await fetchGoals();
    alert("Savings goal updated successfully.");
    handleCancelEdit();
  }

  async function handleDeleteGoal(goalId: string) {
    const confirmed = window.confirm("Delete this savings goal?");
    if (!confirmed) return;

    setDeletingId(goalId);

    const { error } = await supabase
      .from("savings_goals")
      .delete()
      .eq("id", goalId);

    setDeletingId(null);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    await fetchGoals();
    alert("Savings goal deleted successfully.");
  }

  function getWalletName(walletId: string) {
    return wallets.find((wallet) => wallet.id === walletId)?.wallet_name || "Unknown Wallet";
  }

  const totalTarget = useMemo(
    () => goalAnalytics.reduce((sum, item) => sum + item.target_amount, 0),
    [goalAnalytics]
  );

  const totalSaved = useMemo(
    () => goalAnalytics.reduce((sum, item) => sum + item.current_amount, 0),
    [goalAnalytics]
  );

  const totalRemaining = useMemo(
    () => goalAnalytics.reduce((sum, item) => sum + item.remaining_amount, 0),
    [goalAnalytics]
  );

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl text-zinc-400">Loading savings goals...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Savings Goals</h1>
            <p className="mt-2 text-zinc-400">
              Track progress, required pace, and contribution history for every goal.
            </p>
          </div>

          <Link
            href="/add-transaction?action=saving"
            className="rounded-full bg-white px-5 py-3 font-semibold text-black"
          >
            Add Saving
          </Link>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Target</p>
            <h2 className="mt-2 text-2xl font-semibold">{formatCurrency(totalTarget, "MYR")}</h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Saved</p>
            <h2 className="mt-2 text-2xl font-semibold text-blue-400">
              {formatCurrency(totalSaved, "MYR")}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Remaining</p>
            <h2 className="mt-2 text-2xl font-semibold text-yellow-400">
              {formatCurrency(totalRemaining, "MYR")}
            </h2>
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-2xl font-semibold">Add Savings Goal</h2>

          <form className="space-y-4" onSubmit={handleAddGoal}>
            <div>
              <label className="mb-2 block text-sm">Goal Name</label>
              <input
                type="text"
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="Enter goal name"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Target Amount</label>
              <input
                type="number"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="Enter target amount"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Current Amount</label>
              <input
                type="number"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="Enter current saved amount"
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
              <label className="mb-2 block text-sm">Target Date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Adding Goal..." : "Add Savings Goal"}
            </button>
          </form>
        </div>

        {goalAnalytics.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No savings goals yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {goalAnalytics.map((goal) => {
              const progressWidth = Math.min(goal.progress_percent, 100);
              const currencyCode = goal.currency || "MYR";
              const goalContributions = contributions.filter(
                (item) => item.savings_goal_id === goal.id
              );
              const status = getGoalStatus(goal);

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-zinc-400">{goal.goal_name}</p>
                      <h2 className="mt-2 text-2xl font-semibold">
                        {formatCurrency(goal.target_amount, currencyCode)}
                      </h2>
                    </div>

                    <p className={`text-sm font-semibold ${getGoalStatusClass(status)}`}>
                      {status}
                    </p>
                  </div>

                  <p className="mt-3 text-sm text-zinc-500">
                    Saved: {formatCurrency(goal.current_amount, currencyCode)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Remaining: {formatCurrency(goal.remaining_amount, currencyCode)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Target Date: {goal.target_date || "Not set"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Days Left: {goal.days_left === null ? "Not set" : goal.days_left}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Monthly Needed:{" "}
                    {formatCurrency(Number(goal.monthly_needed || 0), currencyCode)}
                  </p>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Progress</span>
                      <span className="text-green-400">
                        {goal.progress_percent.toFixed(0)}%
                      </span>
                    </div>

                    <div className="h-3 w-full rounded-full bg-zinc-800">
                      <div
                        className="h-3 rounded-full bg-green-500"
                        style={{ width: `${progressWidth}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="mb-3 text-lg font-semibold">Contribution History</h3>

                    {goalContributions.length === 0 ? (
                      <p className="text-sm text-zinc-400">No contributions yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {goalContributions.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium">
                                {formatCurrency(item.amount, currencyCode)}
                              </p>
                              <p className="text-sm text-zinc-500">
                                {item.contribution_date}
                              </p>
                            </div>
                            <p className="mt-1 text-sm text-zinc-400">
                              From: {getWalletName(item.wallet_id)}
                            </p>
                            {item.linked_transaction_id ? (
                              <p className="mt-1 text-xs text-zinc-500">
                                Linked transaction recorded
                              </p>
                            ) : null}
                            {item.note ? (
                              <p className="mt-1 text-sm text-zinc-500">{item.note}</p>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex gap-4">
                    <Link
                      href={`/add-transaction?action=saving&goalId=${goal.id}`}
                      className="text-white hover:text-zinc-300"
                    >
                      Add Saving
                    </Link>

                    <button
                      onClick={() =>
                        handleStartEdit(
                          goals.find((item) => item.id === goal.id) as SavingsGoal
                        )
                      }
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteGoal(goal.id)}
                      disabled={deletingId === goal.id}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {deletingId === goal.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {editingId && (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Edit Savings Goal</h2>

            <form className="space-y-4" onSubmit={handleUpdateGoal}>
              <div>
                <label className="mb-2 block text-sm">Goal Name</label>
                <input
                  type="text"
                  value={editGoalName}
                  onChange={(e) => setEditGoalName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Target Amount</label>
                <input
                  type="number"
                  value={editTargetAmount}
                  onChange={(e) => setEditTargetAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Current Amount</label>
                <input
                  type="number"
                  value={editCurrentAmount}
                  onChange={(e) => setEditCurrentAmount(e.target.value)}
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

              <div>
                <label className="mb-2 block text-sm">Target Date</label>
                <input
                  type="date"
                  value={editTargetDate}
                  onChange={(e) => setEditTargetDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
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