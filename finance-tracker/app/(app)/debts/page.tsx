"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatCurrency } from "@/lib/formatCurrency";
import { getDebtAnalytics, DebtAnalytics } from "@/lib/goalDebtAnalytics";

type Debt = {
  id: string;
  debt_name: string;
  total_amount: number;
  remaining_amount: number;
  monthly_payment: number | null;
  interest_rate: number | null;
  due_date: string | null;
  last_paid_date: string | null;
};

type Wallet = {
  id: string;
  wallet_name: string;
};

type Repayment = {
  id: string;
  debt_id: string;
  wallet_id: string;
  linked_transaction_id: string | null;
  amount: number;
  repayment_date: string;
  note: string | null;
};

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

function getDebtStatus(debt: DebtAnalytics) {
  if (debt.remaining_amount <= 0) return "Completed";
  if (debt.days_left !== null && debt.days_left < 0) return "Overdue";
  if (debt.days_left !== null && debt.days_left <= 30) return "Due Soon";
  return "On Track";
}

function getDebtStatusClass(status: string) {
  if (status === "Completed") return "text-green-400";
  if (status === "Overdue") return "text-red-400";
  if (status === "Due Soon") return "text-yellow-400";
  return "text-blue-400";
}

export default function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [debtAnalytics, setDebtAnalytics] = useState<DebtAnalytics[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [debtName, setDebtName] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [remainingAmount, setRemainingAmount] = useState("");
  const [monthlyPayment, setMonthlyPayment] = useState("");
  const [interestRate, setInterestRate] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [editDebtName, setEditDebtName] = useState("");
  const [editTotalAmount, setEditTotalAmount] = useState("");
  const [editRemainingAmount, setEditRemainingAmount] = useState("");
  const [editMonthlyPayment, setEditMonthlyPayment] = useState("");
  const [editInterestRate, setEditInterestRate] = useState("");
  const [editDueDate, setEditDueDate] = useState("");

  async function fetchDebts() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    const [
      { data: debtsData, error: debtsError },
      { data: walletsData, error: walletsError },
      { data: repaymentsData, error: repaymentsError },
    ] = await Promise.all([
      supabase
        .from("debts")
        .select(
          "id, debt_name, total_amount, remaining_amount, monthly_payment, interest_rate, due_date, last_paid_date"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("wallets")
        .select("id, wallet_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("debt_repayments")
        .select(
          "id, debt_id, wallet_id, linked_transaction_id, amount, repayment_date, note"
        )
        .eq("user_id", user.id)
        .order("repayment_date", { ascending: false }),
    ]);

    if (debtsError || walletsError || repaymentsError) {
      console.error(debtsError || walletsError || repaymentsError);
      setLoading(false);
      return;
    }

    const debtRows = (debtsData ?? []) as Debt[];

    setDebts(debtRows);
    setWallets((walletsData ?? []) as Wallet[]);
    setRepayments((repaymentsData ?? []) as Repayment[]);
    setDebtAnalytics(getDebtAnalytics(debtRows));
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
      last_paid_date: null,
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

  function handleStartEdit(debt: Debt) {
    setEditingId(debt.id);
    setEditDebtName(debt.debt_name);
    setEditTotalAmount(String(debt.total_amount));
    setEditRemainingAmount(String(debt.remaining_amount));
    setEditMonthlyPayment(String(debt.monthly_payment || 0));
    setEditInterestRate(String(debt.interest_rate || 0));
    setEditDueDate(debt.due_date || "");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditDebtName("");
    setEditTotalAmount("");
    setEditRemainingAmount("");
    setEditMonthlyPayment("");
    setEditInterestRate("");
    setEditDueDate("");
  }

  async function handleUpdateDebt(e: React.FormEvent) {
    e.preventDefault();

    if (!editingId) return;

    if (!editDebtName.trim()) {
      alert("Please enter a debt name.");
      return;
    }

    if (!editTotalAmount || Number(editTotalAmount) <= 0) {
      alert("Please enter a valid total amount.");
      return;
    }

    if (!editRemainingAmount || Number(editRemainingAmount) < 0) {
      alert("Please enter a valid remaining amount.");
      return;
    }

    setSavingEdit(true);

    const { error } = await supabase
      .from("debts")
      .update({
        debt_name: editDebtName.trim(),
        total_amount: Number(editTotalAmount),
        remaining_amount: Number(editRemainingAmount),
        monthly_payment: Number(editMonthlyPayment || 0),
        interest_rate: Number(editInterestRate || 0),
        due_date: editDueDate || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", editingId);

    setSavingEdit(false);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    await fetchDebts();
    alert("Debt updated successfully.");
    handleCancelEdit();
  }

  async function handleDeleteDebt(debtId: string) {
    const confirmed = window.confirm("Delete this debt?");
    if (!confirmed) return;

    setDeletingId(debtId);

    const { error } = await supabase.from("debts").delete().eq("id", debtId);

    setDeletingId(null);

    if (error) {
      alert(getErrorMessage(error));
      return;
    }

    await fetchDebts();
    alert("Debt deleted successfully.");
  }

  function getWalletName(walletId: string) {
    return wallets.find((wallet) => wallet.id === walletId)?.wallet_name || "Unknown Wallet";
  }

  const totalDebt = useMemo(
    () => debtAnalytics.reduce((sum, item) => sum + item.total_amount, 0),
    [debtAnalytics]
  );

  const totalRemaining = useMemo(
    () => debtAnalytics.reduce((sum, item) => sum + item.remaining_amount, 0),
    [debtAnalytics]
  );

  const totalPaid = useMemo(
    () => debtAnalytics.reduce((sum, item) => sum + item.paid_amount, 0),
    [debtAnalytics]
  );

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
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Debts</h1>
            <p className="mt-2 text-zinc-400">
              Track payoff speed, next due cycle, and repayment history.
            </p>
          </div>

          <Link
            href="/add-transaction?action=debt_repayment"
            className="rounded-full bg-white px-5 py-3 font-semibold text-black"
          >
            Add Debt Repayment
          </Link>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Debt</p>
            <h2 className="mt-2 text-2xl font-semibold">{formatCurrency(totalDebt, "MYR")}</h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Remaining</p>
            <h2 className="mt-2 text-2xl font-semibold text-yellow-400">
              {formatCurrency(totalRemaining, "MYR")}
            </h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Paid</p>
            <h2 className="mt-2 text-2xl font-semibold text-green-400">
              {formatCurrency(totalPaid, "MYR")}
            </h2>
          </div>
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
              <label className="mb-2 block text-sm">Next Due Date</label>
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

        {debtAnalytics.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No debts yet.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {debtAnalytics.map((debt) => {
              const progressWidth = Math.min(debt.progress_percent, 100);
              const debtRepayments = repayments.filter((item) => item.debt_id === debt.id);
              const status = getDebtStatus(debt);

              return (
                <div
                  key={debt.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-zinc-400">{debt.debt_name}</p>
                      <h2 className="mt-2 text-2xl font-semibold">
                        {formatCurrency(debt.remaining_amount, "MYR")}
                      </h2>
                    </div>

                    <p className={`text-sm font-semibold ${getDebtStatusClass(status)}`}>
                      {status}
                    </p>
                  </div>

                  <p className="mt-3 text-sm text-zinc-500">
                    Total: {formatCurrency(debt.total_amount, "MYR")}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Paid: {formatCurrency(debt.paid_amount, "MYR")}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Monthly Payment: {formatCurrency(debt.monthly_payment || 0, "MYR")}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Next Due Date: {debt.due_date || "Not set"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Last Paid Date: {debt.last_paid_date || "Not paid yet"}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Months to Payoff:{" "}
                    {debt.estimated_months_to_payoff === null
                      ? "Unknown"
                      : debt.estimated_months_to_payoff}
                  </p>
                  <p className="mt-2 text-sm text-zinc-500">
                    Payoff Estimate: {debt.payoff_date_estimate || "Unknown"}
                  </p>

                  <div className="mt-4">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="text-zinc-400">Progress</span>
                      <span className="text-green-400">
                        {debt.progress_percent.toFixed(0)}%
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
                    <h3 className="mb-3 text-lg font-semibold">Repayment History</h3>

                    {debtRepayments.length === 0 ? (
                      <p className="text-sm text-zinc-400">No repayments yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {debtRepayments.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4"
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium">
                                {formatCurrency(item.amount, "MYR")}
                              </p>
                              <p className="text-sm text-zinc-500">
                                {item.repayment_date}
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
                      href={`/add-transaction?action=debt_repayment&debtId=${debt.id}`}
                      className="text-white hover:text-zinc-300"
                    >
                      Add Repayment
                    </Link>

                    <button
                      onClick={() =>
                        handleStartEdit(debts.find((item) => item.id === debt.id) as Debt)
                      }
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => handleDeleteDebt(debt.id)}
                      disabled={deletingId === debt.id}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {deletingId === debt.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {editingId && (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Edit Debt</h2>

            <form className="space-y-4" onSubmit={handleUpdateDebt}>
              <div>
                <label className="mb-2 block text-sm">Debt Name</label>
                <input
                  type="text"
                  value={editDebtName}
                  onChange={(e) => setEditDebtName(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Total Amount</label>
                <input
                  type="number"
                  value={editTotalAmount}
                  onChange={(e) => setEditTotalAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Remaining Amount</label>
                <input
                  type="number"
                  value={editRemainingAmount}
                  onChange={(e) => setEditRemainingAmount(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Monthly Payment</label>
                <input
                  type="number"
                  value={editMonthlyPayment}
                  onChange={(e) => setEditMonthlyPayment(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Interest Rate (%)</label>
                <input
                  type="number"
                  value={editInterestRate}
                  onChange={(e) => setEditInterestRate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Next Due Date</label>
                <input
                  type="date"
                  value={editDueDate}
                  onChange={(e) => setEditDueDate(e.target.value)}
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