"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { QuickAddModal } from "@/components/QuickAddModal";
import { QualifyModal } from "@/components/QualifyModal";
import { ProposalModal } from "@/components/ProposalModal";
import {
  Zap,
  Award,
  Send,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Opportunity, Profile, SessionUser, OpportunityStatus } from "@/types";

export default function PipelinePage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [platformFilter, setPlatformFilter] = useState<string>("ALL");

  // Modals
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [qualifyOpp, setQualifyOpp] = useState<Opportunity | null>(null);
  const [proposalOpp, setProposalOpp] = useState<Opportunity | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const userRes = await fetch("/api/auth/me");
      const userData = await userRes.json();
      if (userData.authenticated) setCurrentUser(userData.user);

      const [oppRes, profRes] = await Promise.all([
        fetch("/api/opportunities?limit=50"),
        fetch("/api/profiles"),
      ]);

      const oppData = await oppRes.json();
      const profData = await profRes.json();

      if (oppData.success) setOpportunities(oppData.items);
      if (profData.success) setProfiles(profData.profiles);
    } catch {
      // Handle error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = opportunities.filter((opp) => {
    const matchesSearch =
      opp.title.toLowerCase().includes(search.toLowerCase()) ||
      opp.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || opp.status === statusFilter;
    const matchesPlatform = platformFilter === "ALL" || opp.platform === platformFilter;
    return matchesSearch && matchesStatus && matchesPlatform;
  });

  const getStatusBadge = (status: OpportunityStatus) => {
    switch (status) {
      case "QUALIFIED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Qualified</span>;
      case "DISQUALIFIED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">Disqualified</span>;
      case "PROPOSAL_SUBMITTED":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">Proposal Sent</span>;
      case "INTERVIEWING":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">Interviewing</span>;
      case "WON":
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">Won Deal</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-white/10">New Lead</span>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100">
      <Navbar currentUser={currentUser} onOpenQuickAdd={() => setIsQuickAddOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <span>Bidding Opportunity Pipeline</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                {filtered.length} Deals
              </span>
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Qualification scoring, proposal tracking, and client conversion workflow.
            </p>
          </div>

          <button
            onClick={() => setIsQuickAddOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-glow flex items-center gap-2 shrink-0 transition-all"
          >
            <Zap className="w-4 h-4" />
            <span>+ Quick Add Job</span>
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-4 rounded-2xl glass-card border border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by job title or client name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">New</option>
              <option value="QUALIFIED">Qualified</option>
              <option value="DISQUALIFIED">Disqualified</option>
              <option value="PROPOSAL_SUBMITTED">Proposal Submitted</option>
              <option value="INTERVIEWING">Interviewing</option>
              <option value="WON">Won</option>
            </select>

            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
            >
              <option value="ALL">All Platforms</option>
              <option value="UPWORK">Upwork</option>
              <option value="FREELANCER">Freelancer.com</option>
              <option value="DIRECT">Direct Lead</option>
            </select>
          </div>
        </div>

        {/* Opportunities List */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="glass-card rounded-2xl p-12 text-center border border-white/10">
              <Zap className="w-10 h-10 text-slate-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">No opportunities match criteria</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Adjust your filters or click &quot;+ Quick Add Job&quot; to submit a new RFP lead to the queue.
              </p>
            </div>
          ) : (
            filtered.map((opp) => (
              <div
                key={opp._id}
                className="glass-card rounded-2xl p-5 border border-white/10 hover:border-blue-500/30 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    {getStatusBadge(opp.status)}
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-white/5">
                      {opp.platform}
                    </span>
                    {opp.score !== undefined && (
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                        opp.score >= 65 ? "bg-blue-500/20 text-blue-300" : "bg-rose-500/20 text-rose-300"
                      }`}>
                        Score: {opp.score}/100
                      </span>
                    )}
                  </div>

                  <h3 className="text-sm font-bold text-white hover:text-cyan-400 transition-colors">
                    {opp.title}
                  </h3>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5">
                    <span>Client: <strong className="text-slate-200">{opp.clientName}</strong></span>
                    <span>•</span>
                    <span>Budget: <strong className="text-emerald-400">{formatCurrency(opp.budgetAmountCents)}</strong> ({opp.budgetType})</span>
                    <span>•</span>
                    <span>Added {formatDate(opp.createdAt)}</span>
                  </div>

                  {opp.qualificationNotes && (
                    <p className="text-xs text-slate-400 mt-2 italic bg-slate-900/40 p-2 rounded-lg border border-white/5">
                      &ldquo;{opp.qualificationNotes}&rdquo;
                    </p>
                  )}
                  {opp.hardStopReason && (
                    <p className="text-xs text-rose-400 mt-1 font-semibold">
                      ⚠ Hard Stop: {opp.hardStopReason}
                    </p>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-white/5">
                  <button
                    onClick={() => setQualifyOpp(opp)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5 transition-colors"
                  >
                    <Award className="w-3.5 h-3.5" />
                    <span>Qualify</span>
                  </button>

                  <button
                    onClick={() => setProposalOpp(opp)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Bid & Connects</span>
                  </button>

                  <a
                    href={opp.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    title="Open original job posting"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Modals */}
      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onJobAdded={loadData}
      />
      <QualifyModal
        isOpen={!!qualifyOpp}
        opportunity={qualifyOpp}
        onClose={() => setQualifyOpp(null)}
        onQualified={loadData}
      />
      <ProposalModal
        isOpen={!!proposalOpp}
        opportunity={proposalOpp}
        profiles={profiles}
        onClose={() => setProposalOpp(null)}
        onSubmitted={loadData}
      />
    </div>
  );
}
