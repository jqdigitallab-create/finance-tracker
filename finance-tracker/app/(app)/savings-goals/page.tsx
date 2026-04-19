export default function SavingsGoalsPage() {
    const goals = [
      {
        id: 1,
        name: "Emergency Fund",
        target: "RM 10,000.00",
        saved: "RM 4,500.00",
        progress: "45%",
      },
      {
        id: 2,
        name: "Vacation",
        target: "RM 5,000.00",
        saved: "RM 2,000.00",
        progress: "40%",
      },
      {
        id: 3,
        name: "New Laptop",
        target: "RM 6,000.00",
        saved: "RM 1,800.00",
        progress: "30%",
      },
    ];
  
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Savings Goals</h1>
            <p className="mt-2 text-zinc-400">
              Set savings targets and track your progress toward each goal.
            </p>
          </div>
  
          <div className="grid gap-4 md:grid-cols-3">
            {goals.map((goal) => (
              <div
                key={goal.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <p className="text-sm text-zinc-400">{goal.name}</p>
                <h2 className="mt-2 text-2xl font-semibold">{goal.target}</h2>
                <p className="mt-3 text-sm text-zinc-500">Saved: {goal.saved}</p>
                <p className="mt-4 text-sm font-medium text-green-400">
                  Progress: {goal.progress}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }