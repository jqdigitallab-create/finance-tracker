"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/formatCurrency";

type Wallet = {
  id: string;
  wallet_name: string;
  wallet_type: "cash" | "bank" | "ewallet" | "credit_card" | "other";
  current_balance: number | null;
  currency: string | null;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState<
    "cash" | "bank" | "ewallet" | "credit_card" | "other"
  >("bank");
  const [currentBalance, setCurrentBalance] = useState("");
  const [currency, setCurrency] = useState("MYR");

  const [editWalletName, setEditWalletName] = useState("");
  const [editWalletType, setEditWalletType] = useState<
    "cash" | "bank" | "ewallet" | "credit_card" | "other"
  >("bank");
  const [editCurrentBalance, setEditCurrentBalance] = useState("");
  const [editCurrency, setEditCurrency] = useState("MYR");

  async function fetchWallets() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("wallets")
      .select("id, wallet_name, wallet_type, current_balance, currency")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    setWallets((data ?? []) as Wallet[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchWallets();
  }, []);

  async function handleAddWallet(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not found.");
      }

      if (!walletName.trim()) {
        throw new Error("Please enter a wallet name.");
      }

      if (currentBalance === "" || Number(currentBalance) < 0) {
        throw new Error("Please enter a valid balance.");
      }

      const { error } = await supabase.from("wallets").insert({
        user_id: user.id,
        wallet_name: walletName.trim(),
        wallet_type: walletType,
        current_balance: Number(currentBalance),
        currency,
      });

      if (error) {
        throw error;
      }

      setWalletName("");
      setWalletType("bank");
      setCurrentBalance("");
      setCurrency("MYR");

      await fetchWallets();
      alert("Wallet added successfully.");
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSaving(false);
  }

  function handleStartEdit(wallet: Wallet) {
    setEditingId(wallet.id);
    setEditWalletName(wallet.wallet_name);
    setEditWalletType(wallet.wallet_type || "bank");
    setEditCurrentBalance(String(Number(wallet.current_balance || 0)));
    setEditCurrency(wallet.currency || "MYR");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditWalletName("");
    setEditWalletType("bank");
    setEditCurrentBalance("");
    setEditCurrency("MYR");
  }

  async function handleUpdateWallet(e: React.FormEvent) {
    e.preventDefault();

    if (!editingId) return;

    setSavingEdit(true);

    try {
      if (!editWalletName.trim()) {
        throw new Error("Please enter a wallet name.");
      }

      if (editCurrentBalance === "" || Number(editCurrentBalance) < 0) {
        throw new Error("Please enter a valid balance.");
      }

      const { error } = await supabase
        .from("wallets")
        .update({
          wallet_name: editWalletName.trim(),
          wallet_type: editWalletType,
          current_balance: Number(editCurrentBalance),
          currency: editCurrency,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) {
        throw error;
      }

      await fetchWallets();
      alert("Wallet updated successfully.");
      handleCancelEdit();
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSavingEdit(false);
  }

  async function handleDeleteWallet(walletId: string) {
    const confirmed = window.confirm("Delete this wallet?");
    if (!confirmed) return;

    setDeletingId(walletId);

    const { error } = await supabase.from("wallets").delete().eq("id", walletId);

    setDeletingId(null);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    await fetchWallets();
    alert("Wallet deleted successfully.");
  }

  const totalBalance = useMemo(
    () => wallets.reduce((sum, wallet) => sum + Number(wallet.current_balance || 0), 0),
    [wallets]
  );

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl text-zinc-400">Loading wallets...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Wallets</h1>
          <p className="mt-2 text-zinc-400">
            Manage your cash, bank accounts, e-wallets, and cards.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <p className="text-sm text-zinc-400">Total Wallet Balance</p>
          <h2 className="mt-2 text-2xl font-semibold">
            {formatCurrency(totalBalance, "MYR")}
          </h2>
        </div>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-2xl font-semibold">Add Wallet</h2>

          <form className="space-y-4" onSubmit={handleAddWallet}>
            <div>
              <label className="mb-2 block text-sm">Wallet Name</label>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder="Example: Maybank, TNG, Cash"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Wallet Type</label>
              <select
                value={walletType}
                onChange={(e) =>
                  setWalletType(
                    e.target.value as "cash" | "bank" | "ewallet" | "credit_card" | "other"
                  )
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option value="cash">Cash</option>
                <option value="bank">Bank</option>
                <option value="ewallet">E-Wallet</option>
                <option value="credit_card">Credit Card</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Current Balance</label>
              <input
                type="number"
                value={currentBalance}
                onChange={(e) => setCurrentBalance(e.target.value)}
                placeholder="Enter balance"
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
              {saving ? "Adding..." : "Add Wallet"}
            </button>
          </form>
        </div>

        {wallets.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No wallets yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <p className="text-sm text-zinc-400">{wallet.wallet_type}</p>
                <h2 className="mt-2 text-2xl font-semibold">{wallet.wallet_name}</h2>
                <p className="mt-3 text-sm text-zinc-500">
                  Balance: {formatCurrency(Number(wallet.current_balance || 0), wallet.currency || "MYR")}
                </p>

                <div className="mt-6 flex gap-4">
                  <button
                    onClick={() => handleStartEdit(wallet)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => handleDeleteWallet(wallet.id)}
                    disabled={deletingId === wallet.id}
                    className="text-red-400 hover:text-red-300 disabled:opacity-50"
                  >
                    {deletingId === wallet.id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {editingId && (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Edit Wallet</h2>

            <form className="space-y-4" onSubmit={handleUpdateWallet}>
              <div>
                <label className="mb-2 block text-sm">Wallet Name</label>
                <input
                  type="text"
                  value={editWalletName}
                  onChange={(e) => setEditWalletName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Wallet Type</label>
                <select
                  value={editWalletType}
                  onChange={(e) =>
                    setEditWalletType(
                      e.target.value as "cash" | "bank" | "ewallet" | "credit_card" | "other"
                    )
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="ewallet">E-Wallet</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">Current Balance</label>
                <input
                  type="number"
                  value={editCurrentBalance}
                  onChange={(e) => setEditCurrentBalance(e.target.value)}
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