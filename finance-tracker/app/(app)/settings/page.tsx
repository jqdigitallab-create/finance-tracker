"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const [fullName, setFullName] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("MYR");
  const [dateFormat, setDateFormat] = useState("DD/MM/YYYY");
  const [language, setLanguage] = useState("English");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleSaveSettings(e: React.FormEvent) {
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
  
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        default_currency: defaultCurrency,
        date_format: dateFormat,
        language,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);
  
    setSaving(false);
  
    if (error) {
      alert(error.message);
      return;
    }
  
    alert("Settings saved successfully.");
  }

  useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, default_currency, date_format, language")
        .eq("id", user.id)
        .single();

      if (!error && data) {
        setFullName(data.full_name || "");
        setDefaultCurrency(data.default_currency || "MYR");
        setDateFormat(data.date_format || "DD/MM/YYYY");
        setLanguage(data.language || "English");
      }

      setLoading(false);
    }

    getProfile();
  }, []);

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-3xl text-zinc-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Settings</h1>
          <p className="mt-2 text-zinc-400">
            Manage your profile and app preferences.
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <form className="space-y-5" onSubmit={handleSaveSettings}>
            <div>
              <label className="mb-2 block text-sm">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm">Default Currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option>MYR</option>
                <option>USD</option>
                <option>EUR</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option>DD/MM/YYYY</option>
                <option>MM/DD/YYYY</option>
                <option>YYYY-MM-DD</option>
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                <option>English</option>
                <option>Malay</option>
                <option>Spanish</option>
              </select>
            </div>

            <button
  type="submit"
  disabled={saving}
  className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
>
  {saving ? "Saving..." : "Save Settings"}
</button>
          </form>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-xl font-semibold">More Pages</h2>
          <div className="mt-4 flex flex-col gap-3 text-sm">
            <Link href="/add-transaction" className="text-zinc-300 hover:text-white">
              Add Transaction
            </Link>
            <Link href="/savings-goals" className="text-zinc-300 hover:text-white">
              Savings Goals
            </Link>
            <Link href="/debts" className="text-zinc-300 hover:text-white">
              Debts
            </Link>
            <Link href="/recurring-bills" className="text-zinc-300 hover:text-white">
              Recurring Bills
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}