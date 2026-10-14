"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import {
  DollarSign,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  TrendingUp,
  AlertTriangle,
  Send,
  Plus,
} from "lucide-react";
import { getMondayOfWeek } from "@/lib/budget";
import { formatDate } from "@/lib/utils";
import type { Profile, BudgetPeriod, BidTransaction, SessionUser } from "@/types";

export default function BudgetPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [periods, setPeriods] = useState<BudgetPeriod[]>([]);
  const [transactions, setTransactions] = useState<BidTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Clearance Modal State
  const [clearingProfile, setClearingProfile] = useState<Profile | null>(null);
  const [clearanceNotes, setClearanceNotes] = useState("");
  const [clearanceLoading, setClearanceLoading] = useState(false);

  // Top-Up Request Modal State
  const [requestingPeriod, setRequestingPeriod] = useState<BudgetPeriod | null>(null);
  const [topUpAmount, setTopUpAmount] = useState<number>(150);
  const [topUpReason, setTopUpReason] = useState("");
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Admin Initial Allocation Modal State
  const [allocatingProfile, setAllocatingProfile] = useState<Profile | null>(null);
  const [initialAmount, setInitialAmount] = useState<number>(300);
  const [allocatingLoading, setAllocatingLoading] = useState(false);

  // Error/Success banner
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      if (userData.authenticated) setCurrentUser(userData.user);

      const profRes = await fetch("/api/profiles");
      const profData = await profRes.json();
      if (profData.success) setProfiles(profData.profiles);
    } catch {
      // Error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleClearReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearingProfile) return;
    setClearanceLoading(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/profiles/${clearingProfile._id}/clear-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: clearanceNotes,
          targetStatus: "ACTIVE",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Clearance failed");
      }

      setMessage({ type: "success", text: `Review cleared for ${clearingProfile.name}! Profile is now Active.` });
      setClearingProfile(null);
      setClearanceNotes("");
      loadData();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to clear review" });
    } finally {
      setClearanceLoading(false);
    }
  };

  const handleAllocateInitial = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingProfile) return;
    setAllocatingLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/budget/allocate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId: allocatingProfile._id,
          weekStartDate: getMondayOfWeek(),
          allocationAmount: Number(initialAmount),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Allocation failed");
      }

      setMessage({ type: "success", text: `Allocated ${initialAmount} Connects to ${allocatingProfile.name}!` });
      setAllocatingProfile(null);
      loadData();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to allocate budget" });
    } finally {
      setAllocatingLoading(false);
    }
  };

  const handleRequestTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestingPeriod) return;
    setTopUpLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/budget/topup/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId: requestingPeriod._id,
          requestedAmount: Number(topUpAmount),
          reason: topUpReason,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Top-up request failed");
      }

      setMessage({ type: "success", text: `Thursday top-up of ${topUpAmount} Connects requested for Admin review!` });
      setRequestingPeriod(null);
      setTopUpReason("");
      loadData();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to request top-up" });
    } finally {
      setTopUpLoading(false);
    }
  };

  const handleReviewTopUp = async (periodId: string, decision: "APPROVED" | "REJECTED") => {
    try {
      const res = await fetch("/api/budget/topup/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodId,
          decision,
          notes: decision === "APPROVED" ? "Approved by Admin" : "Declined due to budget threshold",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Top-up review failed");
      }

      setMessage({ type: "success", text: `Top-up decision (${decision}) recorded successfully!` });
      loadData();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to review top-up" });
    }
  };

  const isAdmin = currentUser?.role === "ADMIN";

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100">
      <Navbar currentUser={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Connects & Bidding Budget Command</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Weekly Governance
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Initial 300 Connects baseline • Thursday top-up up to 200 • Maximum 500 Connects weekly cap.
            </p>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div
            className={`p-4 rounded-2xl border text-xs flex items-center gap-2.5 ${
              message.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/15 border-rose-500/30 text-rose-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Profiles Table */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Bidding Profiles & Weekly Allocations</span>
            </h2>
            <span className="text-xs text-slate-400">Current Week: {getMondayOfWeek()}</span>
          </div>

          <div className="divide-y divide-white/5">
            {profiles.map((profile) => {
              const isRakesh = profile.name.toLowerCase().includes("rakesh");
              const isReviewRequired = profile.status === "REVIEW_REQUIRED";

              return (
                <div
                  key={profile._id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-sm font-bold text-white">{profile.name}</h3>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                        {profile.platform}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          profile.status === "ACTIVE"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : profile.status === "REVIEW_REQUIRED"
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {profile.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                      <span>Weekly Cap: <strong className="text-slate-200">{profile.weeklyAllocationCap || 500} Connects</strong></span>
                      {profile.sharedAgencyConnectsBalance !== undefined && (
                        <>
                          <span>•</span>
                          <span>Shared Agency Pool: <strong className="text-purple-400">{profile.sharedAgencyConnectsBalance} Connects</strong></span>
                        </>
                      )}
                    </div>

                    {profile.reviewNotes && (
                      <p className="text-xs text-amber-300/80 mt-1.5 flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                        <span>{profile.reviewNotes}</span>
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isReviewRequired && isAdmin && (
                      <button
                        onClick={() => setClearingProfile(profile)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Clear Review</span>
                      </button>
                    )}

                    {profile.status === "ACTIVE" && isAdmin && (
                      <button
                        onClick={() => setAllocatingProfile(profile)}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Allocate Initial (Max 300)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Admin Clearance Modal */}
      {clearingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C1222] p-6 shadow-glass text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-amber-400" />
              <span>Managerial Profile Clearance</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Clearing restriction for <strong>{clearingProfile.name}</strong>.
            </p>

            <form onSubmit={handleClearReview} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Audit Justification & Notes *
                </label>
                <textarea
                  required
                  minLength={5}
                  rows={3}
                  value={clearanceNotes}
                  onChange={(e) => setClearanceNotes(e.target.value)}
                  placeholder="e.g. Rate card verified, identity verification confirmed, manager authorization granted."
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setClearingProfile(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={clearanceLoading}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-glow disabled:opacity-50"
                >
                  {clearanceLoading ? "Recording..." : "Authorize Clearance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Initial Allocation Modal */}
      {allocatingProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C1222] p-6 shadow-glass text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-400" />
              <span>Initial Weekly Budget Allocation</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Profile: <strong>{allocatingProfile.name}</strong> (Baseline: Up to 300 Connects).
            </p>

            <form onSubmit={handleAllocateInitial} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Connects Amount (1 to 300) *
                </label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  required
                  value={initialAmount}
                  onChange={(e) => setInitialAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setAllocatingProfile(null)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={allocatingLoading}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-glow disabled:opacity-50"
                >
                  {allocatingLoading ? "Allocating..." : "Set Weekly Baseline"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
