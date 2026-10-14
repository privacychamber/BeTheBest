"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import {
  Send,
  Eye,
  MessageSquare,
  Award,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Proposal, SessionUser } from "@/types";

export default function ProposalsPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      if (userData.authenticated) setCurrentUser(userData.user);

      // In real DB, we can also load proposals
    } catch {
      //
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100">
      <Navbar currentUser={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Proposals & Conversion Funnel</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Active Funnel
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Proposal submissions, client views, interview invitations, and win conversions.
            </p>
          </div>
        </div>

        {/* Funnel Metrics Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="glass-card rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-semibold text-slate-400">Total Proposals</div>
            <div className="text-2xl font-black text-white mt-1">42</div>
            <div className="text-[11px] text-blue-400 mt-1">672 connects invested</div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-semibold text-slate-400">Client View Rate</div>
            <div className="text-2xl font-black text-white mt-1">54.8%</div>
            <div className="text-[11px] text-cyan-400 mt-1">23 viewed by clients</div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-semibold text-slate-400">Interview Rate</div>
            <div className="text-2xl font-black text-white mt-1">28.6%</div>
            <div className="text-[11px] text-purple-400 mt-1">12 scheduled interviews</div>
          </div>
          <div className="glass-card rounded-2xl p-4 border border-white/10">
            <div className="text-xs font-semibold text-slate-400">Win Rate</div>
            <div className="text-2xl font-black text-white mt-1">9.5%</div>
            <div className="text-[11px] text-emerald-400 mt-1">4 won contracts ($42,000)</div>
          </div>
        </div>

        {/* Informative Table / Pipeline Card */}
        <div className="glass-card rounded-2xl p-6 border border-white/10">
          <h2 className="text-sm font-bold text-white mb-4">Recent Proposal Outcomes</h2>
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white">Enterprise AI Workflow & Next.js SaaS Platform</span>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                  <span>Profile: <strong>Alex C. (Upwork)</strong></span>
                  <span>•</span>
                  <span>Bid: <strong>$15,000</strong></span>
                  <span>•</span>
                  <span>Connects: <strong>16</strong></span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 self-start md:self-auto">
                Interviewing (Tech Screen)
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <span className="text-xs font-bold text-white">Full Stack React & Node Dashboard Overhaul</span>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                  <span>Profile: <strong>Alex C. (Upwork)</strong></span>
                  <span>•</span>
                  <span>Bid: <strong>$4,500</strong></span>
                  <span>•</span>
                  <span>Connects: <strong>16</strong></span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 self-start md:self-auto">
                Won Deal ($4,500)
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
