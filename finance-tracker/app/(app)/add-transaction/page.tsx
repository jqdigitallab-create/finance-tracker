export default function AddTransactionPage() {
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
          <form className="space-y-5">
            <div>
              <label className="mb-2 block text-sm">Transaction Type</label>
              <select className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none">
                <option>Income</option>
                <option>Expense</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Title</label>
              <input
                type="text"
                placeholder="Enter transaction title"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Amount</label>
              <input
                type="number"
                placeholder="Enter amount"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Category</label>
              <select className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none">
                <option>Food</option>
                <option>Transport</option>
                <option>Salary</option>
                <option>Utilities</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Wallet</label>
              <select className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none">
                <option>Cash</option>
                <option>Maybank</option>
                <option>TNG eWallet</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Date</label>
              <input
                type="date"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Note</label>
              <textarea
                placeholder="Add note"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                rows={4}
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black"
            >
              Save Transaction
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}