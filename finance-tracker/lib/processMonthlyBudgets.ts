import { supabase } from "@/lib/supabase";

type Budget = {
  id: string;
  user_id: string;
  budget_name: string;
  category: string;
  budget_amount: number | null;
  currency: string | null;
  spent_amount: number | null;
  period_month: number | null;
  period_year: number | null;
};

type Transaction = {
  category: string;
  amount: number | null;
  transaction_type: string;
  transaction_date: string;
};

export async function processMonthlyBudgets(userId: string) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: budgetsData, error: budgetsError } = await supabase
    .from("budgets")
    .select(
      "id, user_id, budget_name, category, budget_amount, currency, spent_amount, period_month, period_year"
    )
    .eq("user_id", userId);

  if (budgetsError) {
    throw budgetsError;
  }

  const budgets = (budgetsData ?? []) as Budget[];

  for (const budget of budgets) {
    const budgetMonth = Number(budget.period_month || currentMonth);
    const budgetYear = Number(budget.period_year || currentYear);

    const isOldPeriod =
      budgetYear < currentYear ||
      (budgetYear === currentYear && budgetMonth < currentMonth);

    if (!isOldPeriod) {
      continue;
    }

    const startDate = `${String(budgetYear).padStart(4, "0")}-${String(
      budgetMonth
    ).padStart(2, "0")}-01`;

    const endDateObject = new Date(budgetYear, budgetMonth, 0);
    const endDate = `${String(budgetYear).padStart(4, "0")}-${String(
      budgetMonth
    ).padStart(2, "0")}-${String(endDateObject.getDate()).padStart(2, "0")}`;

    const { data: txData, error: txError } = await supabase
      .from("transactions")
      .select("category, amount, transaction_type, transaction_date")
      .eq("user_id", userId)
      .eq("transaction_type", "expense")
      .eq("category", budget.category)
      .gte("transaction_date", startDate)
      .lte("transaction_date", endDate);

    if (txError) {
      throw txError;
    }

    const actualSpent = ((txData ?? []) as Transaction[]).reduce(
      (sum, item) => sum + Number(item.amount || 0),
      0
    );

    const { data: existingHistory } = await supabase
      .from("budget_history")
      .select("id")
      .eq("budget_id", budget.id)
      .eq("period_month", budgetMonth)
      .eq("period_year", budgetYear)
      .maybeSingle();

    if (!existingHistory) {
      const { error: historyInsertError } = await supabase
        .from("budget_history")
        .insert({
          user_id: userId,
          budget_id: budget.id,
          budget_name: budget.budget_name,
          category: budget.category,
          budget_amount: Number(budget.budget_amount || 0),
          actual_spent: actualSpent,
          currency: budget.currency || "MYR",
          period_month: budgetMonth,
          period_year: budgetYear,
        });

      if (historyInsertError) {
        throw historyInsertError;
      }
    }

    const { error: budgetUpdateError } = await supabase
      .from("budgets")
      .update({
        spent_amount: 0,
        period_month: currentMonth,
        period_year: currentYear,
        updated_at: new Date().toISOString(),
      })
      .eq("id", budget.id);

    if (budgetUpdateError) {
      throw budgetUpdateError;
    }
  }
}