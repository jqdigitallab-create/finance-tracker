"use client";

import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function Home() {
  async function testSupabaseConnection() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      alert("Supabase connection failed.");
      console.error(error);
      return;
    }

    console.log("Supabase connected:", data);
    alert("Supabase connection works.");
  }

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

              <button
                onClick={testSupabaseConnection}
                className="rounded-full border border-zinc-700 px-6 py-3 font-semibold text-white"
              >
                Test Supabase
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}