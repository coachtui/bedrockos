import React from "react";
import Link from "next/link";
import { Wrench, Users, MapPin, ClipboardCheck, Layout } from "lucide-react";
import type { ActivityEvent } from "@/types/domain";

interface ActivityFeedItemProps {
  event:        ActivityEvent;
  showProject?: boolean;
  projectName?: string;
  href?:        string;
}

const MODULE_ICON: Record<string, React.ReactNode> = {
  fix:     <Wrench          size={13} className="text-teal"            />,
  cru:     <Users           size={13} className="text-gold"            />,
  datum:   <MapPin          size={13} className="text-teal"            />,
  inspect: <ClipboardCheck  size={13} className="text-blue-brand"      />,
  shell:   <Layout          size={13} className="text-content-muted"   />,
};

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function ActivityFeedItem({ event, showProject = false, projectName, href }: ActivityFeedItemProps) {
  const inner = (
    <div className={`flex items-start gap-3 py-2.5 border-b border-surface-border last:border-0 ${href ? "group cursor-pointer hover:bg-surface-overlay rounded-lg px-2 -mx-2 transition-colors" : ""}`}>
      <div className={`shrink-0 mt-0.5 w-6 h-6 rounded-full bg-surface-overlay border border-surface-border flex items-center justify-center ${href ? "group-hover:border-surface-border-hover transition-colors" : ""}`}>
        {MODULE_ICON[event.module] ?? MODULE_ICON.shell}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-content-primary leading-snug">
          <span className="font-semibold">{event.actor_name}</span>
          {" "}{event.action}{" "}
          <span className={`${href ? "group-hover:text-content-primary" : ""} text-content-secondary`}>{event.entity_name}</span>
        </p>
        {showProject && projectName && (
          <p className="text-xs text-content-muted mt-0.5">{projectName}</p>
        )}
      </div>
      <span className="shrink-0 text-[11px] text-content-muted tabular-nums">{relativeTime(event.timestamp)}</span>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{inner}</Link>;
  }
  return inner;
}
