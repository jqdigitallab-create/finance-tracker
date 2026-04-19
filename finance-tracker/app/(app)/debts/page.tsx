export default function DebtsPage() {
    const debts = [
      {
        id: 1,
        name: "Car Loan",
        total: "RM 45,000.00",
        remaining: "RM 28,500.00",
        monthlyPayment: "RM 850.00",
      },
      {
        id: 2,
        name: "House Mortgage",
        total: "RM 350,000.00",
        remaining: "RM 310,000.00",
        monthlyPayment: "RM 1,850.00",
      },
      {
        id: 3,
        name: "Personal Loan",
        total: "RM 12,000.00",
        remaining: "RM 7,200.00",
        monthlyPayment: "RM 400.00",
      },
    ];
  
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Debts</h1>
            <p className="mt-2 text-zinc-400">
              Track outstanding balances and monthly repayment commitments.
            </p>
          </div>
  
          <div className="grid gap-4 md:grid-cols-3">
            {debts.map((debt) => (
              <div
                key={debt.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <p className="text-sm text-zinc-400">{debt.name}</p>
                <h2 className="mt-2 text-2xl font-semibold">{debt.remaining}</h2>
                <p className="mt-3 text-sm text-zinc-500">Total: {debt.total}</p>
                <p className="mt-2 text-sm text-zinc-500">
                  Monthly Payment: {debt.monthlyPayment}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }