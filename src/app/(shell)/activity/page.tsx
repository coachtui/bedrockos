"use client";

import React, { useState } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ActivityFeedItem } from "@/components/ui/ActivityFeedItem";
import { useOrg } from "@/providers/OrgProvider";
import type { ActivityEvent } from "@/types/domain";
import type { ModuleId } from "@/types/org";

const MODULE_FILTERS: { label: string; value: ModuleId | "all" }[] = [
  { label: "All",     value: "all"     },
  { label: "MX",      value: "mx"      },
  { label: "OPS",     value: "ops"     },
  { label: "Fix",     value: "fix"     },
  { label: "CRU",     value: "cru"     },
  { label: "Datum",   value: "datum"   },
  { label: "Inspect", value: "inspect" },
];

function getEventHref(event: ActivityEvent): string | undefined {
  if (event.target_type === "issue" && event.target_id) return `/issues/${event.target_id}`;
  if (event.target_type === "alert" && event.target_id) return `/alerts/${event.target_id}`;
  return undefined;
}

export default function ActivityPage() {
  const [filter, setFilter] = useState<ModuleId | "all">("all");
  const { activity } = useOrg();

  const events = filter === "all"
    ? activity
    : activity.filter((e) => e.module === filter);

  return (
    <PageContainer>
      <SectionHeader
        title="Activity"
        subtitle="All platform events across your organization"
      />

      <div className="flex items-center gap-2 flex-wrap mb-6">
        {MODULE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-[var(--radius-pill)] text-xs font-semibold border transition-colors ${
              filter === f.value
                ? "bg-gold/15 text-gold border-gold/30"
                : "bg-surface-overlay text-content-secondary border-surface-border hover:border-surface-border-hover hover:text-content-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-[var(--radius-card)] border border-surface-border bg-surface-raised overflow-hidden">
        <div className="px-4 py-2">
          {events.length === 0 ? (
            <p className="text-sm text-content-muted py-6 text-center">No activity found</p>
          ) : (
            events.map((event) => (
              <ActivityFeedItem
                key={event.id}
                event={event}
                showProject
                href={getEventHref(event)}
              />
            ))
          )}
        </div>
      </div>
    </PageContainer>
  );
}
