"use client";

import React, { useState } from "react";
import { X, Send, AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import type { Opportunity, Profile } from "@/types";

interface ProposalModalProps {
  isOpen: boolean;
  opportunity: Opportunity | null;
  profiles: Profile[];
  onClose: () => void;
  onSubmitted?: () => void;
}

export function ProposalModal({
  isOpen,
  opportunity,
  profiles,
  onClose,
  onSubmitted,
}: ProposalModalProps) {
  const [profileId, setProfileId] = useState<string>(profiles[0]?._id || "");
  const [connectsUsed, setConnectsUsed] = useState<number>(16);
  const [bidDollars, setBidDollars] = useState<number>(
    opportunity?.budgetAmountCents ? opportunity.budgetAmountCents / 100 : 1500
  );
  const [proposalText, setProposalText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !opportunity) return null;

  const selectedProfile = profiles.find((p) => p._id === profileId);
  const isProfileBlocked = selectedProfile?.status === "REVIEW_REQUIRED";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          opportunityId: opportunity._id,
          profileId: profileId || profiles[0]?._id,
          proposalText,
          bidAmountCents: Math.round(bidDollars * 100),
          connectsUsed: Number(connectsUsed),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Proposal submission failed");
      }

      onSubmitted?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit proposal");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C1222] p-6 shadow-glass text-slate-100">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Submit Proposal & Record Connects</h3>
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

        {isProfileBlocked && (
          <div className="mt-4 p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
            <span>This profile has &apos;Review required&apos; status. Budget usage and submission are blocked.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Select Bidding Profile *
            </label>
            <select
              value={profileId}
              onChange={(e) => setProfileId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white"
            >
              {profiles.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} ({p.platform} - {p.status})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Connects to Deduct
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={connectsUsed}
                onChange={(e) => setConnectsUsed(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">Standard bid: 16 connects</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Bid Amount ($) *
              </label>
              <input
                type="number"
                min="1"
                required
                value={bidDollars}
                onChange={(e) => setBidDollars(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Proposal Pitch / Submission Text *
            </label>
            <textarea
              rows={4}
              required
              minLength={20}
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              placeholder="Paste the tailored cover letter or RFP bid response submitted to the client..."
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-xs text-white"
            />
            <span className="text-[10px] text-slate-400">Minimum 20 characters required.</span>
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
              disabled={loading || isProfileBlocked}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-glow disabled:opacity-50"
            >
              {loading ? "Recording..." : "Deduct Connects & Submit"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
