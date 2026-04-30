"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  getBillsDueWithinDays,
  getMonthlyRecurringCommitment,
  getOverdueBills,
  getRecurringBillAnalytics,
  RecurringBillAnalytics,
} from "@/lib/recurringBillAnalytics";

type RecurringBill = {
  id: string;
  bill_name: string;
  amount: number;
  currency: string | null;
  category: string | null;
  frequency: "weekly" | "monthly" | "quarterly" | "bi-yearly" | "yearly";
  next_due_date: string | null;
  last_paid_date: string | null;
  wallet_id: string | null;
  auto_pay: boolean | null;
  is_active: boolean;
  linked_transaction_id: string | null;
};

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

function getStatusClass(status: string) {
  if (status === "Overdue") return "text-red-400";
  if (status === "Due Soon") return "text-yellow-400";
  if (status === "Upcoming") return "text-green-400";
  if (status === "Inactive") return "text-zinc-500";
  return "text-zinc-400";
}

export default function RecurringBillsPage() {
  const [bills, setBills] = useState<RecurringBill[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [billAnalytics, setBillAnalytics] = useState<RecurringBillAnalytics[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [billName, setBillName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("MYR");
  const [category, setCategory] = useState("Utilities");
  const [frequency, setFrequency] = useState<
    "weekly" | "monthly" | "quarterly" | "bi-yearly" | "yearly"
  >("monthly");
  const [nextDueDate, setNextDueDate] = useState("");
  const [walletId, setWalletId] = useState("");
  const [autoPay, setAutoPay] = useState(false);

  const [editBillName, setEditBillName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editCurrency, setEditCurrency] = useState("MYR");
  const [editCategory, setEditCategory] = useState("Utilities");
  const [editFrequency, setEditFrequency] = useState<
    "weekly" | "monthly" | "quarterly" | "bi-yearly" | "yearly"
  >("monthly");
  const [editNextDueDate, setEditNextDueDate] = useState("");
  const [editWalletId, setEditWalletId] = useState("");
  const [editAutoPay, setEditAutoPay] = useState(false);
  const [editIsActive, setEditIsActive] = useState(true);

  async function fetchBills() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const [
      { data: billsData, error: billsError },
      { data: walletsData, error: walletsError },
    ] = await Promise.all([
      supabase
        .from("recurring_bills")
        .select(
          "id, bill_name, amount, currency, category, frequency, next_due_date, last_paid_date, wallet_id, auto_pay, is_active, linked_transaction_id"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("wallets")
        .select("id, wallet_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
    ]);

    if (billsError || walletsError) {
      console.error(billsError || walletsError);
      setLoading(false);
      return;
    }

    const billRows = ((billsData ?? []) as RecurringBill[]).map((bill) => ({
      ...bill,
      amount: Number(bill.amount || 0),
    }));

    setBills(billRows);
    setWallets((walletsData ?? []) as Wallet[]);
    setBillAnalytics(getRecurringBillAnalytics(billRows));
    setLoading(false);

    if (!walletId && walletsData && walletsData.length > 0) {
      setWalletId((walletsData[0] as Wallet).id);
    }
  }

  useEffect(() => {
    fetchBills();
  }, []);

  async function handleAddBill(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("User not found.");
      if (!billName.trim()) throw new Error("Please enter a bill name.");
      if (!amount || Number(amount) <= 0) throw new Error("Please enter a valid amount.");
      if (!nextDueDate) throw new Error("Please select next due date.");

      const { error } = await supabase.from("recurring_bills").insert({
        user_id: user.id,
        bill_name: billName.trim(),
        amount: Number(amount),
        currency,
        category,
        frequency,
        next_due_date: nextDueDate,
        last_paid_date: null,
        wallet_id: walletId || null,
        auto_pay: autoPay,
        is_active: true,
      });

      if (error) throw error;

      setBillName("");
      setAmount("");
      setCurrency("MYR");
      setCategory("Utilities");
      setFrequency("monthly");
      setNextDueDate("");
      setAutoPay(false);

      await fetchBills();
      alert("Recurring bill added successfully.");
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSaving(false);
  }

  function handleStartEdit(bill: RecurringBill) {
    setEditingId(bill.id);
    setEditBillName(bill.bill_name);
    setEditAmount(String(bill.amount));
    setEditCurrency(bill.currency || "MYR");
    setEditCategory(bill.category || "Utilities");
    setEditFrequency(bill.frequency);
    setEditNextDueDate(bill.next_due_date || "");
    setEditWalletId(bill.wallet_id || "");
    setEditAutoPay(Boolean(bill.auto_pay));
    setEditIsActive(bill.is_active);
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditBillName("");
    setEditAmount("");
    setEditCurrency("MYR");
    setEditCategory("Utilities");
    setEditFrequency("monthly");
    setEditNextDueDate("");
    setEditWalletId("");
    setEditAutoPay(false);
    setEditIsActive(true);
  }

  async function handleUpdateBill(e: React.FormEvent) {
    e.preventDefault();

    if (!editingId) return;

    try {
      if (!editBillName.trim()) throw new Error("Please enter a bill name.");
      if (!editAmount || Number(editAmount) <= 0) {
        throw new Error("Please enter a valid amount.");
      }
      if (!editNextDueDate) throw new Error("Please select next due date.");

      setSavingEdit(true);

      const { error } = await supabase
        .from("recurring_bills")
        .update({
          bill_name: editBillName.trim(),
          amount: Number(editAmount),
          currency: editCurrency,
          category: editCategory,
          frequency: editFrequency,
          next_due_date: editNextDueDate,
          wallet_id: editWalletId || null,
          auto_pay: editAutoPay,
          is_active: editIsActive,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) throw error;

      await fetchBills();
      alert("Recurring bill updated successfully.");
      handleCancelEdit();
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSavingEdit(false);
  }

  async function handleDeleteBill(billId: string) {
    const confirmed = window.confirm("Delete this recurring bill?");
    if (!confirmed) return;

    setDeletingId(billId);

    const { error } = await supabase
      .from("recurring_bills")
      .delete()
      .eq("id", billId);

    setDeletingId(null);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    await fetchBills();
    alert("Recurring bill deleted successfully.");
  }

  const overdueBills = useMemo(() => getOverdueBills(billAnalytics), [billAnalytics]);
  const next7DaysBills = useMemo(() => getBillsDueWithinDays(billAnalytics, 7), [billAnalytics]);
  const next30DaysBills = useMemo(() => getBillsDueWithinDays(billAnalytics, 30), [billAnalytics]);
  const monthlyCommitment = useMemo(
    () => getMonthlyRecurringCommitment(billAnalytics),
    [billAnalytics]
  );

  const overdueTotal = useMemo(
    () => overdueBills.reduce((sum, item) => sum + item.amount, 0),
    [overdueBills]
  );

  const next7DaysTotal = useMemo(
    () => next7DaysBills.reduce((sum, item) => sum + item.amount, 0),
    [next7DaysBills]
  );

  const next30DaysTotal = useMemo(
    () => next30DaysBills.reduce((sum, item) => sum + item.amount, 0),
    [next30DaysBills]
  );

  function getWalletName(walletIdValue: string | null) {
    if (!walletIdValue) return "Not linked";
    return wallets.find((wallet) => wallet.id === walletIdValue)?.wallet_name || "Unknown Wallet";
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
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Recurring Bills</h1>
            <p className="mt-2 text-zinc-400">
              Track bill cycles, urgency, and your recurring monthly commitment.
            </p>
          </div>

          <Link
            href="/add-transaction?action=recurring_bill_payment"
            className="rounded-full bg-white px-5 py-3 font-semibold text-black"
          >
            Pay Bill
          </Link>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Monthly Commitment</p>
            <h2 className="mt-2 text-2xl font-semibold">{formatCurrency(monthlyCommitment, "MYR")}</h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Overdue Total</p>
            <h2 className="mt-2 text-2xl font-semibold text-red-400">
              {formatCurrency(overdueTotal, "MYR")}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Due in 7 Days</p>
            <h2 className="mt-2 text-2xl font-semibold text-yellow-400">
              {formatCurrency(next7DaysTotal, "MYR")}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Due in 30 Days</p>
            <h2 className="mt-2 text-2xl font-semibold text-blue-400">
              {formatCurrency(next30DaysTotal, "MYR")}
            </h2>
          </div>
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
                placeholder="Enter bill amount"
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
              <label className="mb-2 block text-sm">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option>Utilities</option>
                <option>Subscription</option>
                <option>Rent</option>
                <option>Insurance</option>
                <option>Loan</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Frequency</label>
              <select
                value={frequency}
                onChange={(e) =>
                  setFrequency(
                    e.target.value as "weekly" | "monthly" | "quarterly" | "bi-yearly" | "yearly"
                  )
                }
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="bi-yearly">Bi-yearly</option>
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
              <label className="mb-2 block text-sm">Linked Wallet</label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option value="">Not linked</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.wallet_name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-3 text-sm text-white">
              <input
                type="checkbox"
                checked={autoPay}
                onChange={(e) => setAutoPay(e.target.checked)}
              />
              Auto Pay
            </label>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Recurring Bill"}
            </button>
          </form>
        </div>

        {billAnalytics.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No recurring bills yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {billAnalytics.map((bill) => {
              const originalBill = bills.find((item) => item.id === bill.id);

              return (
                <div
                  key={bill.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-zinc-400">{bill.bill_name}</p>
                      <h2 className="mt-2 text-2xl font-semibold">
                        {formatCurrency(bill.amount, bill.currency)}
                      </h2>
                    </div>

                    <p className={`text-sm font-semibold ${getStatusClass(bill.status)}`}>
                      {bill.status}
                    </p>
                  </div>

                  <p className="mt-3 text-sm text-zinc-500">Category: {bill.category || "Other"}</p>
                  <p className="mt-2 text-sm text-zinc-500">Frequency: {bill.frequency}</p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Next Due Date: {bill.next_due_date || "Not set"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Last Paid Date: {bill.last_paid_date || "Not paid yet"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Linked Wallet: {getWalletName(originalBill?.wallet_id || null)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Monthly Equivalent: {formatCurrency(bill.monthly_equivalent, bill.currency)}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Auto Pay: {originalBill?.auto_pay ? "Enabled" : "Disabled"}
                  </p>

                  <div className="mt-6 flex gap-4">
                    <Link
                      href={`/add-transaction?action=recurring_bill_payment&billId=${bill.id}`}
                      className="text-white hover:text-zinc-300"
                    >
                      Pay Bill
                    </Link>

                    <button
                      onClick={() => handleStartEdit(originalBill as RecurringBill)}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteBill(bill.id)}
                      disabled={deletingId === bill.id}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {deletingId === bill.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {editingId && (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Edit Recurring Bill</h2>

            <form className="space-y-4" onSubmit={handleUpdateBill}>
              <div>
                <label className="mb-2 block text-sm">Bill Name</label>
                <input
                  type="text"
                  value={editBillName}
                  onChange={(e) => setEditBillName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Amount</label>
                <input
                  type="number"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
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
                <label className="mb-2 block text-sm">Category</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option>Utilities</option>
                  <option>Subscription</option>
                  <option>Rent</option>
                  <option>Insurance</option>
                  <option>Loan</option>
                  <option>Other</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">Frequency</label>
                <select
                  value={editFrequency}
                  onChange={(e) =>
                    setEditFrequency(
                      e.target.value as "weekly" | "monthly" | "quarterly" | "bi-yearly" | "yearly"
                    )
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="bi-yearly">Bi-yearly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm">Next Due Date</label>
                <input
                  type="date"
                  value={editNextDueDate}
                  onChange={(e) => setEditNextDueDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Linked Wallet</label>
                <select
                  value={editWalletId}
                  onChange={(e) => setEditWalletId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                >
                  <option value="">Not linked</option>
                  {wallets.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.wallet_name}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={editAutoPay}
                  onChange={(e) => setEditAutoPay(e.target.checked)}
                />
                Auto Pay
              </label>

              <label className="flex items-center gap-3 text-sm text-white">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={(e) => setEditIsActive(e.target.checked)}
                />
                Active
              </label>

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