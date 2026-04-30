import { supabase } from "@/lib/supabase";

export type CategoryType = "income" | "expense";

export type CategoryRecord = {
  id: string;
  user_id: string;
  name: string;
  category_type: CategoryType;
  is_system: boolean;
  is_active: boolean;
  sort_order: number;
};

const DEFAULT_INCOME_CATEGORIES = [
  "Salary",
  "Bonus",
  "Business",
  "Investment",
  "Refund",
  "Other",
];

const DEFAULT_EXPENSE_CATEGORIES = [
  "Food",
  "Transport",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Education",
  "Insurance",
  "Subscription",
  "Rent",
  "Loan",
  "Other",
];

export async function ensureDefaultCategories(userId: string) {
  const { data: existingRows, error: existingError } = await supabase
    .from("categories")
    .select("name, category_type")
    .eq("user_id", userId);

  if (existingError) {
    throw existingError;
  }

  const existingSet = new Set(
    (existingRows ?? []).map((row) => `${row.category_type}::${row.name}`)
  );

  const rows = [
    ...DEFAULT_INCOME_CATEGORIES.map((name, index) => ({
      user_id: userId,
      name,
      category_type: "income" as CategoryType,
      is_system: true,
      is_active: true,
      sort_order: index + 1,
    })),
    ...DEFAULT_EXPENSE_CATEGORIES.map((name, index) => ({
      user_id: userId,
      name,
      category_type: "expense" as CategoryType,
      is_system: true,
      is_active: true,
      sort_order: index + 1,
    })),
  ].filter((row) => !existingSet.has(`${row.category_type}::${row.name}`));

  if (rows.length === 0) {
    return;
  }

  const { error } = await supabase.from("categories").insert(rows);

  if (error) {
    throw error;
  }
}

export async function fetchUserCategories(
  userId: string,
  categoryType?: CategoryType,
  includeInactive = false
) {
  await ensureDefaultCategories(userId);

  let query = supabase
    .from("categories")
    .select("id, user_id, name, category_type, is_system, is_active, sort_order")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (categoryType) {
    query = query.eq("category_type", categoryType);
  }

  if (!includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []) as CategoryRecord[];
}

export function findCategoryByName(
  categories: CategoryRecord[],
  name: string | null | undefined
) {
  if (!name) return null;
  return categories.find((category) => category.name === name) || null;
}