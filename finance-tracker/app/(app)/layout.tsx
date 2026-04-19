"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import NavLink from "./nav-link";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="border-b border-zinc-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-bold">
            Finance Tracker
          </Link>

          <div className="flex items-center gap-6">
            <nav className="flex items-center gap-4 text-sm">
              <NavLink href="/dashboard">Dashboard</NavLink>
              <NavLink href="/transactions">Transactions</NavLink>
              <NavLink href="/wallets">Wallets</NavLink>
              <NavLink href="/budgets">Budgets</NavLink>
              <NavLink href="/settings">More</NavLink>
            </nav>

            <button
              onClick={() => router.push("/")}
              className="rounded-full border border-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-900"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {children}
    </main>
  );
}