export type RecurringBillAnalyticsInput = {
    id: string;
    bill_name: string;
    amount: number | null;
    currency: string | null;
    frequency: "weekly" | "monthly" | "quarterly" | "bi-yearly" | "yearly";
    next_due_date: string | null;
    last_paid_date?: string | null;
    category?: string | null;
    is_active?: boolean | null;
  };
  
  export type RecurringBillAnalytics = {
    id: string;
    bill_name: string;
    amount: number;
    currency: string;
    frequency: "weekly" | "monthly" | "quarterly" | "bi-yearly" | "yearly";
    next_due_date: string | null;
    last_paid_date: string | null;
    category: string | null;
    is_active: boolean;
    status: "Overdue" | "Due Soon" | "Upcoming" | "No Due Date" | "Inactive";
    days_left: number | null;
    monthly_equivalent: number;
    urgency_score: number;
  };
  
  function normalizeDate(dateString: string) {
    const date = new Date(dateString);
    date.setHours(0, 0, 0, 0);
    return date;
  }
  
  export function getDaysLeft(dateString: string | null) {
    if (!dateString) return null;
  
    const today = new Date();
    today.setHours(0, 0, 0, 0);
  
    const dueDate = normalizeDate(dateString);
    const diffMs = dueDate.getTime() - today.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }
  
  export function getRecurringBillStatus(
    nextDueDate: string | null,
    isActive = true
  ): "Overdue" | "Due Soon" | "Upcoming" | "No Due Date" | "Inactive" {
    if (!isActive) return "Inactive";
    if (!nextDueDate) return "No Due Date";
  
    const daysLeft = getDaysLeft(nextDueDate);
  
    if (daysLeft === null) return "No Due Date";
    if (daysLeft < 0) return "Overdue";
    if (daysLeft <= 7) return "Due Soon";
    return "Upcoming";
  }
  
  export function getMonthlyEquivalent(
    amount: number,
    frequency: "weekly" | "monthly" | "quarterly" | "bi-yearly" | "yearly"
  ) {
    if (frequency === "weekly") return Number((amount * 52 / 12).toFixed(2));
    if (frequency === "monthly") return amount;
    if (frequency === "quarterly") return Number((amount / 3).toFixed(2));
    if (frequency === "bi-yearly") return Number((amount / 6).toFixed(2));
    return Number((amount / 12).toFixed(2));
  }
  
  export function getRecurringBillAnalytics(
    bills: RecurringBillAnalyticsInput[]
  ): RecurringBillAnalytics[] {
    return bills
      .map((bill) => {
        const amount = Number(bill.amount || 0);
        const isActive = Boolean(bill.is_active ?? true);
        const daysLeft = getDaysLeft(bill.next_due_date);
        const status = getRecurringBillStatus(bill.next_due_date, isActive);
        const monthlyEquivalent = getMonthlyEquivalent(amount, bill.frequency);
  
        let urgencyScore = 0;
  
        if (isActive) {
          urgencyScore += amount;
  
          if (daysLeft !== null) {
            if (daysLeft < 0) urgencyScore += 100000;
            else if (daysLeft <= 7) urgencyScore += 50000;
            else if (daysLeft <= 30) urgencyScore += 20000;
          }
        }
  
        return {
          id: bill.id,
          bill_name: bill.bill_name,
          amount,
          currency: bill.currency || "MYR",
          frequency: bill.frequency,
          next_due_date: bill.next_due_date,
          last_paid_date: bill.last_paid_date || null,
          category: bill.category || null,
          is_active: isActive,
          status,
          days_left: daysLeft,
          monthly_equivalent: monthlyEquivalent,
          urgency_score: urgencyScore,
        };
      })
      .sort((a, b) => b.urgency_score - a.urgency_score);
  }
  
  export function getBillsDueWithinDays(
    bills: RecurringBillAnalytics[],
    days: number
  ) {
    return bills.filter((bill) => {
      if (!bill.is_active) return false;
      if (bill.days_left === null) return false;
      return bill.days_left >= 0 && bill.days_left <= days;
    });
  }
  
  export function getOverdueBills(bills: RecurringBillAnalytics[]) {
    return bills.filter((bill) => bill.status === "Overdue");
  }
  
  export function getMonthlyRecurringCommitment(bills: RecurringBillAnalytics[]) {
    return bills
      .filter((bill) => bill.is_active)
      .reduce((sum, bill) => sum + bill.monthly_equivalent, 0);
  }