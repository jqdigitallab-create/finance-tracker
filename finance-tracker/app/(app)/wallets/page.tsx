export default function WalletsPage() {
    const wallets = [
      {
        id: 1,
        name: "Cash",
        type: "Cash",
        currency: "MYR",
        balance: "RM 500.00",
      },
      {
        id: 2,
        name: "Maybank",
        type: "Bank Account",
        currency: "MYR",
        balance: "RM 8,200.00",
      },
      {
        id: 3,
        name: "TNG eWallet",
        type: "E-Wallet",
        currency: "MYR",
        balance: "RM 320.00",
      },
    ];
  
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold">Wallets</h1>
            <p className="mt-2 text-zinc-400">
              Manage your money across different accounts and wallets.
            </p>
          </div>
  
          <div className="grid gap-4 md:grid-cols-3">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <p className="text-sm text-zinc-400">{wallet.type}</p>
                <h2 className="mt-2 text-2xl font-semibold">{wallet.name}</h2>
                <p className="mt-2 text-sm text-zinc-500">{wallet.currency}</p>
                <p className="mt-6 text-2xl font-bold">{wallet.balance}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }