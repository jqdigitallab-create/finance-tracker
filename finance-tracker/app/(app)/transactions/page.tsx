"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Transaction = {
  id: string;
  title: string;
  transaction_type: string;
  category: string;
  amount: number;
  currency: string | null;
  transaction_date: string;
  wallet_id: string;
};

type Wallet = {
  id: string;
  wallet_name: string;
};

type TransactionWithWalletName = Transaction & {
  wallet_name: string;
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionWithWalletName[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getTransactions() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select(
          "id, title, transaction_type, category, amount, currency, transaction_date, wallet_id"
        )
        .eq("user_id", user.id)
        .order("transaction_date", { ascending: false });

      if (transactionError || !transactionData) {
        console.error("Transaction query error:", transactionError);
        setLoading(false);
        return;
      }

      const { data: walletData, error: walletError } = await supabase
        .from("wallets")
        .select("id, wallet_name")
        .eq("user_id", user.id);

      if (walletError || !walletData) {
        console.error("Wallet query error:", walletError);
        setLoading(false);
        return;
      }

      const walletMap = new Map<string, string>();
      (walletData as Wallet[]).forEach((wallet) => {
        walletMap.set(wallet.id, wallet.wallet_name);
      });

      const formattedTransactions: TransactionWithWalletName[] = (
        transactionData as Transaction[]
      ).map((transaction) => ({
        ...transaction,
        amount: Number(transaction.amount),
        wallet_name: walletMap.get(transaction.wallet_id) || "Unknown Wallet",
      }));

      setTransactions(formattedTransactions);
      setLoading(false);
    }

    getTransactions();
  }, []);

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl text-zinc-400">
          Loading transactions...
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Transactions</h1>
          <p className="mt-2 text-zinc-400">
            View all your income and expense records.
          </p>
        </div>

        <div className="mb-6">
          <Link
            href="/add-transaction"
            className="inline-block rounded-full bg-white px-5 py-3 font-semibold text-black"
          >
            Add Transaction
          </Link>
        </div>

        {transactions.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
            No transactions yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
            <div className="grid grid-cols-6 gap-4 border-b border-zinc-800 px-6 py-4 text-sm font-medium text-zinc-400">
              <div>Title</div>
              <div>Type</div>
              <div>Category</div>
              <div>Wallet</div>
              <div>Date</div>
              <div className="text-right">Amount</div>
            </div>

            {transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="grid grid-cols-6 gap-4 border-b border-zinc-900 px-6 py-4 text-sm"
              >
                <div>{transaction.title}</div>
                <div
                  className={
                    transaction.transaction_type === "income"
                      ? "text-green-400"
                      : "text-red-400"
                  }
                >
                  {transaction.transaction_type}
                </div>
                <div>{transaction.category}</div>
                <div>{transaction.wallet_name}</div>
                <div>{transaction.transaction_date}</div>
                <div className="text-right font-medium">
                  {(transaction.currency || "MYR")}{" "}
                  {Number(transaction.amount || 0).toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}