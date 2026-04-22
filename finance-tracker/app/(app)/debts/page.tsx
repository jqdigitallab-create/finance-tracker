"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Debt = {
  id: string;
  debt_name: string;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number | null;
  interest_rate: number | null;
  due_date: string | null;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [debtName, setDebtName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [remainingAmount, setRemainingAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function fetchDebts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("debts")
      .select(
        "id, debt_name, total_amount, remaining_amount, monthly_payment, interest_rate, due_date"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Debt fetch error:", error);
      setLoading(false);
      return;
    }

    setDebts((data ?? []) as Debt[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchDebts();
  }, []);

  async function handleAddDebt(e: React.FormEvent) {
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

    if (!debtName.trim()) {
      setSaving(false);
      alert("Please enter a debt name.");
      return;
    }

    if (!totalAmount || Number(totalAmount) <= 0) {
      setSaving(false);
      alert("Please enter a valid total amount.");
      return;
    }

    if (!remainingAmount || Number(remainingAmount) < 0) {
      setSaving(false);
      alert("Please enter a valid remaining amount.");
      return;
    }

    const { error } = await supabase.from("debts").insert({
      user_id: user.id,
      debt_name: debtName.trim(),
      total_amount: Number(totalAmount),
      remaining_amount: Number(remainingAmount),
      monthly_payment: Number(monthlyPayment || 0),
      interest_rate: Number(interestRate || 0),
      due_date: dueDate || null,
    });

    setSaving(false);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    alert("Debt added successfully.");

    setDebtName("");
    setTotalAmount("");
    setRemainingAmount("");
    setMonthlyPayment("");
    setInterestRate("");
    setDueDate("");

    await fetchDebts();
  }

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl text-zinc-400">Loading debts...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Debts</h1>
          <p className="mt-2 text-zinc-400">
            Track outstanding balances and monthly repayment commitments.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-2xl font-semibold">Add Debt</h2>

          <form className="space-y-4" onSubmit={handleAddDebt}>
            <div>
              <label className="mb-2 block text-sm">Debt Name</label>
              <input
                type="text"
                value={debtName}
                onChange={(e) => setDebtName(e.target.value)}
                placeholder="Enter debt name"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Total Amount</label>
              <input
                type="number"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                placeholder="Enter total amount"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Remaining Amount</label>
              <input
                type="number"
                value={remainingAmount}
                onChange={(e) => setRemainingAmount(e.target.value)}
                placeholder="Enter remaining amount"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Monthly Payment</label>
              <input
                type="number"
                value={monthlyPayment}
                onChange={(e) => setMonthlyPayment(e.target.value)}
                placeholder="Enter monthly payment"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Interest Rate (%)</label>
              <input
                type="number"
                value={interestRate}
                onChange={(e) => setInterestRate(e.target.value)}
                placeholder="Enter interest rate"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Adding Debt..." : "Add Debt"}
            </button>
          </form>
        </div>

        {debts.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No debts yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {debts.map((debt) => (
              <div
                key={debt.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <p className="text-sm text-zinc-400">{debt.debt_name}</p>
                <h2 className="mt-2 text-2xl font-semibold">
                  RM {Number(debt.remaining_amount || 0).toFixed(2)}
                </h2>
                <p className="mt-3 text-sm text-zinc-500">
                  Total: RM {Number(debt.total_amount || 0).toFixed(2)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Monthly Payment: RM {Number(debt.monthly_payment || 0).toFixed(2)}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Interest Rate: {Number(debt.interest_rate || 0).toFixed(2)}%
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Due Date: {debt.due_date || "Not set"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}