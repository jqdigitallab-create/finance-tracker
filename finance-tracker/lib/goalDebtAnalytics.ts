export type SavingsGoalAnalyticsInput = {
    id: string;
    goal_name: string;
    target_amount: number | null;
    current_amount: number | null;
    target_date: string | null;
    currency: string | null;
  };
  
  export type DebtAnalyticsInput = {
    id: string;
    debt_name: string;
    total_amount: number | null;
    remaining_amount: number | null;
    monthly_payment: number | null;
    due_date: string | null;
    last_paid_date?: string | null;
  };
  
  export type SavingsGoalAnalytics = {
    id: string;
    goal_name: string;
    target_amount: number;
    current_amount: number;
    remaining_amount: number;
    progress_percent: number;
    target_date: string | null;
    days_left: number | null;
    months_left: number | null;
    monthly_needed: number | null;
    urgency_score: number;
    currency: string;
  };
  
  export type DebtAnalytics = {
    id: string;
    debt_name: string;
    total_amount: number;
    remaining_amount: number;
    paid_amount: number;
    progress_percent: number;
    monthly_payment: number;
    due_date: string | null;
    last_paid_date: string | null;
    days_left: number | null;
    months_left: number | null;
    estimated_months_to_payoff: number | null;
    payoff_date_estimate: string | null;
    urgency_score: number;
  };
  
  function normalizeDate(dateString: string) {
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  
  function getDaysLeft(dateString: string | null) {
    if (!dateString) return null;
  
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    const target = normalizeDate(dateString);
    const diffMs = target.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
  
  function getMonthsLeftFromDays(daysLeft: number | null) {
    if (daysLeft === null) return null;
    return Math.max(0, Number((daysLeft / 30.44).toFixed(1)));
  }
  
  function addMonths(date: Date, months: number) {
    const result = new Date(date);
    result.setMonth(result.getMonth() + months);
    return result;
  }
  
  export function addOneMonthToDate(dateString: string) {
    const date = new Date(dateString);
    date.setMonth(date.getMonth() + 1);
    return date.toISOString().split("T")[0];
  }
  
  export function getSavingsGoalAnalytics(
    goals: SavingsGoalAnalyticsInput[]
  ): SavingsGoalAnalytics[] {
    return goals
      .map((goal) => {
        const targetAmount = Number(goal.target_amount || 0);
        const currentAmount = Number(goal.current_amount || 0);
        const remainingAmount = Math.max(0, targetAmount - currentAmount);
        const progressPercent =
          targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0;
  
        const daysLeft = getDaysLeft(goal.target_date);
        const monthsLeft = getMonthsLeftFromDays(daysLeft);
  
        const monthlyNeeded =
          monthsLeft && monthsLeft > 0
            ? Number((remainingAmount / monthsLeft).toFixed(2))
            : remainingAmount > 0
            ? remainingAmount
            : 0;
  
        let urgencyScore = 0;
  
        if (remainingAmount > 0) {
          urgencyScore += remainingAmount;
        }
  
        if (daysLeft !== null) {
          if (daysLeft < 0) {
            urgencyScore += 100000;
          } else if (daysLeft <= 30) {
            urgencyScore += 50000;
          } else if (daysLeft <= 90) {
            urgencyScore += 20000;
          }
        }
  
        return {
          id: goal.id,
          goal_name: goal.goal_name,
          target_amount: targetAmount,
          current_amount: currentAmount,
          remaining_amount: remainingAmount,
          progress_percent: progressPercent,
          target_date: goal.target_date,
          days_left: daysLeft,
          months_left: monthsLeft,
          monthly_needed: remainingAmount > 0 ? monthlyNeeded : 0,
          urgency_score: urgencyScore,
          currency: goal.currency || "MYR",
        };
      })
      .sort((a, b) => b.urgency_score - a.urgency_score);
  }
  
  export function getDebtAnalytics(debts: DebtAnalyticsInput[]): DebtAnalytics[] {
    return debts
      .map((debt) => {
        const totalAmount = Number(debt.total_amount || 0);
        const remainingAmount = Number(debt.remaining_amount || 0);
        const monthlyPayment = Number(debt.monthly_payment || 0);
        const paidAmount = Math.max(0, totalAmount - remainingAmount);
  
        const progressPercent =
          totalAmount > 0 ? Math.min((paidAmount / totalAmount) * 100, 100) : 0;
  
        const daysLeft = getDaysLeft(debt.due_date);
        const monthsLeft = getMonthsLeftFromDays(daysLeft);
  
        const estimatedMonthsToPayoff =
          monthlyPayment > 0 && remainingAmount > 0
            ? Number((remainingAmount / monthlyPayment).toFixed(1))
            : remainingAmount <= 0
            ? 0
            : null;
  
        const payoffDateEstimate =
          estimatedMonthsToPayoff !== null
            ? addMonths(new Date(), Math.ceil(estimatedMonthsToPayoff))
                .toISOString()
                .split("T")[0]
            : null;
  
        let urgencyScore = 0;
  
        if (remainingAmount > 0) {
          urgencyScore += remainingAmount;
        }
  
        if (daysLeft !== null) {
          if (daysLeft < 0) {
            urgencyScore += 100000;
          } else if (daysLeft <= 30) {
            urgencyScore += 50000;
          } else if (daysLeft <= 90) {
            urgencyScore += 20000;
          }
        }
  
        return {
          id: debt.id,
          debt_name: debt.debt_name,
          total_amount: totalAmount,
          remaining_amount: remainingAmount,
          paid_amount: paidAmount,
          progress_percent: progressPercent,
          monthly_payment: monthlyPayment,
          due_date: debt.due_date,
          last_paid_date: debt.last_paid_date || null,
          days_left: daysLeft,
          months_left: monthsLeft,
          estimated_months_to_payoff: estimatedMonthsToPayoff,
          payoff_date_estimate: payoffDateEstimate,
          urgency_score: urgencyScore,
        };
      })
      .sort((a, b) => b.urgency_score - a.urgency_score);
  }