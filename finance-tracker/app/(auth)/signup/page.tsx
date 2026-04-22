"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignUpPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
  
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });
  
    if (error) {
      setLoading(false);
      alert(error.message);
      return;
    }
  
    const user = data.user;
  
    if (user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: user.id,
        full_name: fullName,
        default_currency: "MYR",
        date_format: "DD/MM/YYYY",
        language: "English",
        premium_status: "free",
      });
  
      if (profileError) {
        setLoading(false);
        alert(profileError.message);
        return;
      }
    }
  
    setLoading(false);
    alert("Sign up successful. Please check your email if confirmation is required.");
    router.push("/login");
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
      <h1 className="text-3xl font-bold mb-2">Sign Up</h1>
      <p className="text-zinc-400 mb-6">
        Create your Finance Tracker account.
      </p>

      <form className="space-y-4" onSubmit={handleSignUp}>
        <div>
          <label className="block text-sm mb-2">Full Name</label>
          <input
            type="text"
            placeholder="Enter your full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-sm mb-2">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-white outline-none"
          />
        </div>

        <div>
          <label className="block text-sm mb-2">Password</label>
          <input
            type="password"
            placeholder="Create your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-white outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-white text-black px-6 py-3 font-semibold disabled:opacity-50"
        >
          {loading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-400 text-center">
        Already have an account?{" "}
        <Link href="/login" className="text-white font-medium">
          Login
        </Link>
      </p>
    </div>
  );
}