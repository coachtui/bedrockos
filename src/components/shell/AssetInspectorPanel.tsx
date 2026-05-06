"use client";

import { useRouter } from "next/navigation";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useOrg } from "@/providers/OrgProvider";
import { relativeTime } from "@/lib/utils/time";
import type { UserRole } from "@/types/org";
import type { AssetStatus } from "@/types/domain";

const CAN_EDIT           = new Set<UserRole>(["owner", "admin", "superintendent"]);
const CAN_CHANGE_PROJECT = new Set<UserRole>(["owner", "admin"]);

const ASSET_STATUSES: { value: AssetStatus; label: string }[] = [
  { value: "active",      label: "Active" },
  { value: "maintenance", label: "Maintenance" },
  { value: "offline",     label: "Offline" },
];

interface AssetInspectorPanelProps {
  assetId: string | null;
  onClose: () => void;
}

export function AssetInspectorPanel({ assetId, onClose }: AssetInspectorPanelProps) {
  const {
    assets, projects, role, issues,
    updateAssetStatus, updateAssetProject,
  } = useOrg();
  const router = useRouter();

  const asset        = assetId ? (assets.find((a) => a.id === assetId) ?? null) : null;
  const canEdit          = CAN_EDIT.has(role);
  const canChangeProject = CAN_CHANGE_PROJECT.has(role);

  const linkedIssues = asset
    ? issues.filter((i) => i.asset_id === asset.id)
    : [];

  const assetProject = asset
    ? projects.find((p) => p.id === asset.project_id)
    : undefined;

  return (
    <InspectorPanel
      open={!!asset}
      onClose={onClose}
      title={asset?.name ?? ""}
      subtitle={asset ? `Asset · ${asset.type}` : undefined}
    >
      {asset && (
        <div className="px-5 py-4 space-y-5">

          {/* ── Status ─────────────────────────────────────────── */}
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Status
            </h3>
            {canEdit ? (
              <div className="flex gap-1">
                {ASSET_STATUSES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => updateAssetStatus(asset.id, value)}
                    className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded border transition-colors ${
                      asset.status === value
                        ? "bg-teal text-white border-teal"
                        : "bg-surface-overlay text-content-secondary border-surface-border hover:border-teal/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <StatusBadge status={asset.status} />
            )}
          </section>

          {/* ── Project ─────────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Project
            </h3>
            {canChangeProject ? (
              <select
                value={asset.project_id}
                onChange={(e) => updateAssetProject(asset.id, e.target.value)}
                className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:border-teal"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            ) : (
              <p className="text-xs font-semibold text-content-primary">
                {assetProject?.name ?? "Unknown"}
              </p>
            )}
          </section>

          {/* ── Last Seen ─────────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Last Seen
            </h3>
            <p className="text-xs text-content-secondary">{relativeTime(asset.last_seen)}</p>
          </section>

          {/* ── Linked Issues ─────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4 pb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Linked Issues
            </h3>
            {linkedIssues.length === 0 ? (
              <p className="text-xs text-content-muted italic">No open issues</p>
            ) : (
              <ul className="space-y-1">
                {linkedIssues.map((issue) => {
                  const modulePath = issue.module === "mx" ? "/modules/mx" : "/modules/fix";
                  return (
                    <li
                      key={issue.id}
                      onClick={() => {
                        router.push(
                          `${modulePath}?issueId=${issue.id}&assetId=${asset.id}&source=asset-inspector`,
                        );
                        onClose();
                      }}
                      className="flex items-start gap-2.5 cursor-pointer rounded-lg px-2.5 py-2 hover:bg-surface-overlay transition-colors"
                    >
                      <StatusBadge status={issue.severity} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-content-primary leading-snug">
                          {issue.title}
                        </p>
                        <p className="text-[10px] text-content-muted mt-0.5 capitalize">
                          {issue.status.replace(/_/g, " ")}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

        </div>
      )}
    </InspectorPanel>
  );
}
