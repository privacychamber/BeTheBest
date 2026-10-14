"use client";

import React, { useState } from "react";
import { X, Sparkles, AlertCircle, CheckCircle2 } from "lucide-react";
import type { Platform, BudgetType } from "@/types";

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobAdded?: () => void;
}

export function QuickAddModal({ isOpen, onClose, onJobAdded }: QuickAddModalProps) {
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [platform, setPlatform] = useState<Platform>("UPWORK");
  const [jobUrl, setJobUrl] = useState("");
  const [budgetType, setBudgetType] = useState<BudgetType>("FIXED");
  const [budgetDollars, setBudgetDollars] = useState<number>(1500);
  const [tagInput, setTagInput] = useState("Next.js, TypeScript, Cloud");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const tags = tagInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const res = await fetch("/api/opportunities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          clientName,
          platform,
          jobUrl,
          budgetType,
          budgetAmountCents: Math.round(budgetDollars * 100),
          tags,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create opportunity");
      }

      setSuccess(true);
      setTimeout(() => {
        onJobAdded?.();
        onClose();
      }, 700);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#0C1222] p-6 shadow-glass text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Quick Add Bidding Job</h3>
              <p className="text-xs text-slate-400">Add an incoming lead to the qualification pipeline</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>Opportunity created and added to pipeline!</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Job Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Full Stack Next.js & MongoDB Platform Development"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500 transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Platform *</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="UPWORK">Upwork</option>
                <option value="FREELANCER">Freelancer.com</option>
                <option value="DIRECT">Direct Lead / RFP</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Client Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Apex Global Tech"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Job Posting URL *</label>
            <input
              type="url"
              required
              placeholder="https://www.upwork.com/jobs/~..."
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Budget Type</label>
              <select
                value={budgetType}
                onChange={(e) => setBudgetType(e.target.value as BudgetType)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="FIXED">Fixed Price</option>
                <option value="HOURLY">Hourly Rate</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {budgetType === "FIXED" ? "Estimated Budget ($)" : "Hourly Rate ($/hr)"}
              </label>
              <input
                type="number"
                min="1"
                required
                value={budgetDollars}
                onChange={(e) => setBudgetDollars(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tags (Comma-separated)</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Next.js, React, Node.js"
              className="w-full px-3 py-2 rounded-xl bg-slate-900/80 border border-white/10 text-sm text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-glow disabled:opacity-50 transition-all"
            >
              {loading ? "Adding..." : "Add to Pipeline"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
