"use client";

import Link from "next/link";

type MoreLink = {
  title: string;
  description: string;
  href: string;
};

const sections: {
  heading: string;
  links: MoreLink[];
}[] = [
  {
    heading: "Financial Planning",
    links: [
      {
        title: "Budgets",
        description: "Set monthly category budgets and review budget history.",
        href: "/budgets",
      },
      {
        title: "Savings Goals",
        description: "Track goals, progress, and contribution history.",
        href: "/savings-goals",
      },
      {
        title: "Debts",
        description: "Manage debts, repayments, and payoff progress.",
        href: "/debts",
      },
      {
        title: "Recurring Bills",
        description: "Manage repeating bills, due dates, and auto pay.",
        href: "/recurring-bills",
      },
      {
        title: "Categories",
        description: "Manage your income and expense categories.",
        href: "/categories",
      },
      {
        title: "Subcategories",
        description: "Manage detailed labels under each category.",
        href: "/subcategories",
      },
    ],
  },
  {
    heading: "Money Overview",
    links: [
      {
        title: "Wallets",
        description: "Manage wallet balances and currencies.",
        href: "/wallets",
      },
      {
        title: "Net Worth",
        description: "Review assets, liabilities, and available balance.",
        href: "/net-worth",
      },
      {
        title: "Transactions",
        description: "View and manage all transaction records.",
        href: "/transactions",
      },
      {
        title: "Add Transaction",
        description: "Add income, expense, transfer, saving, debt repayment, or bill payment.",
        href: "/add-transaction",
      },
    ],
  },
  {
    heading: "Account",
    links: [
      {
        title: "Settings",
        description: "Manage profile, currency, language, and date format.",
        href: "/settings",
      },
      {
        title: "Dashboard",
        description: "Return to your main financial overview.",
        href: "/dashboard",
      },
    ],
  },
];

export default function MorePage() {
  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">More</h1>
          <p className="mt-2 text-zinc-400">
            Quick access to the rest of your finance tools and account pages.
          </p>
        </div>

        <div className="space-y-8">
          {sections.map((section) => (
            <div key={section.heading}>
              <h2 className="mb-4 text-2xl font-semibold">{section.heading}</h2>

              <div className="grid gap-4 md:grid-cols-2">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 transition hover:border-zinc-700 hover:bg-zinc-900"
                  >
                    <h3 className="text-lg font-semibold">{link.title}</h3>
                    <p className="mt-2 text-sm text-zinc-400">{link.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}