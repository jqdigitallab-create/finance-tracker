"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type SavingsGoal = {
  id: string;
  goal_name: string;
  target_amount: number;
  current_amount: number | null;
  currency: string | null;
  target_date: string | null;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export default function SavingsGoalsPage() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [goalName, setGoalName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [currentAmount, setCurrentAmount] = useState("");
  const [currency, setCurrency] = useState("MYR");
  const [targetDate, setTargetDate] = useState("");

  async function fetchGoals() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("savings_goals")
      .select("id, goal_name, target_amount, current_amount, currency, target_date")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Savings goals fetch error:", error);
      setLoading(false);
      return;
    }

    setGoals((data ?? []) as SavingsGoal[]);
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Savings Goals</h1>
          <p className="mt-2 text-zinc-400">
            Set savings targets and track your progress toward each goal.
          </p>
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

        {goals.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No savings goals yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {goals.map((goal) => {
              const target = Number(goal.target_amount || 0);
              const current = Number(goal.current_amount || 0);
              const progress = target > 0 ? (current / target) * 100 : 0;

              return (
                <div
                  key={goal.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                >
                  <p className="text-sm text-zinc-400">{goal.goal_name}</p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    {(goal.currency || "MYR")} {target.toFixed(2)}
                  </h2>
                  <p className="mt-3 text-sm text-zinc-500">
                    Saved: {(goal.currency || "MYR")} {current.toFixed(2)}
                  </p>
                  <p className="mt-4 text-sm font-medium text-green-400">
                    Progress: {progress.toFixed(0)}%
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Target Date: {goal.target_date || "Not set"}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}