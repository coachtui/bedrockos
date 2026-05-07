"use client";

import { Copy } from "lucide-react";
import type { DiagnosticResult, OBDResult } from "@/lib/fix/types";

const SEVERITY: Record<OBDResult["severity"], { label: string; cls: string }> = {
  low:      { label: "Low - monitor",                cls: "text-status-success border-status-success/30 bg-status-success/10" },
  moderate: { label: "Moderate - address soon",      cls: "text-status-warning border-status-warning/30 bg-status-warning/10" },
  high:     { label: "High - address promptly",      cls: "text-status-warning border-status-warning/40 bg-status-warning/15" },
  critical: { label: "Critical - stop operating",    cls: "text-status-critical border-status-critical/40 bg-status-critical/10" },
};

const DIY: Record<NonNullable<DiagnosticResult["diy_difficulty"]>, { label: string; cls: string }> = {
  easy:          { label: "Easy DIY",       cls: "text-status-success border-status-success/30 bg-status-success/10" },
  moderate:      { label: "Moderate DIY",   cls: "text-gold border-gold/30 bg-gold/10" },
  hard:          { label: "Difficult DIY",  cls: "text-status-warning border-status-warning/30 bg-status-warning/10" },
  seek_mechanic: { label: "See a Mechanic", cls: "text-status-critical border-status-critical/30 bg-status-critical/10" },
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "bg-status-success" : pct >= 45 ? "bg-gold" : "bg-status-critical";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 bg-surface-overlay rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-content-muted w-9 text-right tabular-nums">{pct}%</span>
    </div>
  );
}

export function FixDiagnosticResultCard({ result }: { result: DiagnosticResult }) {
  const diy = result.diy_difficulty ? DIY[result.diy_difficulty] : null;
  const overall = Math.round(result.confidence_level * 100);

  function handleCopy() {
    const top = result.ranked_causes[0];
    const lines: string[] = [
      "=== Fix Diagnostic Summary ===",
      "",
      `Top Cause: ${top?.cause ?? "Unknown"} (${Math.round((top?.confidence ?? 0) * 100)}%)`,
      ...(top?.reasoning ? [`Reasoning: ${top.reasoning}`] : []),
      "",
      "Likely Causes:",
      ...result.ranked_causes.map((c, i) => `  ${i + 1}. ${c.cause} - ${Math.round(c.confidence * 100)}%`),
    ];
    if (result.next_checks.length > 0) {
      lines.push("", "Next Checks:");
      result.next_checks.forEach((c) => lines.push(`  - ${c}`));
    }
    if (result.escalation_guidance) {
      lines.push("", `When to escalate: ${result.escalation_guidance}`);
    }
    void navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="mt-3 rounded-[var(--radius-card)] border border-surface-border bg-surface-raised shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-4 py-3 bg-surface-overlay border-b border-surface-border flex items-center justify-between">
        <span className="text-sm font-semibold text-content-primary">Diagnostic Result</span>
        <span className="text-xs text-content-muted tabular-nums">{overall}% confidence</span>
      </div>

      <div className="divide-y divide-surface-border">
        <div className="px-4 py-4">
          <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-3">Likely Causes</h3>
          <div className="space-y-3.5">
            {result.ranked_causes.map((c, i) => (
              <div key={i}>
                <div className="text-sm font-medium text-content-primary">
                  {i + 1}. {c.cause}
                </div>
                <ConfidenceBar value={c.confidence} />
                <p className="text-xs text-content-secondary mt-1.5 leading-relaxed">{c.reasoning}</p>
              </div>
            ))}
          </div>
        </div>

        {result.next_checks.length > 0 && (
          <div className="px-4 py-4">
            <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-2.5">Next Checks</h3>
            <ol className="space-y-1.5">
              {result.next_checks.map((check, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-content-secondary">
                  <span className="text-content-muted font-mono text-xs mt-0.5 min-w-4 tabular-nums">{i + 1}.</span>
                  {check}
                </li>
              ))}
            </ol>
          </div>
        )}

        {result.post_diagnosis.length > 0 && (
          <div className="px-4 py-4 bg-teal/5">
            <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-2.5">After Confirming, Also Check</h3>
            <ul className="space-y-1.5">
              {result.post_diagnosis.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-content-secondary">
                  <span className="text-teal mt-0.5">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-4 py-4 flex flex-wrap gap-4">
          {diy && (
            <div>
              <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-1.5">DIY Level</h3>
              <span className={`inline-block px-2.5 py-1 rounded-[var(--radius-pill)] text-xs font-semibold border ${diy.cls}`}>
                {diy.label}
              </span>
            </div>
          )}
          {result.suggested_parts.length > 0 && (
            <div className="flex-1 min-w-[180px]">
              <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-1.5">Possible Parts</h3>
              <ul className="space-y-0.5">
                {result.suggested_parts.map((p, i) => (
                  <li key={i} className="text-sm text-content-secondary">
                    <span className="font-medium text-content-primary">{p.name}</span>
                    {p.notes && <span className="text-content-muted"> - {p.notes}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {result.escalation_guidance && (
          <div className="px-4 py-4 bg-status-warning/10">
            <h3 className="text-xs font-bold text-status-warning uppercase tracking-widest mb-1.5">When to See a Mechanic</h3>
            <p className="text-sm text-content-primary leading-relaxed">{result.escalation_guidance}</p>
          </div>
        )}

        <div className="px-4 py-3 flex items-center justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors"
          >
            <Copy size={12} /> Copy summary
          </button>
        </div>
      </div>
    </div>
  );
}

export function FixOBDResultCard({ result }: { result: OBDResult }) {
  const sev = SEVERITY[result.severity];
  const diy = DIY[result.diy_difficulty];
  return (
    <div className="mt-3 rounded-[var(--radius-card)] border border-surface-border bg-surface-raised shadow-[var(--shadow-card)] overflow-hidden">
      <div className="px-4 py-3 bg-surface-overlay border-b border-surface-border flex items-center justify-between">
        <span className="text-sm font-semibold text-content-primary font-mono">{result.code}</span>
        <span className={`text-xs px-2.5 py-1 rounded-[var(--radius-pill)] font-semibold border ${sev.cls}`}>
          {sev.label}
        </span>
      </div>
      <div className="divide-y divide-surface-border">
        <div className="px-4 py-4">
          <p className="text-sm text-content-primary leading-relaxed">{result.description}</p>
        </div>
        {result.likely_causes.length > 0 && (
          <div className="px-4 py-4">
            <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-2.5">Likely Causes</h3>
            <ul className="space-y-1.5">
              {result.likely_causes.map((c, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-content-secondary">
                  <span className="text-content-muted font-mono text-xs mt-0.5 min-w-4 tabular-nums">{i + 1}.</span>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result.next_steps.length > 0 && (
          <div className="px-4 py-4">
            <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-2.5">Next Steps</h3>
            <ol className="space-y-1.5">
              {result.next_steps.map((s, i) => (
                <li key={i} className="flex gap-2.5 text-sm text-content-secondary">
                  <span className="text-content-muted font-mono text-xs mt-0.5 min-w-4 tabular-nums">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ol>
          </div>
        )}
        {diy && (
          <div className="px-4 py-4">
            <h3 className="text-xs font-bold text-teal uppercase tracking-widest mb-1.5">DIY Level</h3>
            <span className={`inline-block px-2.5 py-1 rounded-[var(--radius-pill)] text-xs font-semibold border ${diy.cls}`}>
              {diy.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
