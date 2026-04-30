"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CategoryRecord,
  fetchUserCategories,
  ensureDefaultCategories,
} from "@/lib/categoryHelpers";
import {
  SubcategoryRecord,
  ensureDefaultSubcategories,
  fetchUserSubcategories,
} from "@/lib/subcategoryHelpers";

function getErrorMessage(error: unknown) {
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return "Something went wrong.";
}

export default function SubcategoriesPage() {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);

  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    try {
      await ensureDefaultCategories(user.id);
      const allCategories = await fetchUserCategories(user.id, undefined, true);
      await ensureDefaultSubcategories(user.id, allCategories);
      const allSubcategories = await fetchUserSubcategories(user.id, undefined, true);

      setCategories(allCategories);
      setSubcategories(allSubcategories);

      if (!selectedCategoryId && allCategories.length > 0) {
        setSelectedCategoryId(allCategories[0].id);
      }
    } catch (error) {
      console.error("Load subcategories error:", error);
      alert(getErrorMessage(error));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleAddSubcategory(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not found.");
      }

      if (!selectedCategoryId) {
        throw new Error("Please select a category.");
      }

      if (!newSubcategoryName.trim()) {
        throw new Error("Please enter a subcategory name.");
      }

      const { error } = await supabase.from("subcategories").insert({
        user_id: user.id,
        category_id: selectedCategoryId,
        name: newSubcategoryName.trim(),
        is_system: false,
        is_active: true,
        sort_order: 999,
      });

      if (error) {
        throw error;
      }

      setNewSubcategoryName("");
      await loadData();
      alert("Subcategory added successfully.");
    } catch (error) {
      alert(getErrorMessage(error));
    }

    setSaving(false);
  }

  async function handleToggleSubcategory(item: SubcategoryRecord) {
    setChangingId(item.id);

    try {
      const { data, error } = await supabase
        .from("subcategories")
        .update({
          is_active: !item.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id)
        .eq("user_id", item.user_id)
        .select("id, is_active")
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        throw new Error("Subcategory update failed.");
      }

      await loadData();
    } catch (error) {
      console.error("Toggle subcategory error:", error);
      alert(getErrorMessage(error));
    }

    setChangingId(null);
  }

  const groupedCategories = useMemo(() => {
    return categories.filter((category) => category.is_active);
  }, [categories]);

  const filteredSubcategories = useMemo(() => {
    if (!selectedCategoryId) return [];
    return subcategories.filter((item) => item.category_id === selectedCategoryId);
  }, [subcategories, selectedCategoryId]);

  const activeSubcategories = filteredSubcategories.filter((item) => item.is_active);
  const inactiveSubcategories = filteredSubcategories.filter((item) => !item.is_active);

  function getCategoryName(categoryId: string) {
    return categories.find((item) => item.id === categoryId)?.name || "Unknown Category";
  }

  if (loading) {
    return (
      <div className="px-6 py-10">
        <div className="mx-auto max-w-5xl text-zinc-400">Loading subcategories...</div>
      </div>
    );
  }

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold">Subcategories</h1>
          <p className="mt-2 text-zinc-400">
            Organize transactions under more detailed labels inside each category.
          </p>
        </div>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-2xl font-semibold">Add Subcategory</h2>

          <form className="space-y-4" onSubmit={handleAddSubcategory}>
            <div>
              <label className="mb-2 block text-sm">Category</label>
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              >
                {groupedCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.category_type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm">Subcategory Name</label>
              <input
                type="text"
                value={newSubcategoryName}
                onChange={(e) => setNewSubcategoryName(e.target.value)}
                placeholder="Enter subcategory name"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-white outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-white px-6 py-3 font-semibold text-black disabled:opacity-50"
            >
              {saving ? "Adding..." : "Add Subcategory"}
            </button>
          </form>
        </div>

        <div className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="mb-4 text-2xl font-semibold">Current Category</h2>
          <p className="text-zinc-300">
            {selectedCategoryId ? getCategoryName(selectedCategoryId) : "No category selected"}
          </p>
        </div>

        <div className="mb-8">
          <h2 className="mb-4 text-2xl font-semibold">Active Subcategories</h2>

          {activeSubcategories.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
              No active subcategories for this category.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activeSubcategories.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{item.name}</h3>
                      <p className="mt-2 text-sm text-zinc-500">
                        {item.is_system ? "System Subcategory" : "Custom Subcategory"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleSubcategory(item)}
                      disabled={changingId === item.id}
                      className="text-yellow-400 hover:text-yellow-300 disabled:opacity-50"
                    >
                      {changingId === item.id ? "Updating..." : "Disable"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-2xl font-semibold">Disabled Subcategories</h2>

          {inactiveSubcategories.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 text-zinc-400">
              No disabled subcategories for this category.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {inactiveSubcategories.map((item) => (
                <div
                  key={item.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{item.name}</h3>
                      <p className="mt-2 text-sm text-zinc-500">
                        {item.is_system ? "System Subcategory" : "Custom Subcategory"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleToggleSubcategory(item)}
                      disabled={changingId === item.id}
                      className="text-green-400 hover:text-green-300 disabled:opacity-50"
                    >
                      {changingId === item.id ? "Updating..." : "Enable"}
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