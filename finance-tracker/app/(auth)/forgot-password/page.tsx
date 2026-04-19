export default function ForgotPasswordPage() {
    return (
        <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8">
          <h1 className="text-3xl font-bold mb-2">Forgot Password</h1>
          <p className="text-zinc-400 mb-6">
            Enter your email to reset your password.
          </p>
  
          <form className="space-y-4">
            <div>
              <label className="block text-sm mb-2">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full rounded-lg bg-zinc-900 border border-zinc-700 px-4 py-3 text-white outline-none"
              />
            </div>
  
            <button
              type="submit"
              className="w-full rounded-full bg-white text-black px-6 py-3 font-semibold"
            >
              Send Reset Link
            </button>
          </form>
        </div>
    );
  }