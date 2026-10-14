"use client";

import React, { useState, useEffect } from "react";
import { X, Award, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { evaluateQualification } from "@/lib/scoring";
import type { Opportunity } from "@/types";

interface QualifyModalProps {
  isOpen: boolean;
  opportunity: Opportunity | null;
  onClose: () => void;
  onQualified?: () => void;
}

export function QualifyModal({ isOpen, opportunity, onClose, onQualified }: QualifyModalProps) {
  const [paymentVerified, setPaymentVerified] = useState(true);
  const [clientSpendDollars, setClientSpendDollars] = useState(5000);
  const [hireRate, setHireRate] = useState(60);
  const [budgetFit, setBudgetFit] = useState(18);
  const [skillsMatch, setSkillsMatch] = useState(18);
  const [competition, setCompetition] = useState(12);
  const [hardStop, setHardStop] = useState(false);
  const [hardStopReason, setHardStopReason] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !opportunity) return null;

  // Live preview calculation
  const evalResult = evaluateQualification({
    clientPaymentVerified: paymentVerified,
    clientSpendCents: Math.round(clientSpendDollars * 100),
    clientHireRatePercent: hireRate,
    budgetFitScore: budgetFit,
    skillsMatchScore: skillsMatch,
    proposalCompetitionScore: competition,
    budgetAmountCents: opportunity.budgetAmountCents,
    hourlyRateMinCents: opportunity.hourlyRateMinCents,
    hourlyRateMaxCents: opportunity.hourlyRateMaxCents,
    isHourly: opportunity.budgetType === "HOURLY",
    manualHardStop: hardStop,
    manualHardStopReason: hardStopReason,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/opportunities/${opportunity._id}/qualify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientPaymentVerified: paymentVerified,
          clientSpendCents: Math.round(clientSpendDollars * 100),
          clientHireRatePercent: hireRate,
          budgetFitScore: budgetFit,
          skillsMatchScore: skillsMatch,
          proposalCompetitionScore: competition,
          hardStopTriggered: hardStop,
          hardStopReason: hardStop ? hardStopReason : undefined,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Qualification assessment failed");
      }

      onQualified?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Assessment failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl rounded-2xl border border-white/10 bg-[#0C1222] p-6 shadow-glass text-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Qualification Assessment</h3>
              <p className="text-xs text-slate-400 line-clamp-1">{opportunity.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Live Score Preview Header */}
        <div className="mt-4 p-4 rounded-xl bg-slate-900/80 border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-mono text-slate-400">Score Preview</span>
            <div className="text-3xl font-black text-white flex items-baseline gap-1">
              <span>{evalResult.totalScore}</span>
              <span className="text-xs font-semibold text-slate-400">/ 100</span>
            </div>
          </div>
          <div>
            {evalResult.passed ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold">
                <CheckCircle2 className="w-4 h-4" />
                <span>QUALIFIED</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold">
                <AlertTriangle className="w-4 h-4" />
                <span>{evalResult.hardStopTriggered ? "HARD-STOP DISQUALIFIED" : "BELOW THRESHOLD (< 65)"}</span>
              </span>
            )}
          </div>
        </div>

        {evalResult.hardStopTriggered && (
          <div className="mt-2 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
            <strong>Hard-stop triggered:</strong> {evalResult.hardStopReason}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Payment Verified & Spend */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-900/50 border border-white/5 flex items-center justify-between">
              <div>
                <label className="text-xs font-semibold text-white block">Payment Verified</label>
                <span className="text-[10px] text-slate-400">+20 pts</span>
              </div>
              <input
                type="checkbox"
                checked={paymentVerified}
                onChange={(e) => setPaymentVerified(e.target.checked)}
                className="w-5 h-5 rounded accent-blue-600 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1">
                Client Total Spend ($)
              </label>
              <input
                type="number"
                min="0"
                value={clientSpendDollars}
                onChange={(e) => setClientSpendDollars(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white"
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">
                {clientSpendDollars >= 10000 ? "+25 pts (>= $10k)" : clientSpendDollars >= 1000 ? "+15 pts (>= $1k)" : "+5 pts"}
              </span>
            </div>
          </div>

          {/* Hire Rate */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
              <span>Client Hire Rate: {hireRate}%</span>
              <span className="text-slate-400">{hireRate >= 50 ? "+20 pts" : hireRate >= 30 ? "+10 pts" : "0 pts"}</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={hireRate}
              onChange={(e) => setHireRate(Number(e.target.value))}
              className="w-full accent-blue-500"
            />
          </div>

          {/* Budget Fit & Skills Match */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Budget Fit: {budgetFit}/20</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={budgetFit}
                onChange={(e) => setBudgetFit(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>Skills Alignment: {skillsMatch}/20</span>
              </div>
              <input
                type="range"
                min="0"
                max="20"
                value={skillsMatch}
                onChange={(e) => setSkillsMatch(Number(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>
          </div>

          {/* Proposal Competition */}
          <div>
            <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
              <span>Competition Window: {competition}/15</span>
              <span className="text-slate-400">Under 15 proposals = higher points</span>
            </div>
            <input
              type="range"
              min="0"
              max="15"
              value={competition}
              onChange={(e) => setCompetition(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          {/* Manual Hard Stop Toggle */}
          <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Manual Hard-Stop Disqualification</span>
              </label>
              <input
                type="checkbox"
                checked={hardStop}
                onChange={(e) => setHardStop(e.target.checked)}
                className="w-4 h-4 rounded accent-rose-600"
              />
            </div>
            {hardStop && (
              <input
                type="text"
                placeholder="Reason (e.g. Scope red flags, blacklisted tech, unresponsive client)"
                value={hardStopReason}
                onChange={(e) => setHardStopReason(e.target.value)}
                className="w-full mt-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-rose-500/30 text-xs text-rose-200"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Assessment Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why this job is a fit, specific pitch angle, or disqualification note..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white"
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-glow disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Qualification Decision"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
