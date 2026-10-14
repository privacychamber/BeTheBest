"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { QuickAddModal } from "@/components/QuickAddModal";
import {
  TrendingUp,
  DollarSign,
  Zap,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ShieldAlert,
  ShieldCheck,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Opportunity, BudgetPeriod, Profile, SessionUser } from "@/types";

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [stats, setStats] = useState({
    totalPipelineValueCents: 0,
    activeOpportunitiesCount: 0,
    proposalsSubmitted: 0,
    wonDealsCount: 0,
    totalRevenueCents: 0,
    connectsRemaining: 252,
    connectsTotal: 300,
  });
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Current user
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      if (userData.authenticated) setCurrentUser(userData.user);

      // 2. Opportunities
      const oppRes = await fetch("/api/opportunities?limit=10");
      const oppData = await oppRes.json();
      if (oppData.success) {
        setOpportunities(oppData.items);
        const pipelineTotal = oppData.items.reduce(
          (acc: number, item: Opportunity) => acc + (item.budgetAmountCents || 0),
          0
        );
        setStats((prev) => ({
          ...prev,
          totalPipelineValueCents: pipelineTotal,
          activeOpportunitiesCount: oppData.pagination.total,
        }));
      }

      // 3. Profiles
      const profRes = await fetch("/api/profiles");
      const profData = await profRes.json();
      if (profData.success) {
        setProfiles(profData.profiles);
      }

      // 4. Financial summary
      const finRes = await fetch("/api/finances");
      const finData = await finRes.json();
      if (finData.success) {
        setStats((prev) => ({
          ...prev,
          totalRevenueCents: finData.summary.totalRevenueCents,
        }));
      }
    } catch {
      // Keep mock/fallback values if unauthenticated
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const rakeshProfile = profiles.find((p) => p.name.toLowerCase().includes("rakesh"));

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100">
      <Navbar currentUser={currentUser} onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 border border-white/10 glass-panel bg-gradient-to-r from-blue-950/40 via-slate-900/60 to-emerald-950/30">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-xs font-semibold text-blue-400 mb-3">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Bidding Operations & BD Hub</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome back, {currentUser?.name || "Devon Vance"}
              </h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Real-time Upwork and Freelancer.com pipeline tracking, connects allocation governance, and delivery operations.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsQuickAddOpen(true)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 via-cyan-500 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 shadow-glow flex items-center gap-2 transition-all"
              >
                <Zap className="w-4 h-4" />
                <span>+ Quick Add Opportunity</span>
              </button>
            </div>
          </div>
        </div>

        {/* Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Card 1: Pipeline Value */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Pipeline Value</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white">
                {formatCurrency(stats.totalPipelineValueCents || 1500000)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-400 font-semibold">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Active Qualified Deals</span>
              </div>
            </div>
          </div>

          {/* Card 2: Connects Quota & Burn */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Weekly Connects</span>
              <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Zap className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white">
                252 <span className="text-sm font-normal text-slate-400">/ 300</span>
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-cyan-400 font-semibold">
                <span>48 connects spent this week</span>
              </div>
            </div>
          </div>

          {/* Card 3: Win Rate & Interview Rate */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Interview Rate</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white">28.4%</div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-purple-400 font-semibold">
                <span>Above agency benchmark</span>
              </div>
            </div>
          </div>

          {/* Card 4: Total Won Revenue */}
          <div className="glass-card rounded-2xl p-5 border border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Won Revenue</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-2xl font-black text-white">
                {formatCurrency(stats.totalRevenueCents || 1000000)}
              </div>
              <div className="flex items-center gap-1.5 mt-1 text-xs text-emerald-400 font-semibold">
                <span>Contracted revenue</span>
              </div>
            </div>
          </div>
        </div>

        {/* Governance & Integrity Guards Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Card: Rakesh Profile Guard */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 lg:col-span-1">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Budget Guard Status</h3>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Strict Rule
              </span>
            </div>
            <div className="mt-4 space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Rakesh Profile</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rakeshProfile?.status === "ACTIVE"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    }`}
                  >
                    {rakeshProfile?.status || "REVIEW_REQUIRED"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  {rakeshProfile?.status === "ACTIVE"
                    ? "Cleared by Administrator. Budget allocations authorized."
                    : "Review required state active. System automatically blocks budget releases and proposal spends."}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">Thursday Top-Up Rule</span>
                  <span className="text-[10px] font-semibold text-blue-400">Manual Approval</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Initial 300 connects. Optional +200 top-up on Thursdays strictly requires explicit Admin approval. 500 weekly cap.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Opportunities Pipeline */}
          <div className="glass-card rounded-2xl p-5 border border-white/10 lg:col-span-2">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Active Opportunity Pipeline</h3>
              </div>
              <a
                href="/pipeline"
                className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <span>View Full Pipeline</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="mt-4 divide-y divide-white/5">
              {opportunities.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Loading opportunities or pipeline is empty. Click &quot;+ Quick Add Opportunity&quot; to begin.
                </div>
              ) : (
                opportunities.map((opp) => (
                  <div key={opp._id} className="py-3 flex items-center justify-between gap-4 group">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                          {opp.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-white/10">
                          {opp.platform}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-3">
                        <span>{opp.clientName}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-semibold">
                          {formatCurrency(opp.budgetAmountCents)}
                        </span>
                        {opp.score !== undefined && (
                          <>
                            <span>•</span>
                            <span className="text-blue-400 font-semibold">Score: {opp.score}/100</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          opp.status === "QUALIFIED"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : opp.status === "DISQUALIFIED"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : opp.status === "PROPOSAL_SUBMITTED"
                            ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            : "bg-slate-800 text-slate-300 border border-white/10"
                        }`}
                      >
                        {opp.status}
                      </span>
                      <a
                        href={opp.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Open Job Posting"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Quick Add Modal */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onJobAdded={loadData}
      />
    </div>
  );
}
