"use client";

import { useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useOrg } from "@/providers/OrgProvider";
import { ArrowLeft, Truck } from "lucide-react";
import type { AssetStatus } from "@/types/domain";

const STATUS_FILTERS: Array<{ value: AssetStatus | "all"; label: string }> = [
  { value: "all",         label: "All" },
  { value: "active",      label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "offline",     label: "Offline" },
];

export default function EquipmentPage() {
  const { assets, currentProject } = useOrg();
  const [statusFilter, setStatusFilter] = useState<AssetStatus | "all">("all");

  const siteAssets = assets.filter((a) => a.project_id === currentProject.id);
  const filtered = statusFilter === "all"
    ? siteAssets
    : siteAssets.filter((a) => a.status === statusFilter);

  return (
    <PageContainer>
      <div className="mb-4">
        <Link href="/modules/cru" className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors">
          <ArrowLeft size={12} /> CX
        </Link>
      </div>

      <SectionHeader
        title="Equipment"
        subtitle={`${siteAssets.length} assets on this site`}
      />

      <div className="flex gap-1.5 flex-wrap mb-5 mt-4">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value as AssetStatus | "all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              statusFilter === f.value
                ? "bg-gold border-gold text-black"
                : "border-surface-border text-content-muted hover:border-gold/40 hover:text-content-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filtered.map((asset) => (
          <div
            key={asset.id}
            className="flex items-center gap-3 px-4 py-3 rounded-lg border border-surface-border bg-surface-raised"
          >
            <div className="w-9 h-9 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center flex-shrink-0">
              <Truck size={15} className="text-content-secondary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-content-primary truncate">{asset.name}</p>
              <p className="text-xs text-content-muted">{asset.type}</p>
            </div>
            <StatusBadge status={asset.status} />
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-content-muted py-8 text-center">
          {siteAssets.length === 0
            ? "No equipment assigned to this project."
            : "No equipment matches this filter."}
        </p>
      )}
    </PageContainer>
  );
}
