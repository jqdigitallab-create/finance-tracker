export default function BudgetsPage() {
    const budgets = [
      {
        id: 1,
        category: "Food",
        limit: "RM 800.00",
        spent: "RM 520.00",
        status: "On Track",
      },
      {
        id: 2,
        category: "Transport",
        limit: "RM 400.00",
        spent: "RM 310.00",
        status: "On Track",
      },
      {
        id: 3,
        category: "Entertainment",
        limit: "RM 300.00",
        spent: "RM 360.00",
        status: "Over Budget",
      },
    ];
  
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Budgets</h1>
            <p className="mt-2 text-zinc-400">
              Set and monitor spending limits across your categories.
            </p>
          </div>
  
          <div className="grid gap-4 md:grid-cols-3">
            {budgets.map((budget) => (
              <div
                key={budget.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <p className="text-sm text-zinc-400">{budget.category}</p>
                <h2 className="mt-2 text-2xl font-semibold">{budget.limit}</h2>
                <p className="mt-3 text-sm text-zinc-500">Spent: {budget.spent}</p>
                <p
                  className={`mt-4 text-sm font-medium ${
                    budget.status === "Over Budget" ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {budget.status}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }