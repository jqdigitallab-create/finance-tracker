"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recalculateWalletBalance } from "@/lib/recalculateWalletBalance";

type Wallet = {
  id: string;
  wallet_name: string;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export default function AddTransactionPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loadingWallets, setLoadingWallets] = useState(true);
  const [saving, setSaving] = useState(false);

  const [transactionType, setTransactionType] = useState("income");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food");
  const [walletId, setWalletId] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const [note, setNote] = useState("");

  async function fetchWallets() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoadingWallets(false);
      return;
    }

    const { data, error } = await supabase
      .from("wallets")
      .select("id, wallet_name")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Wallet fetch error:", error);
      setLoadingWallets(false);
      return;
    }

    const walletRows = (data ?? []) as Wallet[];
    setWallets(walletRows);

    if (walletRows.length > 0) {
      setWalletId(walletRows[0].id);
    }

    setLoadingWallets(false);
  }

  useEffect(() => {
    fetchWallets();
  }, []);

  async function handleSaveTransaction(e: React.FormEvent) {
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

    if (!walletId) {
      setSaving(false);
      alert("Please select a wallet.");
      return;
    }

    if (!title.trim()) {
      setSaving(false);
      alert("Please enter a title.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setSaving(false);
      alert("Please enter a valid amount.");
      return;
    }

    if (!transactionDate) {
      setSaving(false);
      alert("Please select a transaction date.");
      return;
    }

    const numericAmount = Number(amount);

    const { error: insertError } = await supabase.from("transactions").insert({
      user_id: user.id,
      wallet_id: walletId,
      title: title.trim(),
      transaction_type: transactionType,
      category,
      amount: numericAmount,
      currency: "MYR",
      note: note.trim(),
      transaction_date: transactionDate,
    });

    if (insertError) {
      setSaving(false);
      alert(getErrorMessage(insertError));
      return;
    }

    try {
      await recalculateWalletBalance(walletId);
    } catch (error) {
      setSaving(false);
      alert(getErrorMessage(error));
      return;
    }

    setSaving(false);
    alert("Transaction saved successfully.");

    setTransactionType("income");
    setTitle("");
    setAmount("");
    setCategory("Food");
    setTransactionDate("");
    setNote("");
  }

  if (loadingWallets) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-2xl text-zinc-400">
          Loading wallets...
        </div>
      </div>
    );
  }

  if (wallets.length === 0) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
          You need to add at least one wallet before creating a transaction.
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Add Transaction</h1>
          <p className="mt-2 text-zinc-400">
            Record a new income or expense entry.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <form className="space-y-5" onSubmit={handleSaveTransaction}>
            <div>
              <label className="mb-2 block text-sm">Transaction Type</label>
              <select
                value={transactionType}
                onChange={(e) => setTransactionType(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter transaction title"
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
              <label className="mb-2 block text-sm">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option>Food</option>
                <option>Transport</option>
                <option>Salary</option>
                <option>Utilities</option>
                <option>Entertainment</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Wallet</label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.wallet_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Date</label>
              <input
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Note</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add note"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                rows={4}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Transaction"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}