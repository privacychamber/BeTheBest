"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, ArrowRight, Sparkles, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  // Demo switcher and prefilled test credentials are strictly restricted to development/test.
  // In production, isDemoAllowed evaluates to false and the entire demo section is omitted.
  const isDemoAllowed =
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true";

  const [email, setEmail] = useState(isDemoAllowed ? "admin@bethebest.com" : "");
  const [password, setPassword] = useState(isDemoAllowed ? "Password123!" : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (overrideEmail?: string, overridePassword?: string) => {
    setLoading(true);
    setError(null);

    const loginEmail = overrideEmail || email;
    const loginPassword = overridePassword || password;

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Authentication failed");
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    {
      name: "Devon Vance",
      role: "BD Lead & Admin",
      email: "admin@bethebest.com",
      badgeClass: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
    {
      name: "Alex Cross",
      role: "Bidding Specialist",
      email: "bidder@bethebest.com",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    {
      name: "Elena Rostova",
      role: "Project Coordinator",
      email: "coordinator@bethebest.com",
      badgeClass: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-400 p-[1.5px] shadow-glow mb-4">
            <div className="w-full h-full bg-[#080C16] rounded-[14px] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">BeTheBest</h1>
          <p className="text-xs text-slate-400 mt-1">Internal Business Development & Bidding Console</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-3xl p-8 border border-white/10 shadow-glass">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-white">Sign In to Workspace</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isDemoAllowed
                ? "Enter your credentials or choose a test role"
                : "Enter your authorized organization credentials"}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-glow disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              <span>{loading ? "Authenticating..." : "Sign In"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Quick Demo Switcher - Strictly omitted in Production */}
          {isDemoAllowed && (
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Instant Test Sign-In</span>
              </div>
              <div className="space-y-2">
                {demoAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => {
                      setEmail(acc.email);
                      handleLogin(acc.email, "Password123!");
                    }}
                    disabled={loading}
                    className="w-full p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-blue-500/30 flex items-center justify-between text-left transition-all"
                  >
                    <div>
                      <div className="text-xs font-semibold text-white">{acc.name}</div>
                      <div className="text-[11px] text-slate-400">{acc.email}</div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${acc.badgeClass}`}>
                      {acc.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
