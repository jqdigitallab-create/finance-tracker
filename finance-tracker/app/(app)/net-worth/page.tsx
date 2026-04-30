"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  getNetWorthData,
  NetWorthAssetRow,
  NetWorthLiabilityRow,
  NetWorthSummary,
  WalletRow,
  SavingsGoalRow,
  DebtRow,
} from "@/lib/netWorthHelpers";

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export default function NetWorthPage() {
  const [wallets, setWallets] = useState<WalletRow[]>([]);
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoalRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [manualAssets, setManualAssets] = useState<NetWorthAssetRow[]>([]);
  const [manualLiabilities, setManualLiabilities] = useState<NetWorthLiabilityRow[]>([]);
  const [summary, setSummary] = useState<NetWorthSummary | null>(null);

  const [loading, setLoading] = useState(true);

  const [savingAsset, setSavingAsset] = useState(false);
  const [savingLiability, setSavingLiability] = useState(false);

  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editingLiabilityId, setEditingLiabilityId] = useState<string | null>(null);
  const [savingAssetEdit, setSavingAssetEdit] = useState(false);
  const [savingLiabilityEdit, setSavingLiabilityEdit] = useState(false);
  const [deletingAssetId, setDeletingAssetId] = useState<string | null>(null);
  const [deletingLiabilityId, setDeletingLiabilityId] = useState<string | null>(null);

  const [assetName, setAssetName] = useState("");
  const [assetType, setAssetType] = useState<
    "cash" | "investment" | "property" | "vehicle" | "business" | "other"
  >("investment");
  const [assetAmount, setAssetAmount] = useState("");
  const [assetCurrency, setAssetCurrency] = useState("MYR");
  const [assetNote, setAssetNote] = useState("");

  const [liabilityName, setLiabilityName] = useState("");
  const [liabilityType, setLiabilityType] = useState<
    "loan" | "credit_card" | "mortgage" | "vehicle_loan" | "personal_debt" | "tax" | "other"
  >("other");
  const [liabilityAmount, setLiabilityAmount] = useState("");
  const [liabilityCurrency, setLiabilityCurrency] = useState("MYR");
  const [liabilityNote, setLiabilityNote] = useState("");

  const [editAssetName, setEditAssetName] = useState("");
  const [editAssetType, setEditAssetType] = useState<
    "cash" | "investment" | "property" | "vehicle" | "business" | "other"
  >("investment");
  const [editAssetAmount, setEditAssetAmount] = useState("");
  const [editAssetCurrency, setEditAssetCurrency] = useState("MYR");
  const [editAssetNote, setEditAssetNote] = useState("");
  const [editAssetActive, setEditAssetActive] = useState(true);

  const [editLiabilityName, setEditLiabilityName] = useState("");
  const [editLiabilityType, setEditLiabilityType] = useState<
    "loan" | "credit_card" | "mortgage" | "vehicle_loan" | "personal_debt" | "tax" | "other"
  >("other");
  const [editLiabilityAmount, setEditLiabilityAmount] = useState("");
  const [editLiabilityCurrency, setEditLiabilityCurrency] = useState("MYR");
  const [editLiabilityNote, setEditLiabilityNote] = useState("");
  const [editLiabilityActive, setEditLiabilityActive] = useState(true);

  async function fetchNetWorth() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const data = await getNetWorthData(user.id);
      setWallets(data.wallets);
      setSavingsGoals(data.savingsGoals);
      setDebts(data.debts);
      setManualAssets(data.manualAssets);
      setManualLiabilities(data.manualLiabilities);
      setSummary(data.summary);
    } catch (error) {
      console.error("Net worth fetch error:", error);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchNetWorth();
  }, []);

  async function handleAddAsset(e: React.FormEvent) {
    e.preventDefault();
    setSavingAsset(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not found.");
      if (!assetName.trim()) throw new Error("Please enter an asset name.");
      if (!assetAmount || Number(assetAmount) < 0) {
        throw new Error("Please enter a valid asset amount.");
      }

      const { error } = await supabase.from("net_worth_assets").insert({
        user_id: user.id,
        asset_name: assetName.trim(),
        asset_type: assetType,
        amount: Number(assetAmount),
        currency: assetCurrency,
        note: assetNote.trim() || null,
        is_active: true,
      });

      if (error) throw error;

      setAssetName("");
      setAssetType("investment");
      setAssetAmount("");
      setAssetCurrency("MYR");
      setAssetNote("");

      await fetchNetWorth();
      alert("Asset added successfully.");
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSavingAsset(false);
  }

  async function handleAddLiability(e: React.FormEvent) {
    e.preventDefault();
    setSavingLiability(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not found.");
      if (!liabilityName.trim()) throw new Error("Please enter a liability name.");
      if (!liabilityAmount || Number(liabilityAmount) < 0) {
        throw new Error("Please enter a valid liability amount.");
      }

      const { error } = await supabase.from("net_worth_liabilities").insert({
        user_id: user.id,
        liability_name: liabilityName.trim(),
        liability_type: liabilityType,
        amount: Number(liabilityAmount),
        currency: liabilityCurrency,
        note: liabilityNote.trim() || null,
        is_active: true,
      });

      if (error) throw error;

      setLiabilityName("");
      setLiabilityType("other");
      setLiabilityAmount("");
      setLiabilityCurrency("MYR");
      setLiabilityNote("");

      await fetchNetWorth();
      alert("Liability added successfully.");
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSavingLiability(false);
  }

  function handleStartAssetEdit(asset: NetWorthAssetRow) {
    setEditingAssetId(asset.id);
    setEditAssetName(asset.asset_name);
    setEditAssetType(asset.asset_type);
    setEditAssetAmount(String(Number(asset.amount || 0)));
    setEditAssetCurrency(asset.currency || "MYR");
    setEditAssetNote(asset.note || "");
    setEditAssetActive(asset.is_active);
  }

  function handleCancelAssetEdit() {
    setEditingAssetId(null);
    setEditAssetName("");
    setEditAssetType("investment");
    setEditAssetAmount("");
    setEditAssetCurrency("MYR");
    setEditAssetNote("");
    setEditAssetActive(true);
  }

  function handleStartLiabilityEdit(liability: NetWorthLiabilityRow) {
    setEditingLiabilityId(liability.id);
    setEditLiabilityName(liability.liability_name);
    setEditLiabilityType(liability.liability_type);
    setEditLiabilityAmount(String(Number(liability.amount || 0)));
    setEditLiabilityCurrency(liability.currency || "MYR");
    setEditLiabilityNote(liability.note || "");
    setEditLiabilityActive(liability.is_active);
  }

  function handleCancelLiabilityEdit() {
    setEditingLiabilityId(null);
    setEditLiabilityName("");
    setEditLiabilityType("other");
    setEditLiabilityAmount("");
    setEditLiabilityCurrency("MYR");
    setEditLiabilityNote("");
    setEditLiabilityActive(true);
  }

  async function handleUpdateAsset(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAssetId) return;

    setSavingAssetEdit(true);

    try {
      if (!editAssetName.trim()) throw new Error("Please enter an asset name.");
      if (!editAssetAmount || Number(editAssetAmount) < 0) {
        throw new Error("Please enter a valid asset amount.");
      }

      const { error } = await supabase
        .from("net_worth_assets")
        .update({
          asset_name: editAssetName.trim(),
          asset_type: editAssetType,
          amount: Number(editAssetAmount),
          currency: editAssetCurrency,
          note: editAssetNote.trim() || null,
          is_active: editAssetActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingAssetId);

      if (error) throw error;

      await fetchNetWorth();
      alert("Asset updated successfully.");
      handleCancelAssetEdit();
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSavingAssetEdit(false);
  }

  async function handleUpdateLiability(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLiabilityId) return;

    setSavingLiabilityEdit(true);

    try {
      if (!editLiabilityName.trim()) throw new Error("Please enter a liability name.");
      if (!editLiabilityAmount || Number(editLiabilityAmount) < 0) {
        throw new Error("Please enter a valid liability amount.");
      }

      const { error } = await supabase
        .from("net_worth_liabilities")
        .update({
          liability_name: editLiabilityName.trim(),
          liability_type: editLiabilityType,
          amount: Number(editLiabilityAmount),
          currency: editLiabilityCurrency,
          note: editLiabilityNote.trim() || null,
          is_active: editLiabilityActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingLiabilityId);

      if (error) throw error;

      await fetchNetWorth();
      alert("Liability updated successfully.");
      handleCancelLiabilityEdit();
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSavingLiabilityEdit(false);
  }

  async function handleDeleteAsset(assetId: string) {
    const confirmed = window.confirm("Delete this asset?");
    if (!confirmed) return;

    setDeletingAssetId(assetId);

    const { error } = await supabase
      .from("net_worth_assets")
      .delete()
      .eq("id", assetId);

    setDeletingAssetId(null);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    await fetchNetWorth();
    alert("Asset deleted successfully.");
  }

  async function handleDeleteLiability(liabilityId: string) {
    const confirmed = window.confirm("Delete this liability?");
    if (!confirmed) return;

    setDeletingLiabilityId(liabilityId);

    const { error } = await supabase
      .from("net_worth_liabilities")
      .delete()
      .eq("id", liabilityId);

    setDeletingLiabilityId(null);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    await fetchNetWorth();
    alert("Liability deleted successfully.");
  }

  const activeManualAssets = useMemo(
    () => manualAssets.filter((item) => item.is_active),
    [manualAssets]
  );

  const activeManualLiabilities = useMemo(
    () => manualLiabilities.filter((item) => item.is_active),
    [manualLiabilities]
  );

  if (loading || !summary) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl text-zinc-400">Loading net worth...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Net Worth</h1>
          <p className="mt-2 text-zinc-400">
            Track your full financial position with assets minus liabilities.
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Assets</p>
            <h2 className="mt-2 text-2xl font-semibold text-green-400">
              {formatCurrency(summary.totalAssets, "MYR")}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Liabilities</p>
            <h2 className="mt-2 text-2xl font-semibold text-red-400">
              {formatCurrency(summary.totalLiabilities, "MYR")}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Net Worth</p>
            <h2
              className={`mt-2 text-2xl font-semibold ${
                summary.netWorth >= 0 ? "text-white" : "text-red-400"
              }`}
            >
              {formatCurrency(summary.netWorth, "MYR")}
            </h2>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-5">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">Wallet Assets</p>
            <h3 className="mt-2 text-xl font-semibold">
              {formatCurrency(summary.walletAssets, "MYR")}
            </h3>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">Savings Assets</p>
            <h3 className="mt-2 text-xl font-semibold">
              {formatCurrency(summary.savingsAssets, "MYR")}
            </h3>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">Manual Assets</p>
            <h3 className="mt-2 text-xl font-semibold">
              {formatCurrency(summary.manualAssets, "MYR")}
            </h3>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">Debt Liabilities</p>
            <h3 className="mt-2 text-xl font-semibold">
              {formatCurrency(summary.debtLiabilities, "MYR")}
            </h3>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
            <p className="text-sm text-zinc-400">Manual Liabilities</p>
            <h3 className="mt-2 text-xl font-semibold">
              {formatCurrency(summary.manualLiabilities, "MYR")}
            </h3>
          </div>
        </div>

        <div className="mb-8 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Add Manual Asset</h2>

            <form className="space-y-4" onSubmit={handleAddAsset}>
              <div>
                <label className="mb-2 block text-sm">Asset Name</label>
                <input
                  type="text"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  placeholder="Example: EPF, Stocks, House, Car"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Asset Type</label>
                <select
                  value={assetType}
                  onChange={(e) =>
                    setAssetType(
                      e.target.value as
                        | "cash"
                        | "investment"
                        | "property"
                        | "vehicle"
                        | "business"
                        | "other"
                    )
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="investment">Investment</option>
                  <option value="property">Property</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="business">Business</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">Amount</label>
                <input
                  type="number"
                  value={assetAmount}
                  onChange={(e) => setAssetAmount(e.target.value)}
                  placeholder="Enter asset amount"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Currency</label>
                <select
                  value={assetCurrency}
                  onChange={(e) => setAssetCurrency(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option>MYR</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">Note</label>
                <textarea
                  value={assetNote}
                  onChange={(e) => setAssetNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingAsset}
                className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
              >
                {savingAsset ? "Adding..." : "Add Asset"}
              </button>
            </form>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Add Manual Liability</h2>

            <form className="space-y-4" onSubmit={handleAddLiability}>
              <div>
                <label className="mb-2 block text-sm">Liability Name</label>
                <input
                  type="text"
                  value={liabilityName}
                  onChange={(e) => setLiabilityName(e.target.value)}
                  placeholder="Example: Credit Card, Tax Owed, Personal Debt"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Liability Type</label>
                <select
                  value={liabilityType}
                  onChange={(e) =>
                    setLiabilityType(
                      e.target.value as
                        | "loan"
                        | "credit_card"
                        | "mortgage"
                        | "vehicle_loan"
                        | "personal_debt"
                        | "tax"
                        | "other"
                    )
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option value="loan">Loan</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="mortgage">Mortgage</option>
                  <option value="vehicle_loan">Vehicle Loan</option>
                  <option value="personal_debt">Personal Debt</option>
                  <option value="tax">Tax</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">Amount</label>
                <input
                  type="number"
                  value={liabilityAmount}
                  onChange={(e) => setLiabilityAmount(e.target.value)}
                  placeholder="Enter liability amount"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Currency</label>
                <select
                  value={liabilityCurrency}
                  onChange={(e) => setLiabilityCurrency(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option>MYR</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">Note</label>
                <textarea
                  value={liabilityNote}
                  onChange={(e) => setLiabilityNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={savingLiability}
                className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
              >
                {savingLiability ? "Adding..." : "Add Liability"}
              </button>
            </form>
          </div>
        </div>

        <div className="mb-8 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">System Assets</h2>

            <div className="space-y-4">
              <div>
                <h3 className="mb-2 text-lg font-semibold">Wallets</h3>
                {wallets.length === 0 ? (
                  <p className="text-sm text-zinc-400">No wallets yet.</p>
                ) : (
                  <div className="space-y-3">
                    {wallets.map((wallet) => (
                      <div
                        key={wallet.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p>{wallet.wallet_name}</p>
                          <p className="font-medium">
                            {formatCurrency(Number(wallet.current_balance || 0), wallet.currency || "MYR")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-lg font-semibold">Savings Goals</h3>
                {savingsGoals.length === 0 ? (
                  <p className="text-sm text-zinc-400">No savings goals yet.</p>
                ) : (
                  <div className="space-y-3">
                    {savingsGoals.map((goal) => (
                      <div
                        key={goal.id}
                        className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                      >
                        <div className="flex items-center justify-between">
                          <p>{goal.goal_name}</p>
                          <p className="font-medium">
                            {formatCurrency(Number(goal.current_amount || 0), goal.currency || "MYR")}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">System Liabilities</h2>

            {debts.length === 0 ? (
              <p className="text-sm text-zinc-400">No debts yet.</p>
            ) : (
              <div className="space-y-3">
                {debts.map((debt) => (
                  <div
                    key={debt.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p>{debt.debt_name}</p>
                      <p className="font-medium text-red-400">
                        {formatCurrency(Number(debt.remaining_amount || 0), "MYR")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 grid gap-8 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Manual Assets</h2>

            {activeManualAssets.length === 0 ? (
              <p className="text-sm text-zinc-400">No manual assets yet.</p>
            ) : (
              <div className="space-y-3">
                {activeManualAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{asset.asset_name}</p>
                        <p className="mt-1 text-sm text-zinc-500">{asset.asset_type}</p>
                        {asset.note ? (
                          <p className="mt-1 text-sm text-zinc-500">{asset.note}</p>
                        ) : null}
                      </div>

                      <div className="text-right">
                        <p className="font-medium">
                          {formatCurrency(Number(asset.amount || 0), asset.currency || "MYR")}
                        </p>
                        <div className="mt-2 flex gap-3">
                          <button
                            onClick={() => handleStartAssetEdit(asset)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteAsset(asset.id)}
                            disabled={deletingAssetId === asset.id}
                            className="text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            {deletingAssetId === asset.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Manual Liabilities</h2>

            {activeManualLiabilities.length === 0 ? (
              <p className="text-sm text-zinc-400">No manual liabilities yet.</p>
            ) : (
              <div className="space-y-3">
                {activeManualLiabilities.map((liability) => (
                  <div
                    key={liability.id}
                    className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">{liability.liability_name}</p>
                        <p className="mt-1 text-sm text-zinc-500">{liability.liability_type}</p>
                        {liability.note ? (
                          <p className="mt-1 text-sm text-zinc-500">{liability.note}</p>
                        ) : null}
                      </div>

                      <div className="text-right">
                        <p className="font-medium text-red-400">
                          {formatCurrency(
                            Number(liability.amount || 0),
                            liability.currency || "MYR"
                          )}
                        </p>
                        <div className="mt-2 flex gap-3">
                          <button
                            onClick={() => handleStartLiabilityEdit(liability)}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteLiability(liability.id)}
                            disabled={deletingLiabilityId === liability.id}
                            className="text-red-400 hover:text-red-300 disabled:opacity-50"
                          >
                            {deletingLiabilityId === liability.id ? "Deleting..." : "Delete"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {editingAssetId && (
          <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Edit Asset</h2>

            <form className="space-y-4" onSubmit={handleUpdateAsset}>
              <div>
                <label className="mb-2 block text-sm">Asset Name</label>
                <input
                  type="text"
                  value={editAssetName}
                  onChange={(e) => setEditAssetName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Asset Type</label>
                <select
                  value={editAssetType}
                  onChange={(e) =>
                    setEditAssetType(
                      e.target.value as
                        | "cash"
                        | "investment"
                        | "property"
                        | "vehicle"
                        | "business"
                        | "other"
                    )
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="investment">Investment</option>
                  <option value="property">Property</option>
                  <option value="vehicle">Vehicle</option>
                  <option value="business">Business</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">Amount</label>
                <input
                  type="number"
                  value={editAssetAmount}
                  onChange={(e) => setEditAssetAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Currency</label>
                <select
                  value={editAssetCurrency}
                  onChange={(e) => setEditAssetCurrency(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option>MYR</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">Note</label>
                <textarea
                  value={editAssetNote}
                  onChange={(e) => setEditAssetNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={editAssetActive}
                  onChange={(e) => setEditAssetActive(e.target.checked)}
                />
                Active
              </label>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingAssetEdit}
                  className="rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
                >
                  {savingAssetEdit ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelAssetEdit}
                  className="rounded-full border border-zinc-700 px-6 py-3 font-semibold text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {editingLiabilityId && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Edit Liability</h2>

            <form className="space-y-4" onSubmit={handleUpdateLiability}>
              <div>
                <label className="mb-2 block text-sm">Liability Name</label>
                <input
                  type="text"
                  value={editLiabilityName}
                  onChange={(e) => setEditLiabilityName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Liability Type</label>
                <select
                  value={editLiabilityType}
                  onChange={(e) =>
                    setEditLiabilityType(
                      e.target.value as
                        | "loan"
                        | "credit_card"
                        | "mortgage"
                        | "vehicle_loan"
                        | "personal_debt"
                        | "tax"
                        | "other"
                    )
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option value="loan">Loan</option>
                  <option value="credit_card">Credit Card</option>
                  <option value="mortgage">Mortgage</option>
                  <option value="vehicle_loan">Vehicle Loan</option>
                  <option value="personal_debt">Personal Debt</option>
                  <option value="tax">Tax</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">Amount</label>
                <input
                  type="number"
                  value={editLiabilityAmount}
                  onChange={(e) => setEditLiabilityAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Currency</label>
                <select
                  value={editLiabilityCurrency}
                  onChange={(e) => setEditLiabilityCurrency(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option>MYR</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">Note</label>
                <textarea
                  value={editLiabilityNote}
                  onChange={(e) => setEditLiabilityNote(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={editLiabilityActive}
                  onChange={(e) => setEditLiabilityActive(e.target.checked)}
                />
                Active
              </label>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={savingLiabilityEdit}
                  className="rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
                >
                  {savingLiabilityEdit ? "Saving..." : "Save Changes"}
                </button>

                <button
                  type="button"
                  onClick={handleCancelLiabilityEdit}
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