import Link from "next/link";
export default function SettingsPage() {
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
            <form className="space-y-5">
              <div>
                <label className="mb-2 block text-sm">Full Name</label>
                <input
                  type="text"
                  placeholder="Enter your full name"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
                />
              </div>
  
              <div>
                <label className="mb-2 block text-sm">Default Currency</label>
                <select className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none">
                  <option>MYR</option>
                  <option>USD</option>
                  <option>EUR</option>
                </select>
              </div>
  
              <div>
                <label className="mb-2 block text-sm">Date Format</label>
                <select className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none">
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                  <option>YYYY-MM-DD</option>
                </select>
              </div>
  
              <div>
                <label className="mb-2 block text-sm">Language</label>
                <select className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none">
                  <option>English</option>
                  <option>Malay</option>
                  <option>Spanish</option>
                </select>
              </div>
  
              <button
                type="submit"
                className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black"
              >
                Save Settings
              </button>
            </form>
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
      </div>
    );
  }