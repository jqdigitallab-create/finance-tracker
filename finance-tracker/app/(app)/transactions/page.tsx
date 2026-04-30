"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { recalculateWalletBalance } from "@/lib/recalculateWalletBalance";
import { formatCurrency } from "@/lib/formatCurrency";
import {
  deleteTransfer,
  getErrorMessage,
  updateTransfer,
} from "@/lib/transferHelpers";
import {
  CategoryRecord,
  ensureDefaultCategories,
  fetchUserCategories,
  findCategoryByName,
} from "@/lib/categoryHelpers";
import {
  SubcategoryRecord,
  ensureDefaultSubcategories,
  fetchUserSubcategories,
  findSubcategoryByName,
} from "@/lib/subcategoryHelpers";

type Transaction = {
  id: string;
  title: string;
  transaction_type: string;
  category: string;
  category_id?: string | null;
  subcategory?: string | null;
  subcategory_id?: string | null;
  amount: number;
  currency: string | null;
  transaction_date: string;
  wallet_id: string;
  note?: string | null;
};

type Wallet = {
  id: string;
  wallet_name: string;
};

type LinkedSavingsContribution = {
  id: string;
  linked_transaction_id: string | null;
  savings_goal_id: string;
  amount: number;
};

type LinkedDebtRepayment = {
  id: string;
  linked_transaction_id: string | null;
  debt_id: string;
  amount: number;
};

type LinkedRecurringBill = {
  id: string;
  linked_transaction_id: string | null;
  next_due_date: string | null;
  last_paid_date: string | null;
  frequency: "weekly" | "monthly" | "quarterly" | "bi-yearly" | "yearly";
};

type LinkedTransfer = {
  id: string;
  outgoing_transaction_id: string | null;
  incoming_transaction_id: string | null;
  from_wallet_id: string;
  to_wallet_id: string;
};

type TransactionDisplayType =
  | "Income"
  | "Expense"
  | "Transfer"
  | "Saving"
  | "Debt Repayment"
  | "Recurring Bill Payment";

type TransactionWithWalletName = Transaction & {
  wallet_name: string;
  display_type: TransactionDisplayType;
  transfer_direction: "out" | "in" | null;
  linked_transfer_id: string | null;
  linked_transfer_from_wallet_id: string | null;
  linked_transfer_to_wallet_id: string | null;
  linked_savings_contribution_id: string | null;
  linked_savings_goal_id: string | null;
  linked_debt_repayment_id: string | null;
  linked_debt_id: string | null;
  linked_recurring_bill_id: string | null;
  linked_recurring_bill_next_due_date: string | null;
  linked_recurring_bill_last_paid_date: string | null;
  linked_recurring_bill_frequency:
    | "weekly"
    | "monthly"
    | "quarterly"
    | "bi-yearly"
    | "yearly"
    | null;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function addNextDueDate(
  dateString: string,
  frequency: "weekly" | "monthly" | "quarterly" | "bi-yearly" | "yearly"
) {
  const date = new Date(dateString);

  if (frequency === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (frequency === "monthly") {
    date.setMonth(date.getMonth() + 1);
  } else if (frequency === "quarterly") {
    date.setMonth(date.getMonth() + 3);
  } else if (frequency === "bi-yearly") {
    date.setMonth(date.getMonth() + 6);
  } else if (frequency === "yearly") {
    date.setFullYear(date.getFullYear() + 1);
  }

  return date.toISOString().split("T")[0];
}

function getTypeClass(displayType: TransactionDisplayType) {
  if (displayType === "Income") return "text-green-400";
  if (displayType === "Expense") return "text-red-400";
  if (displayType === "Transfer") return "text-cyan-400";
  if (displayType === "Saving") return "text-blue-400";
  if (displayType === "Debt Repayment") return "text-yellow-400";
  return "text-purple-400";
}

function getAmountPrefix(
  displayType: TransactionDisplayType,
  direction?: "out" | "in" | null
) {
  if (displayType === "Transfer") {
    return direction === "in" ? "+" : "-";
  }
  return displayType === "Income" ? "+" : "-";
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithWalletName[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [incomeCategories, setIncomeCategories] = useState<CategoryRecord[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<CategoryRecord[]>([]);
  const [incomeSubcategories, setIncomeSubcategories] = useState<SubcategoryRecord[]>([]);
  const [expenseSubcategories, setExpenseSubcategories] = useState<SubcategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] =
    useState<TransactionWithWalletName | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterWallet, setFilterWallet] = useState("all");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("expense");
  const [editCategory, setEditCategory] = useState("Food");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editWalletId, setEditWalletId] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editNote, setEditNote] = useState("");
  const [originalWalletId, setOriginalWalletId] = useState("");

  const [editTransferFromWalletId, setEditTransferFromWalletId] = useState("");
  const [editTransferToWalletId, setEditTransferToWalletId] = useState("");

  async function fetchTransactions() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    await ensureDefaultCategories(user.id);

    const [incomeCategoryRows, expenseCategoryRows] = await Promise.all([
      fetchUserCategories(user.id, "income"),
      fetchUserCategories(user.id, "expense"),
    ]);

    await ensureDefaultSubcategories(user.id, [
      ...incomeCategoryRows,
      ...expenseCategoryRows,
    ]);

    const [
      { data: transactionData, error: transactionError },
      { data: walletData, error: walletError },
      { data: savingsLinksData, error: savingsLinksError },
      { data: debtLinksData, error: debtLinksError },
      { data: recurringBillLinksData, error: recurringBillLinksError },
      { data: transferLinksData, error: transferLinksError },
      allSubcategories,
    ] = await Promise.all([
      supabase
        .from("transactions")
        .select(
          "id, title, transaction_type, category, category_id, subcategory, subcategory_id, amount, currency, transaction_date, wallet_id, note"
        )
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false }),
      supabase.from("wallets").select("id, wallet_name").eq("user_id", user.id),
      supabase
        .from("savings_goal_contributions")
        .select("id, linked_transaction_id, savings_goal_id, amount")
        .eq("user_id", user.id),
      supabase
        .from("debt_repayments")
        .select("id, linked_transaction_id, debt_id, amount")
        .eq("user_id", user.id),
      supabase
        .from("recurring_bills")
        .select("id, linked_transaction_id, next_due_date, last_paid_date, frequency")
        .eq("user_id", user.id),
      supabase
        .from("transfers")
        .select(
          "id, outgoing_transaction_id, incoming_transaction_id, from_wallet_id, to_wallet_id"
        )
        .eq("user_id", user.id),
      fetchUserSubcategories(user.id, undefined),
    ]);

    if (transactionError || !transactionData) {
      console.error("Transaction query error:", transactionError);
      setLoading(false);
      return;
    }

    if (walletError || !walletData) {
      console.error("Wallet query error:", walletError);
      setLoading(false);
      return;
    }

    if (savingsLinksError || debtLinksError || recurringBillLinksError || transferLinksError) {
      console.error(
        savingsLinksError || debtLinksError || recurringBillLinksError || transferLinksError
      );
      setLoading(false);
      return;
    }

    const walletRows = (walletData ?? []) as Wallet[];
    setWallets(walletRows);
    setIncomeCategories(incomeCategoryRows);
    setExpenseCategories(expenseCategoryRows);
    setIncomeSubcategories(
      allSubcategories.filter((item) =>
        incomeCategoryRows.some((category) => category.id === item.category_id)
      )
    );
    setExpenseSubcategories(
      allSubcategories.filter((item) =>
        expenseCategoryRows.some((category) => category.id === item.category_id)
      )
    );

    const walletMap = new Map<string, string>();
    walletRows.forEach((wallet) => {
      walletMap.set(wallet.id, wallet.wallet_name);
    });

    const savingsMap = new Map<string, LinkedSavingsContribution>();
    ((savingsLinksData ?? []) as LinkedSavingsContribution[]).forEach((item) => {
      if (item.linked_transaction_id) savingsMap.set(item.linked_transaction_id, item);
    });

    const debtMap = new Map<string, LinkedDebtRepayment>();
    ((debtLinksData ?? []) as LinkedDebtRepayment[]).forEach((item) => {
      if (item.linked_transaction_id) debtMap.set(item.linked_transaction_id, item);
    });

    const recurringBillMap = new Map<string, LinkedRecurringBill>();
    ((recurringBillLinksData ?? []) as LinkedRecurringBill[]).forEach((item) => {
      if (item.linked_transaction_id) recurringBillMap.set(item.linked_transaction_id, item);
    });

    const transferMap = new Map<
      string,
      {
        transfer: LinkedTransfer;
        direction: "out" | "in";
      }
    >();

    ((transferLinksData ?? []) as LinkedTransfer[]).forEach((item) => {
      if (item.outgoing_transaction_id) {
        transferMap.set(item.outgoing_transaction_id, {
          transfer: item,
          direction: "out",
        });
      }
      if (item.incoming_transaction_id) {
        transferMap.set(item.incoming_transaction_id, {
          transfer: item,
          direction: "in",
        });
      }
    });

    const formattedTransactions: TransactionWithWalletName[] = (
      transactionData as Transaction[]
    ).map((transaction) => {
      const savingsLink = savingsMap.get(transaction.id);
      const debtLink = debtMap.get(transaction.id);
      const recurringBillLink = recurringBillMap.get(transaction.id);
      const transferLink = transferMap.get(transaction.id);

      let displayType: TransactionDisplayType =
        transaction.transaction_type === "income" ? "Income" : "Expense";

      if (transferLink) {
        displayType = "Transfer";
      } else if (savingsLink) {
        displayType = "Saving";
      } else if (debtLink) {
        displayType = "Debt Repayment";
      } else if (recurringBillLink) {
        displayType = "Recurring Bill Payment";
      }

      return {
        ...transaction,
        amount: Number(transaction.amount),
        wallet_name: walletMap.get(transaction.wallet_id) || "Unknown Wallet",
        display_type: displayType,
        transfer_direction: transferLink?.direction || null,
        linked_transfer_id: transferLink?.transfer.id || null,
        linked_transfer_from_wallet_id: transferLink?.transfer.from_wallet_id || null,
        linked_transfer_to_wallet_id: transferLink?.transfer.to_wallet_id || null,
        linked_savings_contribution_id: savingsLink?.id || null,
        linked_savings_goal_id: savingsLink?.savings_goal_id || null,
        linked_debt_repayment_id: debtLink?.id || null,
        linked_debt_id: debtLink?.debt_id || null,
        linked_recurring_bill_id: recurringBillLink?.id || null,
        linked_recurring_bill_next_due_date: recurringBillLink?.next_due_date || null,
        linked_recurring_bill_last_paid_date: recurringBillLink?.last_paid_date || null,
        linked_recurring_bill_frequency: recurringBillLink?.frequency || null,
      };
    });

    setTransactions(formattedTransactions);
    setLoading(false);
  }

  useEffect(() => {
    fetchTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesSearch =
        transaction.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.note || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.subcategory || "").toLowerCase().includes(searchTerm.toLowerCase());

      const matchesType =
        filterType === "all" ||
        transaction.display_type.toLowerCase() === filterType.toLowerCase();

      const matchesCategory =
        filterCategory === "all" || transaction.category === filterCategory;

      const matchesWallet =
        filterWallet === "all" || transaction.wallet_id === filterWallet;

      const matchesStartDate =
        !filterStartDate || transaction.transaction_date >= filterStartDate;

      const matchesEndDate =
        !filterEndDate || transaction.transaction_date <= filterEndDate;

      return (
        matchesSearch &&
        matchesType &&
        matchesCategory &&
        matchesWallet &&
        matchesStartDate &&
        matchesEndDate
      );
    });
  }, [
    transactions,
    searchTerm,
    filterType,
    filterCategory,
    filterWallet,
    filterStartDate,
    filterEndDate,
  ]);

  const uniqueCategories = Array.from(
    new Set(transactions.map((transaction) => transaction.category))
  ).sort((a, b) => a.localeCompare(b));

  const editSubcategoryOptions = useMemo(() => {
    const selectedCategory =
      editType === "income"
        ? findCategoryByName(incomeCategories, editCategory)
        : findCategoryByName(expenseCategories, editCategory);

    if (!selectedCategory) return [];

    const source = editType === "income" ? incomeSubcategories : expenseSubcategories;
    return source.filter((item) => item.category_id === selectedCategory.id);
  }, [
    editType,
    editCategory,
    incomeCategories,
    expenseCategories,
    incomeSubcategories,
    expenseSubcategories,
  ]);

  useEffect(() => {
    if (!editingTransaction || editingTransaction.display_type === "Transfer") return;

    if (editSubcategoryOptions.length === 0) {
      setEditSubcategory("");
      return;
    }

    const exists = editSubcategoryOptions.some((item) => item.name === editSubcategory);
    if (!exists) {
      setEditSubcategory(editSubcategoryOptions[0].name);
    }
  }, [editSubcategoryOptions, editSubcategory, editingTransaction]);

  function handleResetFilters() {
    setSearchTerm("");
    setFilterType("all");
    setFilterCategory("all");
    setFilterWallet("all");
    setFilterStartDate("");
    setFilterEndDate("");
  }

  async function syncSavingDelete(transaction: TransactionWithWalletName) {
    if (
      !transaction.linked_savings_contribution_id ||
      !transaction.linked_savings_goal_id
    ) {
      return;
    }

    const { data: goalData, error: goalError } = await supabase
      .from("savings_goals")
      .select("current_amount")
      .eq("id", transaction.linked_savings_goal_id)
      .single();

    if (goalError || !goalData) {
      throw goalError || new Error("Failed to load savings goal.");
    }

    const currentAmount = Number(goalData.current_amount || 0);
    const newCurrentAmount = Math.max(0, currentAmount - Number(transaction.amount || 0));

    const { error: goalUpdateError } = await supabase
      .from("savings_goals")
      .update({
        current_amount: newCurrentAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.linked_savings_goal_id);

    if (goalUpdateError) throw goalUpdateError;

    const { error: deleteContributionError } = await supabase
      .from("savings_goal_contributions")
      .delete()
      .eq("id", transaction.linked_savings_contribution_id);

    if (deleteContributionError) throw deleteContributionError;
  }

  async function syncDebtDelete(transaction: TransactionWithWalletName) {
    if (!transaction.linked_debt_repayment_id || !transaction.linked_debt_id) {
      return;
    }

    const { data: debtData, error: debtError } = await supabase
      .from("debts")
      .select("remaining_amount, total_amount")
      .eq("id", transaction.linked_debt_id)
      .single();

    if (debtError || !debtData) {
      throw debtError || new Error("Failed to load debt.");
    }

    const currentRemaining = Number(debtData.remaining_amount || 0);
    const totalAmount = Number(debtData.total_amount || 0);
    const newRemainingAmount = clamp(
      currentRemaining + Number(transaction.amount || 0),
      0,
      totalAmount
    );

    const { error: debtUpdateError } = await supabase
      .from("debts")
      .update({
        remaining_amount: newRemainingAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.linked_debt_id);

    if (debtUpdateError) throw debtUpdateError;

    const { error: deleteRepaymentError } = await supabase
      .from("debt_repayments")
      .delete()
      .eq("id", transaction.linked_debt_repayment_id);

    if (deleteRepaymentError) throw deleteRepaymentError;
  }

  async function syncRecurringBillDelete(transaction: TransactionWithWalletName) {
    if (!transaction.linked_recurring_bill_id) {
      return;
    }

    const { error: recurringBillUpdateError } = await supabase
      .from("recurring_bills")
      .update({
        linked_transaction_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.linked_recurring_bill_id);

    if (recurringBillUpdateError) throw recurringBillUpdateError;
  }

  async function handleDeleteTransaction(transaction: TransactionWithWalletName) {
    const confirmed = window.confirm("Delete this transaction?");
    if (!confirmed) return;

    setDeletingId(transaction.id);

    try {
      if (transaction.display_type === "Transfer" && transaction.linked_transfer_id) {
        await deleteTransfer(transaction.linked_transfer_id);
        await fetchTransactions();
        setDeletingId(null);
        return;
      }

      if (transaction.display_type === "Saving") {
        await syncSavingDelete(transaction);
      }

      if (transaction.display_type === "Debt Repayment") {
        await syncDebtDelete(transaction);
      }

      if (transaction.display_type === "Recurring Bill Payment") {
        await syncRecurringBillDelete(transaction);
      }

      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transaction.id);

      if (error) throw error;

      await recalculateWalletBalance(transaction.wallet_id);
      await fetchTransactions();
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setDeletingId(null);
  }

  function handleStartEdit(transaction: TransactionWithWalletName) {
    setEditingId(transaction.id);
    setEditingTransaction(transaction);
    setEditTitle(transaction.title);
    setEditType(transaction.transaction_type);
    setEditCategory(transaction.category);
    setEditSubcategory(transaction.subcategory || "");
    setEditAmount(String(transaction.amount));
    setEditWalletId(transaction.wallet_id);
    setEditDate(transaction.transaction_date);
    setEditNote(transaction.note || "");
    setOriginalWalletId(transaction.wallet_id);

    if (transaction.display_type === "Transfer") {
      setEditTransferFromWalletId(transaction.linked_transfer_from_wallet_id || "");
      setEditTransferToWalletId(transaction.linked_transfer_to_wallet_id || "");
    } else {
      setEditTransferFromWalletId("");
      setEditTransferToWalletId("");
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditingTransaction(null);
    setEditTitle("");
    setEditType("expense");
    setEditCategory(expenseCategories[0]?.name || "Food");
    setEditSubcategory("");
    setEditAmount("");
    setEditWalletId("");
    setEditDate("");
    setEditNote("");
    setOriginalWalletId("");
    setEditTransferFromWalletId("");
    setEditTransferToWalletId("");
  }

  async function syncSavingUpdate(
    transaction: TransactionWithWalletName,
    newAmount: number
  ) {
    if (
      !transaction.linked_savings_contribution_id ||
      !transaction.linked_savings_goal_id
    ) {
      return;
    }

    const oldAmount = Number(transaction.amount || 0);
    const delta = newAmount - oldAmount;

    const { data: goalData, error: goalError } = await supabase
      .from("savings_goals")
      .select("current_amount")
      .eq("id", transaction.linked_savings_goal_id)
      .single();

    if (goalError || !goalData) {
      throw goalError || new Error("Failed to load savings goal.");
    }

    const currentAmount = Number(goalData.current_amount || 0);
    const newCurrentAmount = Math.max(0, currentAmount + delta);

    const { error: contributionUpdateError } = await supabase
      .from("savings_goal_contributions")
      .update({
        wallet_id: editWalletId,
        amount: newAmount,
        contribution_date: editDate,
        note: editNote.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.linked_savings_contribution_id);

    if (contributionUpdateError) throw contributionUpdateError;

    const { error: goalUpdateError } = await supabase
      .from("savings_goals")
      .update({
        current_amount: newCurrentAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.linked_savings_goal_id);

    if (goalUpdateError) throw goalUpdateError;
  }

  async function syncDebtUpdate(
    transaction: TransactionWithWalletName,
    newAmount: number
  ) {
    if (!transaction.linked_debt_repayment_id || !transaction.linked_debt_id) {
      return;
    }

    const oldAmount = Number(transaction.amount || 0);
    const delta = newAmount - oldAmount;

    const { data: debtData, error: debtError } = await supabase
      .from("debts")
      .select("remaining_amount, total_amount")
      .eq("id", transaction.linked_debt_id)
      .single();

    if (debtError || !debtData) {
      throw debtError || new Error("Failed to load debt.");
    }

    const currentRemaining = Number(debtData.remaining_amount || 0);
    const totalAmount = Number(debtData.total_amount || 0);
    const newRemainingAmount = clamp(currentRemaining - delta, 0, totalAmount);

    const { error: repaymentUpdateError } = await supabase
      .from("debt_repayments")
      .update({
        wallet_id: editWalletId,
        amount: newAmount,
        repayment_date: editDate,
        note: editNote.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.linked_debt_repayment_id);

    if (repaymentUpdateError) throw repaymentUpdateError;

    const { error: debtUpdateError } = await supabase
      .from("debts")
      .update({
        remaining_amount: newRemainingAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.linked_debt_id);

    if (debtUpdateError) throw debtUpdateError;
  }

  async function syncRecurringBillUpdate(transaction: TransactionWithWalletName) {
    if (
      !transaction.linked_recurring_bill_id ||
      !transaction.linked_recurring_bill_frequency
    ) {
      return;
    }

    const recalculatedNextDueDate = addNextDueDate(
      editDate,
      transaction.linked_recurring_bill_frequency
    );

    const { error: recurringBillUpdateError } = await supabase
      .from("recurring_bills")
      .update({
        linked_transaction_id: transaction.id,
        last_paid_date: editDate,
        next_due_date: recalculatedNextDueDate,
        wallet_id: editWalletId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.linked_recurring_bill_id);

    if (recurringBillUpdateError) throw recurringBillUpdateError;
  }

  async function handleUpdateTransaction(e: React.FormEvent) {
    e.preventDefault();

    if (!editingId || !editingTransaction) return;

    if (!editAmount || Number(editAmount) <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    if (!editDate) {
      alert("Please select a date.");
      return;
    }

    setSavingEdit(true);

    try {
      if (
        editingTransaction.display_type === "Transfer" &&
        editingTransaction.linked_transfer_id
      ) {
        if (!editTransferFromWalletId) throw new Error("Please select source wallet.");
        if (!editTransferToWalletId) throw new Error("Please select destination wallet.");

        await updateTransfer({
          transferId: editingTransaction.linked_transfer_id,
          fromWalletId: editTransferFromWalletId,
          toWalletId: editTransferToWalletId,
          amount: Number(editAmount),
          transferDate: editDate,
          note: editNote,
        });

        await fetchTransactions();
        alert("Transfer updated successfully.");
        handleCancelEdit();
        setSavingEdit(false);
        return;
      }

      if (!editTitle.trim()) {
        throw new Error("Please enter a title.");
      }

      if (!editWalletId) {
        throw new Error("Please select a wallet.");
      }

      const newAmount = Number(editAmount);
      const isLinkedSaving = editingTransaction.display_type === "Saving";
      const isLinkedDebt = editingTransaction.display_type === "Debt Repayment";
      const isLinkedRecurringBill =
        editingTransaction.display_type === "Recurring Bill Payment";

      const finalTransactionType =
        isLinkedSaving || isLinkedDebt || isLinkedRecurringBill ? "expense" : editType;

      const finalCategory = isLinkedSaving
        ? "Savings"
        : isLinkedDebt
        ? "Debt"
        : editCategory;

      const selectedCategory =
        finalTransactionType === "income"
          ? findCategoryByName(incomeCategories, finalCategory)
          : findCategoryByName(expenseCategories, finalCategory);

      const selectedSubcategory =
        finalTransactionType === "income"
          ? findSubcategoryByName(incomeSubcategories, editSubcategory)
          : findSubcategoryByName(expenseSubcategories, editSubcategory);

      const finalCategoryId =
        isLinkedSaving || isLinkedDebt || editingTransaction.display_type === "Transfer"
          ? null
          : selectedCategory?.id || null;

      const finalSubcategoryValue =
        isLinkedSaving ||
        isLinkedDebt ||
        isLinkedRecurringBill ||
        editingTransaction.display_type === "Transfer"
          ? null
          : editSubcategory || null;

      const finalSubcategoryId =
        isLinkedSaving ||
        isLinkedDebt ||
        isLinkedRecurringBill ||
        editingTransaction.display_type === "Transfer"
          ? null
          : selectedSubcategory?.id || null;

      const { error } = await supabase
        .from("transactions")
        .update({
          title: editTitle.trim(),
          transaction_type: finalTransactionType,
          category: finalCategory,
          category_id: finalCategoryId,
          subcategory: finalSubcategoryValue,
          subcategory_id: finalSubcategoryId,
          amount: newAmount,
          wallet_id: editWalletId,
          transaction_date: editDate,
          note: editNote.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) throw error;

      if (isLinkedSaving) {
        await syncSavingUpdate(editingTransaction, newAmount);
      }

      if (isLinkedDebt) {
        await syncDebtUpdate(editingTransaction, newAmount);
      }

      if (isLinkedRecurringBill) {
        await syncRecurringBillUpdate(editingTransaction);
      }

      if (originalWalletId) {
        await recalculateWalletBalance(originalWalletId);
      }

      if (editWalletId !== originalWalletId) {
        await recalculateWalletBalance(editWalletId);
      }

      await fetchTransactions();
      alert("Transaction updated successfully.");
      handleCancelEdit();
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSavingEdit(false);
  }

  const editingLinkedSaving = editingTransaction?.display_type === "Saving";
  const editingLinkedDebt = editingTransaction?.display_type === "Debt Repayment";
  const editingLinkedRecurringBill =
    editingTransaction?.display_type === "Recurring Bill Payment";
  const editingTransfer = editingTransaction?.display_type === "Transfer";
  const editCategoryOptions = editType === "income" ? incomeCategories : expenseCategories;

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-7xl text-zinc-400">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Transactions</h1>
            <p className="mt-2 text-zinc-400">
              View, filter, and manage all transaction records across the app.
            </p>
          </div>

          <Link
            href="/add-transaction"
            className="inline-block rounded-full bg-white px-5 py-3 font-semibold text-black"
          >
            Add Transaction
          </Link>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <p className="text-sm text-zinc-400">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </p>

          <button
            onClick={handleResetFilters}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-900"
          >
            Reset Filters
          </button>
        </div>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-2 block text-sm">Search</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search title, note, or subcategory"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option value="all">All</option>
                <option value="income">Income</option>
                <option value="expense">Expense</option>
                <option value="transfer">Transfer</option>
                <option value="saving">Saving</option>
                <option value="debt repayment">Debt Repayment</option>
                <option value="recurring bill payment">Recurring Bill Payment</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Category</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option value="all">All</option>
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Wallet</label>
              <select
                value={filterWallet}
                onChange={(e) => setFilterWallet(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option value="all">All</option>
                {wallets.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.wallet_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No matching transactions found.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-lg font-semibold">{transaction.title}</h3>
                      <span
                        className={`rounded-full border border-zinc-700 px-3 py-1 text-xs font-medium ${getTypeClass(
                          transaction.display_type
                        )}`}
                      >
                        {transaction.display_type}
                      </span>
                    </div>

                    <div className="mt-3 grid gap-2 text-sm text-zinc-400 md:grid-cols-2">
                      <p>Category: {transaction.category}</p>
                      <p>Subcategory: {transaction.subcategory || "-"}</p>
                      <p>Wallet: {transaction.wallet_name}</p>
                      <p>Date: {transaction.transaction_date}</p>
                      <p>Currency: {transaction.currency || "MYR"}</p>
                      {transaction.display_type === "Transfer" ? (
                        <>
                          <p>
                            From:{" "}
                            {wallets.find((w) => w.id === transaction.linked_transfer_from_wallet_id)
                              ?.wallet_name || "Unknown"}
                          </p>
                          <p>
                            To:{" "}
                            {wallets.find((w) => w.id === transaction.linked_transfer_to_wallet_id)
                              ?.wallet_name || "Unknown"}
                          </p>
                        </>
                      ) : null}
                    </div>

                    {transaction.note ? (
                      <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-500">Note</p>
                        <p className="mt-1 text-sm text-zinc-300">{transaction.note}</p>
                      </div>
                    ) : null}
                  </div>

                  <div className="md:w-56 md:text-right">
                    <p className={`text-2xl font-semibold ${getTypeClass(transaction.display_type)}`}>
                      {getAmountPrefix(transaction.display_type, transaction.transfer_direction)}
                      {formatCurrency(transaction.amount, transaction.currency || "MYR")}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-4 md:justify-end">
                      <button
                        onClick={() => handleStartEdit(transaction)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDeleteTransaction(transaction)}
                        disabled={deletingId === transaction.id}
                        className="text-red-400 hover:text-red-300 disabled:opacity-50"
                      >
                        {deletingId === transaction.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {editingId && editingTransaction && (
          <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <h2 className="mb-4 text-2xl font-semibold">Edit Transaction</h2>

            {(editingLinkedSaving ||
              editingLinkedDebt ||
              editingLinkedRecurringBill ||
              editingTransfer) && (
              <div className="mb-4 rounded-xl border border-zinc-700 bg-zinc-900/60 p-4 text-sm text-zinc-400">
                {editingTransfer
                  ? "This is a linked transfer. Editing it will update both transfer sides and both wallet balances."
                  : `This is a linked ${
                      editingLinkedSaving
                        ? "saving"
                        : editingLinkedDebt
                        ? "debt repayment"
                        : "recurring bill payment"
                    } transaction.`}
              </div>
            )}

            <form className="space-y-4" onSubmit={handleUpdateTransaction}>
              {editingTransfer ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm">From Wallet</label>
                    <select
                      value={editTransferFromWalletId}
                      onChange={(e) => setEditTransferFromWalletId(e.target.value)}
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
                    <label className="mb-2 block text-sm">To Wallet</label>
                    <select
                      value={editTransferToWalletId}
                      onChange={(e) => setEditTransferToWalletId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                    >
                      {wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.wallet_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="mb-2 block text-sm">Transaction Type</label>
                    <select
                      value={
                        editingLinkedSaving || editingLinkedDebt || editingLinkedRecurringBill
                          ? "expense"
                          : editType
                      }
                      onChange={(e) => setEditType(e.target.value)}
                      disabled={
                        editingLinkedSaving || editingLinkedDebt || editingLinkedRecurringBill
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none disabled:opacity-60"
                    >
                      <option value="income">Income</option>
                      <option value="expense">Expense</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm">Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm">Category</label>
                    <select
                      value={
                        editingLinkedSaving
                          ? "Savings"
                          : editingLinkedDebt
                          ? "Debt"
                          : editCategory
                      }
                      onChange={(e) => setEditCategory(e.target.value)}
                      disabled={editingLinkedSaving || editingLinkedDebt}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none disabled:opacity-60"
                    >
                      {editingLinkedSaving || editingLinkedDebt ? (
                        <>
                          <option>{editingLinkedSaving ? "Savings" : "Debt"}</option>
                        </>
                      ) : (
                        editCategoryOptions.map((item) => (
                          <option key={item.id} value={item.name}>
                            {item.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm">Subcategory</label>
                    <select
                      value={editSubcategory}
                      onChange={(e) => setEditSubcategory(e.target.value)}
                      disabled={
                        editingLinkedSaving ||
                        editingLinkedDebt ||
                        editSubcategoryOptions.length === 0
                      }
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none disabled:opacity-60"
                    >
                      {editingLinkedSaving || editingLinkedDebt ? (
                        <option value="">No subcategory</option>
                      ) : editSubcategoryOptions.length === 0 ? (
                        <option value="">No subcategory available</option>
                      ) : (
                        editSubcategoryOptions.map((item) => (
                          <option key={item.id} value={item.name}>
                            {item.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm">Wallet</label>
                    <select
                      value={editWalletId}
                      onChange={(e) => setEditWalletId(e.target.value)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                    >
                      {wallets.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.wallet_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

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
                <label className="mb-2 block text-sm">Date</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Note</label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  rows={4}
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