"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
export default function SignUpPage() {
  const router = useRouter();

  return (
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
          <h1 className="text-3xl font-bold mb-2">Sign Up</h1>
          <p className="text-zinc-400 mb-6">
            Create your Finance Tracker account.
          </p>
  
          <form
  className="space-y-4"
  onSubmit={(e) => {
    e.preventDefault();
    router.push("/dashboard");
  }}
>
            <div>
              <label className="block text-sm mb-2">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-white outline-none"
              />
            </div>
  
            <div>
              <label className="block text-sm mb-2">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-white outline-none"
              />
            </div>
  
            <div>
              <label className="block text-sm mb-2">Password</label>
              <input
                type="password"
                placeholder="Create your password"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-white outline-none"
              />
            </div>
  
            <button
              type="submit"
              className="w-full rounded-full bg-white text-black px-6 py-3 font-semibold"
            >
              Create Account
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