"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.ok) {
      router.push("/admin");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Login failed.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bone px-5">
      <form onSubmit={submit} className="w-full max-w-[380px] bg-card border border-line rounded-card p-8">
        <p className="font-mono text-[11px] tracking-wider uppercase text-muted mb-1.5">DT.live</p>
        <h1 className="font-display font-extrabold text-2xl tracking-tight mb-6">Admin sign in</h1>

        <div className="mb-4">
          <label className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3.5 py-3 text-[16px] bg-bone border border-line rounded-[10px] focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold"
          />
        </div>
        <div className="mb-6">
          <label className="block font-mono text-[10.5px] uppercase tracking-wider text-muted mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3.5 py-3 text-[16px] bg-bone border border-line rounded-[10px] focus:outline-none focus:border-marigold focus:ring-2 focus:ring-marigold"
          />
        </div>

        {error && <p className="text-live-ink text-sm mb-4">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-full bg-ink text-bone font-semibold hover:bg-marigold hover:text-ink transition-colors disabled:opacity-60"
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
