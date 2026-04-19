import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-zinc-400">
              Premium Finance Tracker
            </p>

            <h1 className="text-5xl font-bold leading-tight md:text-6xl">
              Track your money with clarity and control
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-zinc-400">
              A premium personal finance tracker to manage expenses, income,
              budgets, savings goals, debts, and recurring bills across web and
              mobile.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="rounded-full bg-white px-6 py-3 font-semibold text-black"
              >
                Get Started
              </Link>

              <Link
                href="/login"
                className="rounded-full border border-zinc-700 px-6 py-3 font-semibold text-white"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10">
            <h2 className="text-3xl font-bold">Core Features</h2>
            <p className="mt-2 text-zinc-400">
              Built for everyday money tracking with a premium user experience.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-xl font-semibold">Transactions</h3>
              <p className="mt-3 text-sm text-zinc-400">
                Record income and expenses with categories, wallets, notes, and dates.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-xl font-semibold">Budgets</h3>
              <p className="mt-3 text-sm text-zinc-400">
                Set category-based spending limits and monitor your progress.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-xl font-semibold">Wallets</h3>
              <p className="mt-3 text-sm text-zinc-400">
                Track balances across cash, bank accounts, e-wallets, and cards.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-xl font-semibold">Savings Goals</h3>
              <p className="mt-3 text-sm text-zinc-400">
                Set financial goals and measure progress toward each target.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-xl font-semibold">Debt Tracking</h3>
              <p className="mt-3 text-sm text-zinc-400">
                Monitor loans, repayments, and outstanding balances in one place.
              </p>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-xl font-semibold">Recurring Bills</h3>
              <p className="mt-3 text-sm text-zinc-400">
                Keep up with repeated payments and upcoming due dates.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-900 px-6 py-16">
        <div className="mx-auto max-w-6xl rounded-3xl border border-zinc-800 bg-zinc-950 p-8 md:p-12">
          <h2 className="text-3xl font-bold">Simple, premium, and built for daily use</h2>
          <p className="mt-4 max-w-2xl text-zinc-400">
            Designed to be easy for users, useful for retention, and ready to grow
            into a premium subscription product.
          </p>

          <div className="mt-8">
            <Link
              href="/signup"
              className="rounded-full bg-white px-6 py-3 font-semibold text-black"
            >
              Create Account
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}