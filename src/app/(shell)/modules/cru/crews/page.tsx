"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, Users, ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { CrewPanel } from "@/components/cx/CrewPanel";
import { useOrg } from "@/providers/OrgProvider";
import type { CrewStatus } from "@/types/domain";

const CAN_CREATE_ROLES = new Set(["superintendent", "project_engineer", "pm", "owner", "admin"]);

const STATUS_DOT: Partial<Record<CrewStatus, string>> = {
  on_site:  "bg-green-400",
  off_site: "bg-content-muted",
};

export default function CxCrewsPage() {
  const { crews, currentProject, role } = useOrg();
  const [panelOpen,      setPanelOpen]      = useState(false);
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);

  const projectCrews = crews.filter((c) => c.projectId === currentProject.id);
  const canCreate    = CAN_CREATE_ROLES.has(role);
  const selectedCrew = selectedCrewId ? crews.find((c) => c.id === selectedCrewId) : undefined;

  function openCreate() {
    setSelectedCrewId(null);
    setPanelOpen(true);
  }

  function openCrew(id: string) {
    setSelectedCrewId(id);
    setPanelOpen(true);
  }

  function handleClose() {
    setPanelOpen(false);
    setSelectedCrewId(null);
  }

  return (
    <PageContainer>
      <div className="mb-4">
        <Link
          href="/modules/cru"
          className="inline-flex items-center gap-1.5 text-xs text-content-muted hover:text-content-primary transition-colors"
        >
          <ArrowLeft size={12} /> CX
        </Link>
      </div>

      <SectionHeader
        title="Crews"
        subtitle={`${projectCrews.length} crew${projectCrews.length !== 1 ? "s" : ""} on this project`}
        action={
          canCreate ? (
            <button
              onClick={openCreate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
            >
              <Plus size={13} />
              New Crew
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        {projectCrews.map((crew) => (
          <Card
            key={crew.id}
            variant="default"
            onClick={() => openCrew(crew.id)}
            className="hover:border-gold/25 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/20 flex items-center justify-center">
                <Users size={14} className="text-gold" />
              </div>
              {crew.status && (
                <span
                  className={`w-2 h-2 rounded-full mt-1 ${STATUS_DOT[crew.status] ?? "bg-content-muted"}`}
                  title={crew.status === "on_site" ? "On site" : "Off site"}
                />
              )}
            </div>
            <p className="font-semibold text-content-primary text-sm">{crew.name}</p>
            {crew.leadName && (
              <p className="text-xs text-content-muted mt-0.5">Lead: {crew.leadName}</p>
            )}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-surface-border">
              <Users size={12} className="text-content-muted" />
              <span className="text-xs text-content-secondary">
                {crew.memberIds.length > 0
                  ? `${crew.memberIds.length} member${crew.memberIds.length !== 1 ? "s" : ""}`
                  : "No members assigned"}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {projectCrews.length === 0 && (
        <p className="text-sm text-content-muted py-8 text-center">
          No crews on this project yet.
        </p>
      )}

      <CrewPanel
        key={selectedCrewId ?? "new"}
        open={panelOpen}
        onClose={handleClose}
        crew={selectedCrew}
      />
    </PageContainer>
  );
}
