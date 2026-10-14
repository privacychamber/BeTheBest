"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import {
  Briefcase,
  ExternalLink,
  FolderGit2,
  HardDrive,
  MessageSquare,
  CheckCircle2,
  Clock,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { ProjectHandover, Contract, SessionUser } from "@/types";

export default function HandoversPage() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [handovers, setHandovers] = useState<ProjectHandover[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) setCurrentUser(data.user);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100">
      <Navbar currentUser={currentUser} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>Project Delivery Handovers</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
              Coordinator Console
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Seamless transition from won bidding contracts to engineering delivery and client kickoffs.
          </p>
        </div>

        {/* Handover Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[11px] font-mono text-cyan-400 uppercase">Contract #BB-2026-001</span>
                <h3 className="text-base font-bold text-white mt-0.5">Acme Corp Cloud Architecture</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                In Progress
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Client onboarding complete. Architecture blueprint shared in Google Drive. Next.js & MongoDB template initialized.
            </p>

            <div className="space-y-2 text-xs text-slate-400 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-slate-400" />
                  <span>GitHub Repository:</span>
                </span>
                <a
                  href="https://github.com/privacychamber/BeTheBest"
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <span>privacychamber/BeTheBest</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-400" />
                  <span>Google Drive Folder:</span>
                </span>
                <span className="text-slate-300">Project Assets / Briefs</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span>Communication:</span>
                </span>
                <span className="text-slate-300">Slack (#acme-delivery)</span>
              </div>
            </div>

            <div className="pt-3 flex justify-between items-center text-[11px] text-slate-400">
              <span>Assigned Coordinator: <strong>Elena Rostova</strong></span>
              <span>Handed Over: {formatDate(new Date())}</span>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <span className="text-[11px] font-mono text-cyan-400 uppercase">Contract #BB-2026-002</span>
                <h3 className="text-base font-bold text-white mt-0.5">Nexus AI Workflow Platform</h3>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Pending Kickoff
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Proposal accepted for $15,000 fixed milestone scope. Kickoff call scheduled for Thursday 10:00 AM EST.
            </p>

            <div className="space-y-2 text-xs text-slate-400 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-slate-400" />
                  <span>GitHub Repository:</span>
                </span>
                <span className="text-slate-400">nexus-ai-workflow (Pending)</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-slate-400" />
                  <span>Communication:</span>
                </span>
                <span className="text-slate-300">Upwork Messages</span>
              </div>
            </div>

            <div className="pt-3 flex justify-between items-center text-[11px] text-slate-400">
              <span>Assigned Coordinator: <strong>Elena Rostova</strong></span>
              <span>Contract Value: <strong>$15,000</strong></span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
