export default function RecurringBillsPage() {
    const bills = [
      {
        id: 1,
        name: "House Rent",
        amount: "RM 1,500.00",
        frequency: "Monthly",
        nextDueDate: "2026-05-01",
      },
      {
        id: 2,
        name: "Electricity Bill",
        amount: "RM 180.00",
        frequency: "Monthly",
        nextDueDate: "2026-04-28",
      },
      {
        id: 3,
        name: "Netflix",
        amount: "RM 55.00",
        frequency: "Monthly",
        nextDueDate: "2026-04-25",
      },
    ];
  
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Recurring Bills</h1>
            <p className="mt-2 text-zinc-400">
              Track repeated payments and upcoming due dates.
            </p>
          </div>
  
          <div className="grid gap-4 md:grid-cols-3">
            {bills.map((bill) => (
              <div
                key={bill.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <p className="text-sm text-zinc-400">{bill.name}</p>
                <h2 className="mt-2 text-2xl font-semibold">{bill.amount}</h2>
                <p className="mt-3 text-sm text-zinc-500">
                  Frequency: {bill.frequency}
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Next Due: {bill.nextDueDate}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }