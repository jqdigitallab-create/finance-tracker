import Link from "next/link";

export default function TransactionsPage() {
  const transactions = [
    {
      id: 1,
      title: "Salary",
      type: "income",
      category: "Income",
      wallet: "Maybank",
      date: "2026-04-01",
      amount: "RM 5,000.00",
    },
    {
      id: 2,
      title: "Groceries",
      type: "expense",
      category: "Food",
      wallet: "TNG eWallet",
      date: "2026-04-02",
      amount: "RM 120.00",
    },
    {
      id: 3,
      title: "Petrol",
      type: "expense",
      category: "Transport",
      wallet: "Cash",
      date: "2026-04-03",
      amount: "RM 80.00",
    },
  ];

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
                  transaction.type === "income" ? "text-green-400" : "text-red-400"
                }
              >
                {transaction.type}
              </div>
              <div>{transaction.category}</div>
              <div>{transaction.wallet}</div>
              <div>{transaction.date}</div>
              <div className="text-right font-medium">{transaction.amount}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}