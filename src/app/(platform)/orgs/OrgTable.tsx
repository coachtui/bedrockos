"use client";

import Link from "next/link";
import type { PlatformOrg } from "@/types/platform";

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-emerald-950 text-emerald-400",
  trial:    "bg-amber-950 text-amber-400",
  internal: "text-content-muted border border-surface-border",
  inactive: "text-content-muted border border-surface-border",
};

export function OrgTable({ orgs }: { orgs: PlatformOrg[] }) {
  if (orgs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-content-primary font-semibold mb-1">No companies yet</p>
        <p className="text-content-muted text-sm">Add your first company to get started.</p>
      </div>
    );
  }

  return (
    <div className="border border-surface-border rounded-lg overflow-hidden mt-2">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-border bg-surface-raised">
            {["Company", "Modules", "Status", "Added", ""].map(h => (
              <th
                key={h}
                className="text-left text-[9px] font-bold uppercase tracking-widest text-content-muted px-4 py-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orgs.map(org => (
            <tr
              key={org.id}
              className="border-b border-surface-border last:border-0 hover:bg-white/5 transition-colors"
            >
              <td className="px-4 py-4">
                <p className="text-content-primary text-sm font-semibold">{org.name}</p>
                <p className="text-content-muted text-[10px] font-mono">{org.slug}</p>
              </td>
              <td className="px-4 py-4">
                <div className="flex gap-1 flex-wrap">
                  {org.enabledModules.map(m => (
                    <span
                      key={m}
                      className="bg-[#1a1f35] text-[#7c83e8] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-4">
                <span
                  className={`text-[10px] font-semibold px-2 py-1 rounded capitalize ${STATUS_STYLES[org.status] ?? STATUS_STYLES.inactive}`}
                >
                  {org.status}
                </span>
              </td>
              <td className="px-4 py-4 text-content-muted text-[11px]">{org.createdAt}</td>
              <td className="px-4 py-4 text-right">
                <Link
                  href={`/platform/orgs/${org.id}`}
                  className="text-[#7c83e8] text-[11px] font-semibold hover:text-[#a5b4fc] transition-colors"
                >
                  Edit →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
