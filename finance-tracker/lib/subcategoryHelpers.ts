import { supabase } from "@/lib/supabase";
import { CategoryRecord } from "@/lib/categoryHelpers";

export type SubcategoryRecord = {
  id: string;
  user_id: string;
  category_id: string;
  name: string;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
};

const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  Salary: ["Main Salary", "Part Time", "Commission"],
  Bonus: ["Performance Bonus", "Annual Bonus"],
  Business: ["Sales", "Service Income", "Freelance"],
  Investment: ["Dividends", "Interest", "Capital Gains"],
  Refund: ["Purchase Refund", "Bill Refund"],
  Other: ["Miscellaneous"],

  Food: ["Groceries", "Dining Out", "Coffee", "Snacks"],
  Transport: ["Fuel", "Parking", "Toll", "Public Transport", "Ride Hailing"],
  Utilities: ["Electricity", "Water", "Internet", "Mobile"],
  Entertainment: ["Movies", "Games", "Streaming", "Events"],
  Shopping: ["Clothing", "Personal Care", "Home Items", "Gadgets"],
  Healthcare: ["Clinic", "Medication", "Dental", "Insurance Medical"],
  Education: ["Courses", "Books", "School Fees"],
  Insurance: ["Life Insurance", "Medical Insurance", "Car Insurance"],
  Subscription: ["Netflix", "Spotify", "Software", "Cloud Services"],
  Rent: ["House Rent", "Office Rent"],
  Loan: ["Personal Loan", "Car Loan", "Mortgage"],
};

export async function ensureDefaultSubcategories(
  userId: string,
  categories: CategoryRecord[]
) {
  const { data: existingRows, error: existingError } = await supabase
    .from("subcategories")
    .select("category_id, name")
    .eq("user_id", userId);

  if (existingError) {
    throw existingError;
  }

  const existingSet = new Set(
    (existingRows ?? []).map((row) => `${row.category_id}::${row.name}`)
  );

  const rows = categories.flatMap((category) => {
    const defaults = DEFAULT_SUBCATEGORIES[category.name] || [];
    return defaults.map((name, index) => ({
      user_id: userId,
      category_id: category.id,
      name,
      is_system: true,
      is_active: true,
      sort_order: index + 1,
    }));
  }).filter((row) => !existingSet.has(`${row.category_id}::${row.name}`));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("subcategories").insert(rows);

  if (error) {
    throw error;
  }
}

export async function fetchUserSubcategories(
  userId: string,
  categoryId?: string,
  includeInactive = false
) {
  let query = supabase
    .from("subcategories")
    .select("id, user_id, category_id, name, is_system, is_active, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as SubcategoryRecord[];
}

export function findSubcategoryByName(
  subcategories: SubcategoryRecord[],
  name: string | null | undefined
) {
  if (!name) return null;
  return subcategories.find((subcategory) => subcategory.name === name) || null;
}