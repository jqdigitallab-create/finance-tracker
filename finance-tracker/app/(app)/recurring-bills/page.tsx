"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type RecurringBill = {
  id: string;
  bill_name: string;
  amount: number;
  currency: string | null;
  frequency: "weekly" | "monthly" | "yearly";
  next_due_date: string | null;
  category: string | null;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export default function RecurringBillsPage() {
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [billName, setBillName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("MYR");
  const [frequency, setFrequency] = useState<"weekly" | "monthly" | "yearly">("monthly");
  const [nextDueDate, setNextDueDate] = useState("");
  const [category, setCategory] = useState("Utilities");

  async function fetchBills() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("recurring_bills")
      .select("id, bill_name, amount, currency, frequency, next_due_date, category")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Recurring bills fetch error:", error);
      setLoading(false);
      return;
    }

    setBills((data ?? []) as RecurringBill[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchBills();
  }, []);

  async function handleAddBill(e: React.FormEvent) {
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

    if (!billName.trim()) {
      setSaving(false);
      alert("Please enter a bill name.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setSaving(false);
      alert("Please enter a valid amount.");
      return;
    }

    const { error } = await supabase.from("recurring_bills").insert({
      user_id: user.id,
      bill_name: billName.trim(),
      amount: Number(amount),
      currency,
      frequency,
      next_due_date: nextDueDate || null,
      category,
    });

    setSaving(false);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    alert("Recurring bill added successfully.");

    setBillName("");
    setAmount("");
    setCurrency("MYR");
    setFrequency("monthly");
    setNextDueDate("");
    setCategory("Utilities");

    await fetchBills();
  }

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl text-zinc-400">Loading recurring bills...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Recurring Bills</h1>
          <p className="mt-2 text-zinc-400">
            Track repeated payments and upcoming due dates.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-2xl font-semibold">Add Recurring Bill</h2>

          <form className="space-y-4" onSubmit={handleAddBill}>
            <div>
              <label className="mb-2 block text-sm">Bill Name</label>
              <input
                type="text"
                value={billName}
                onChange={(e) => setBillName(e.target.value)}
                placeholder="Enter bill name"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
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
              <label className="mb-2 block text-sm">Frequency</label>
              <select
                value={frequency}
                onChange={(e) =>
                  setFrequency(e.target.value as "weekly" | "monthly" | "yearly")
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Next Due Date</label>
              <input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
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
                <option>Utilities</option>
                <option>Rent</option>
                <option>Subscription</option>
                <option>Insurance</option>
                <option>Other</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Adding Bill..." : "Add Recurring Bill"}
            </button>
          </form>
        </div>

        {bills.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No recurring bills yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <p className="text-sm text-zinc-400">{bill.bill_name}</p>
                <h2 className="mt-2 text-2xl font-semibold">
                  {(bill.currency || "MYR")} {Number(bill.amount || 0).toFixed(2)}
                </h2>
                <p className="mt-3 text-sm text-zinc-500">
                  Frequency: {bill.frequency}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Next Due: {bill.next_due_date || "Not set"}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Category: {bill.category || "Not set"}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}