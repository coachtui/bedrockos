"use client";

import React from "react";
import Link from "next/link";
import { Wrench } from "lucide-react";
import { buildFixUrl, isStandaloneMode } from "@/lib/modules/fix/launch";
import type { FixLaunchContext } from "@/lib/modules/fix/launch";
import { useOrg } from "@/providers/OrgProvider";

export type FixLaunchVariant = "primary" | "outline" | "ghost" | "inline";

interface FixLaunchButtonProps {
  context:   FixLaunchContext;
  label?:    string;
  variant?:  FixLaunchVariant;
  className?: string;
}

const VARIANT_CLASS: Record<FixLaunchVariant, string> = {
  // Full-weight teal button — default for action bars
  primary: "inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal hover:opacity-90 text-content-inverse text-sm font-semibold transition-opacity",
  // Teal outline — for role CTA bars and secondary placements
  outline: "inline-flex items-center gap-2 text-sm font-semibold text-teal border border-teal/30 bg-teal/5 hover:bg-teal/15 px-4 py-2 rounded-lg transition-colors",
  // Neutral — when Fix is one of several equal actions
  ghost:   "inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-surface-border bg-surface-overlay text-content-secondary hover:text-content-primary hover:border-surface-border-hover text-sm font-semibold transition-colors",
  // Compact — for inline use within issue rows / tight lists
  inline:  "text-[11px] font-semibold text-teal border border-teal/30 bg-teal/5 hover:bg-teal/20 px-1.5 py-0.5 rounded transition-colors",
};

export function FixLaunchButton({
  context,
  label   = "Open in Fix",
  variant = "primary",
  className,
}: FixLaunchButtonProps) {
  const { isModuleEnabled } = useOrg();
  if (!isModuleEnabled("fix")) return null;

  const href = buildFixUrl(context);
  const cls  = className ?? VARIANT_CLASS[variant];

  // Standalone mode → external URL, opens in new tab
  if (isStandaloneMode()) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        <Wrench size={variant === "inline" ? 11 : 14} />
        {label}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      <Wrench size={variant === "inline" ? 11 : 14} />
      {label}
    </Link>
  );
}
