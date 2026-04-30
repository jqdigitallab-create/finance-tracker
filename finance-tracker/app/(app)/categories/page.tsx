"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CategoryRecord,
  CategoryType,
  ensureDefaultCategories,
  fetchUserCategories,
} from "@/lib/categoryHelpers";

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export default function CategoriesPage() {
  const [activeTab, setActiveTab] = useState<CategoryType>("expense");
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");

  async function loadCategories() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      await ensureDefaultCategories(user.id);
      const rows = await fetchUserCategories(user.id, undefined, true);
      setCategories(rows);
    } catch (error) {
      console.error("Load categories error:", error);
      alert(getErrorMessage(error));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadCategories();
  }, []);

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not found.");
      }

      if (!newCategoryName.trim()) {
        throw new Error("Please enter a category name.");
      }

      const { error } = await supabase.from("categories").insert({
        user_id: user.id,
        name: newCategoryName.trim(),
        category_type: activeTab,
        is_system: false,
        is_active: true,
        sort_order: 999,
      });

      if (error) {
        throw error;
      }

      setNewCategoryName("");
      await loadCategories();
      alert("Category added successfully.");
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSaving(false);
  }

  async function handleToggleCategory(category: CategoryRecord) {
    setChangingId(category.id);

    try {
      const { data, error } = await supabase
        .from("categories")
        .update({
          is_active: !category.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", category.id)
        .eq("user_id", category.user_id)
        .select("id, is_active")
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Category update failed.");
      }

      await loadCategories();
    } catch (error) {
      console.error("Toggle category error:", error);
      alert(getErrorMessage(error));
    }

    setChangingId(null);
  }

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.category_type === activeTab),
    [categories, activeTab]
  );

  const activeCategories = filteredCategories.filter((category) => category.is_active);
  const inactiveCategories = filteredCategories.filter((category) => !category.is_active);

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-5xl text-zinc-400">Loading categories...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Categories</h1>
          <p className="mt-2 text-zinc-400">
            Manage your income and expense categories.
          </p>
        </div>

        <div className="mb-6 flex gap-3">
          <button
            onClick={() => setActiveTab("expense")}
            className={`rounded-full px-5 py-3 font-semibold ${
              activeTab === "expense"
                ? "bg-white text-black"
                : "border border-zinc-700 text-white"
            }`}
          >
            Expense Categories
          </button>

          <button
            onClick={() => setActiveTab("income")}
            className={`rounded-full px-5 py-3 font-semibold ${
              activeTab === "income"
                ? "bg-white text-black"
                : "border border-zinc-700 text-white"
            }`}
          >
            Income Categories
          </button>
        </div>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-2xl font-semibold">Add Category</h2>

          <form className="space-y-4" onSubmit={handleAddCategory}>
            <div>
              <label className="mb-2 block text-sm">Category Name</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={`Enter ${activeTab} category name`}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Category"}
            </button>
          </form>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Active Categories</h2>

          {activeCategories.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
              No active categories.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeCategories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <p className="mt-2 text-sm text-zinc-500">
                        {category.is_system ? "System Category" : "Custom Category"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleCategory(category)}
                      disabled={changingId === category.id}
                      className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50"
                    >
                      {changingId === category.id ? "Updating..." : "Disable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-2xl font-semibold">Disabled Categories</h2>

          {inactiveCategories.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
              No disabled categories.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {inactiveCategories.map((category) => (
                <div
                  key={category.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{category.name}</h3>
                      <p className="mt-2 text-sm text-zinc-500">
                        {category.is_system ? "System Category" : "Custom Category"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleCategory(category)}
                      disabled={changingId === category.id}
                      className="text-green-400 hover:text-green-300 disabled:opacity-50"
                    >
                      {changingId === category.id ? "Updating..." : "Enable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}