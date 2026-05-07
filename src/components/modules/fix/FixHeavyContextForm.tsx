"use client";

import type { HeavyEquipmentContext } from "@/lib/fix/types";

const ENVIRONMENTS = [
  { value: "dusty",  label: "Dusty — quarry, demolition, earthmoving" },
  { value: "muddy",  label: "Muddy — wet earthmoving, construction" },
  { value: "marine", label: "Marine — near water, saltwater air" },
  { value: "urban",  label: "Normal / urban" },
] as const;

interface Props {
  value:    HeavyEquipmentContext;
  onChange: (ctx: HeavyEquipmentContext) => void;
}

export function FixHeavyContextForm({ value, onChange }: Props) {
  const set = <K extends keyof HeavyEquipmentContext>(k: K, v: HeavyEquipmentContext[K]) =>
    onChange({ ...value, [k]: v });

  const inputCls =
    "w-full rounded-lg border border-surface-border bg-surface-overlay px-3 py-2 text-sm " +
    "text-content-primary placeholder:text-content-muted focus:outline-none focus:border-teal";

  return (
    <div className="rounded-[var(--radius-card)] border border-gold/30 bg-gold/5 p-4 space-y-4 text-sm">
      <p className="text-xs font-bold uppercase tracking-widest text-gold">
        Heavy Equipment Context <span className="text-content-muted normal-case font-normal">— optional, improves accuracy</span>
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-content-muted mb-1.5">Machine hours</label>
          <input
            type="number" inputMode="numeric" min={0}
            placeholder="e.g. 4500"
            value={value.hours_of_operation ?? ""}
            onChange={(e) => set("hours_of_operation", e.target.value ? Number(e.target.value) : undefined)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-content-muted mb-1.5">Hours since last service</label>
          <input
            type="number" inputMode="numeric" min={0}
            placeholder="e.g. 210"
            value={value.last_service_hours ?? ""}
            onChange={(e) => set("last_service_hours", e.target.value ? Number(e.target.value) : undefined)}
            className={inputCls}
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-content-muted mb-1.5">Working environment</label>
        <select
          value={value.environment ?? ""}
          onChange={(e) => set("environment", (e.target.value || undefined) as HeavyEquipmentContext["environment"])}
          className={inputCls}
        >
          <option value="">Not sure</option>
          {ENVIRONMENTS.map((env) => (
            <option key={env.value} value={env.value}>{env.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-content-muted mb-1.5">Days since last used</label>
          <input
            type="number" inputMode="numeric" min={0}
            placeholder="e.g. 45"
            value={value.storage_duration ?? ""}
            onChange={(e) => set("storage_duration", e.target.value ? Number(e.target.value) : undefined)}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs text-content-muted mb-1.5">Recent work type</label>
          <input
            type="text"
            placeholder="e.g. trenching"
            value={value.recent_work_type ?? ""}
            onChange={(e) => set("recent_work_type", e.target.value || undefined)}
            className={inputCls}
          />
        </div>
      </div>
    </div>
  );
}
