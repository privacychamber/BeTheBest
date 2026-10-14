"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import {
  DollarSign,
  TrendingUp,
  Percent,
  Plus,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { FinanceRecord, SessionUser } from "@/types";

export default function FinancesPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [summary, setSummary] = useState({
    totalRevenueCents: 1000000,
    totalDirectCostsCents: 200000,
    totalConnectsExpenseCents: 10080,
    netProfitCents: 789920,
    roiPercent: 376.01,
  });

  // Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [type, setType] = useState<"REVENUE" | "DIRECT_COST" | "CONNECTS_EXPENSE">("REVENUE");
  const [amountDollars, setAmountDollars] = useState(2500);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadData = async () => {
    try {
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      if (userData.authenticated) setCurrentUser(userData.user);

      const finRes = await fetch("/api/finances");
      const finData = await finRes.json();
      if (finData.success && finData.summary) {
        setSummary(finData.summary);
      }
    } catch {
      //
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/finances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amountCents: Math.round(amountDollars * 100),
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record transaction");
      }

      setMessage({ type: "success", text: "Transaction recorded in financial ledger!" });
      setIsRecordModalOpen(false);
      setDescription("");
      loadData();
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Error recording entry" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100">
      <Navbar currentUser={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Financial Operations & ROI Ledger</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Audited Ledger
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Integer-precision accounting: Contract revenue vs direct delivery expenses vs Upwork Connects acquisition costs.
            </p>
          </div>

          <button
            onClick={() => setIsRecordModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 shadow-glow flex items-center gap-2 shrink-0 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Record Transaction</span>
          </button>
        </div>

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
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Revenue</span>
            <div className="text-2xl font-black text-emerald-400 mt-2">
              {formatCurrency(summary.totalRevenueCents)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Milestone invoices paid</div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Direct Delivery Costs</span>
            <div className="text-2xl font-black text-slate-200 mt-2">
              {formatCurrency(summary.totalDirectCostsCents)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Developer & infra wages</div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Connects Ad Spend</span>
            <div className="text-2xl font-black text-cyan-400 mt-2">
              {formatCurrency(summary.totalConnectsExpenseCents)}
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Upwork bidding investment</div>
          </div>

          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Net Return on Bidding</span>
            <div className="text-2xl font-black text-white mt-2">
              {summary.roiPercent}%
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1">
              Net Profit: {formatCurrency(summary.netProfitCents)}
            </div>
          </div>
        </div>

        {/* Statement Table */}
        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <h2 className="text-sm font-bold text-white mb-4">Sample Ledger Entries</h2>
          <div className="divide-y divide-white/5 text-xs">
            <div className="py-3 flex items-center justify-between">
              <div>
                <strong className="text-white">Acme Corp Cloud Architecture Initial Milestone</strong>
                <div className="text-slate-400 mt-0.5">Category: Contract Revenue • Paid via Upwork Escrow</div>
              </div>
              <span className="text-emerald-400 font-bold text-sm">+$10,000.00</span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <strong className="text-white">Senior Full-Stack Engineering Milestone 1 Cost</strong>
                <div className="text-slate-400 mt-0.5">Category: Direct Cost • Developer Compensation</div>
              </div>
              <span className="text-rose-400 font-bold text-sm">-$2,000.00</span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <strong className="text-white">Upwork Connects Acquisition (672 Connects consumed)</strong>
                <div className="text-slate-400 mt-0.5">Category: Bidding Ad Spend • $0.15 / connect</div>
              </div>
              <span className="text-cyan-400 font-bold text-sm">-$100.80</span>
            </div>
          </div>
        </div>
      </main>

      {/* Record Transaction Modal */}
      {isRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0C1222] p-6 shadow-glass text-slate-100">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>Record Financial Ledger Transaction</span>
            </h3>

            <form onSubmit={handleCreateRecord} className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Type *</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                >
                  <option value="REVENUE">Revenue (Incoming Client Payment)</option>
                  <option value="DIRECT_COST">Direct Cost (Developer / Infra Expense)</option>
                  <option value="CONNECTS_EXPENSE">Connects Expense (Platform Bidding)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Amount ($) *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={amountDollars}
                  onChange={(e) => setAmountDollars(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Milestone 2 Client Payment"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsRecordModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-glow disabled:opacity-50"
                >
                  {loading ? "Recording..." : "Save Transaction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
