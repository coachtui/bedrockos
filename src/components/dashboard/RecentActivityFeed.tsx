"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ActivityFeedItem } from "@/components/ui/ActivityFeedItem";
import { useOrg } from "@/providers/OrgProvider";
import type { ActivityEvent } from "@/types/domain";

function getEventHref(event: ActivityEvent): string | undefined {
  if (event.target_type === "issue" && event.target_id)  return `/issues/${event.target_id}`;
  if (event.target_type === "alert" && event.target_id)  return `/alerts/${event.target_id}`;
  if (event.target_type === "asset" && event.target_id)  return `/assets`;
  return undefined;
}

export function RecentActivityFeed() {
  const { activity } = useOrg();
  const events = activity.slice(0, 8);

  return (
    <Card variant="default" className="!p-0">
      <div className="p-5 pb-3">
        <SectionHeader
          title="Recent Activity"
          action={
            <Link href="/activity" className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1">
              All activity <ArrowRight size={11} />
            </Link>
          }
        />
      </div>
      <div className="px-5 pb-2">
        {events.map((event) => (
          <ActivityFeedItem
            key={event.id}
            event={event}
            href={getEventHref(event)}
          />
        ))}
      </div>
    </Card>
  );
}
