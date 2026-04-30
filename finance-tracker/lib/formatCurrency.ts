export function formatCurrency(
    amount: number | null | undefined,
    currency: string = "MYR"
  ) {
    return new Intl.NumberFormat("en-MY", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  }