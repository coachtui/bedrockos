import type { OrgWorker } from "@/types/domain";

interface RosterWorkerCardProps {
  worker:      OrgWorker;
  borrowed?:   boolean;
  sourceName?: string;
}

export function RosterWorkerCard({ worker, borrowed, sourceName }: RosterWorkerCardProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg border border-surface-border bg-surface-raised hover:border-gold/25 transition-colors">
      <div className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 flex items-center justify-center flex-shrink-0">
        <span className="text-xs font-bold text-gold">
          {worker.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-content-primary truncate">{worker.name}</p>
        <p className="text-xs text-content-muted capitalize">{worker.role}</p>
        {borrowed && sourceName && (
          <p className="text-[10px] text-gold mt-0.5">On loan from {sourceName}</p>
        )}
      </div>
      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${worker.available ? "bg-emerald-400" : "bg-surface-border"}`} />
    </div>
  );
}
