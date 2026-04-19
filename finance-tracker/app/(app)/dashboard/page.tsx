export default function DashboardPage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-10">
          <h1 className="text-4xl font-bold">Dashboard</h1>
          <p className="mt-2 text-zinc-400">
            Welcome back. Here is your financial overview.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Balance</p>
            <h2 className="mt-2 text-2xl font-semibold">RM 12,450.00</h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Income</p>
            <h2 className="mt-2 text-2xl font-semibold">RM 8,200.00</h2>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
            <p className="text-sm text-zinc-400">Total Expenses</p>
            <h2 className="mt-2 text-2xl font-semibold">RM 3,750.00</h2>
          </div>
        </div>
      </div>
    </div>
  );
}