"use client";
import { recalculateWalletBalance } from "@/lib/recalculateWalletBalance";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Wallet = {
  id: string;
  wallet_name: string;
  wallet_type: string;
  currency: string | null;
  current_balance: number | null;
};

export default function WalletsPage() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [walletName, setWalletName] = useState("");
  const [walletType, setWalletType] = useState("Cash");
  const [currency, setCurrency] = useState("MYR");
  const [startingBalance, setStartingBalance] = useState("");

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
      .select("id, wallet_name, wallet_type, currency, current_balance")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
  
    if (error) {
      console.error("Wallet fetch error:", error);
      setLoading(false);
      return;
    }
  
    const walletRows = (data ?? []) as Wallet[];
  
    for (const wallet of walletRows) {
      try {
        await recalculateWalletBalance(wallet.id);
      } catch (error) {
        console.error("Wallet recalculate error:", error);
      }
    }
  
    const { data: refreshedData, error: refreshedError } = await supabase
      .from("wallets")
      .select("id, wallet_name, wallet_type, currency, current_balance")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
  
    if (refreshedError) {
      console.error("Wallet refetch error:", refreshedError);
      setLoading(false);
      return;
    }
  
    setWallets((refreshedData ?? []) as Wallet[]);
    setLoading(false);
  }

  useEffect(() => {
    fetchWallets();
  }, []);

  async function handleAddWallet(e: React.FormEvent) {
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

    const balance = Number(startingBalance || 0);

    const { error } = await supabase.from("wallets").insert({
      user_id: user.id,
      wallet_name: walletName,
      wallet_type: walletType,
      currency,
      starting_balance: balance,
      current_balance: balance,
    });

    setSaving(false);

    if (error) {
      alert(error.message);
      return;
    }

    setWalletName("");
    setWalletType("Cash");
    setCurrency("MYR");
    setStartingBalance("");

    await fetchWallets();
    alert("Wallet added successfully.");
  }

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
            Manage your money across different accounts and wallets.
          </p>
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
                placeholder="Enter wallet name"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Wallet Type</label>
              <select
                value={walletType}
                onChange={(e) => setWalletType(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option>Cash</option>
                <option>Bank Account</option>
                <option>E-Wallet</option>
                <option>Credit Card</option>
              </select>
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
              <label className="mb-2 block text-sm">Starting Balance</label>
              <input
                type="number"
                value={startingBalance}
                onChange={(e) => setStartingBalance(e.target.value)}
                placeholder="Enter starting balance"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Adding Wallet..." : "Add Wallet"}
            </button>
          </form>
        </div>

        {wallets.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No wallets yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <p className="text-sm text-zinc-400">{wallet.wallet_type}</p>
                <h2 className="mt-2 text-2xl font-semibold">{wallet.wallet_name}</h2>
                <p className="mt-2 text-sm text-zinc-500">{wallet.currency || "MYR"}</p>
                <p className="mt-6 text-2xl font-bold">
                  {(wallet.currency || "MYR")} {Number(wallet.current_balance || 0).toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}