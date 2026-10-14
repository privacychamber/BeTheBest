"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Layers,
  Zap,
  DollarSign,
  Send,
  Briefcase,
  TrendingUp,
  ShieldCheck,
  LogOut,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Plus,
} from "lucide-react";
import type { SessionUser } from "@/types";

interface NavbarProps {
  currentUser?: SessionUser | null;
  onOpenQuickAdd?: () => void;
}

export function Navbar({ currentUser, onOpenQuickAdd }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [dbHealthy, setDbHealthy] = useState<boolean | null>(null);
  const [dbLatency, setDbLatency] = useState<number>(0);
  const [activeUser, setActiveUser] = useState<SessionUser | null>(currentUser || null);

  useEffect(() => {
    // Check DB health
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setDbHealthy(data.status === "healthy");
        setDbLatency(data.latencyMs || 0);
      })
      .catch(() => setDbHealthy(false));

    // Fetch current user if not provided
    if (!currentUser) {
      fetch("/api/auth/me")
        .then((res) => res.json())
        .then((data) => {
          if (data.authenticated) setActiveUser(data.user);
        })
        .catch(() => {});
    }
  }, [currentUser]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  const navLinks = [
    { name: "Overview", href: "/", icon: Layers },
    { name: "Pipeline", href: "/pipeline", icon: Zap },
    { name: "Connects & Budget", href: "/budget", icon: DollarSign },
    { name: "Proposals", href: "/proposals", icon: Send },
    { name: "Handovers", href: "/handovers", icon: Briefcase },
    { name: "Financial ROI", href: "/finances", icon: TrendingUp },
  ];

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "ADMIN":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">BD Lead (Admin)</span>;
      case "BIDDER":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Bidder Specialist</span>;
      case "COORDINATOR":
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">Project Coordinator</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-slate-500/20 text-slate-400">Guest</span>;
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#070B14]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-cyan-500 to-emerald-400 p-[1px] shadow-glow">
                <div className="w-full h-full bg-[#090D18] rounded-[11px] flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  BeTheBest
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800">
                    Ops
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 -mt-1">BD & Bidding Engine</span>
              </div>
            </Link>

            {/* Navigation tabs */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-4">
            {/* Health Indicator */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-900/80 border border-white/5 text-xs text-slate-400">
              <span
                className={`w-2 h-2 rounded-full ${
                  dbHealthy === true
                    ? "bg-emerald-400 animate-pulse"
                    : dbHealthy === false
                    ? "bg-rose-500"
                    : "bg-amber-400"
                }`}
              />
              <span>{dbHealthy === true ? `Atlas ${dbLatency}ms` : dbHealthy === false ? "DB Offline" : "Connecting..."}</span>
            </div>

            {/* Quick Add Button */}
            {onOpenQuickAdd && (
              <button
                onClick={onOpenQuickAdd}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-glow transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Add Job</span>
              </button>
            )}

            {/* User Profile & Role */}
            {activeUser ? (
              <div className="flex items-center gap-3 pl-2 border-l border-white/10">
                <div className="hidden lg:flex flex-col text-right">
                  <span className="text-xs font-semibold text-white leading-tight">{activeUser.name}</span>
                  <div className="mt-0.5">{getRoleBadge(activeUser.role)}</div>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <a
                href="/login"
                className="text-xs font-semibold text-blue-400 hover:text-blue-300 px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10"
              >
                Sign In
              </a>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
