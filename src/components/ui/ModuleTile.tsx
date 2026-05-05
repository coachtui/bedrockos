"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Lock } from "lucide-react";
import type { ModuleDefinition } from "@/lib/modules/module-registry";

interface ModuleTileProps {
  module:    ModuleDefinition;
  isEnabled: boolean;
}

const ACCENT_STYLES: Record<string, { dot: string; arrow: string; border: string }> = {
  gold: { dot: "bg-gold",            arrow: "text-gold",            border: "hover:border-gold/40" },
  teal: { dot: "bg-teal",            arrow: "text-teal",            border: "hover:border-teal/40" },
  blue: { dot: "bg-blue-brand",      arrow: "text-blue-brand",      border: "hover:border-blue-brand/40" },
  red:  { dot: "bg-status-critical", arrow: "text-status-critical", border: "hover:border-status-critical/40" },
};

export function ModuleTile({ module: mod, isEnabled }: ModuleTileProps) {
  const accent = ACCENT_STYLES[mod.accentColor] ?? ACCENT_STYLES.blue;

  if (!isEnabled) {
    return (
      <div
        className="relative rounded-[var(--radius-card)] p-5 bg-surface-raised border border-surface-border opacity-50 cursor-not-allowed"
        title="Upgrade to access this module"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${accent.dot} opacity-50`} />
            <span className="text-sm font-bold text-content-secondary tracking-tight">{mod.label}</span>
          </div>
          <span className="flex items-center gap-1 bg-surface-overlay border border-surface-border text-content-muted text-[10px] font-semibold uppercase tracking-widest px-1.5 py-0.5 rounded-[var(--radius-badge)]">
            <Lock size={9} /> Locked
          </span>
        </div>
        <p className="text-xs text-content-muted leading-snug">{mod.description}</p>
      </div>
    );
  }

  return (
    <Link
      href={mod.route}
      className={`group block rounded-[var(--radius-card)] p-5 bg-surface-raised border border-surface-border shadow-[var(--shadow-card)] transition-all duration-150 ${accent.border} hover:bg-surface-overlay`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${accent.dot}`} />
          <span className="text-sm font-bold text-content-primary tracking-tight">{mod.label}</span>
        </div>
        <ArrowRight size={14} className={`${accent.arrow} opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 duration-150`} />
      </div>
      <p className="text-xs text-content-secondary leading-snug">{mod.description}</p>
    </Link>
  );
}
