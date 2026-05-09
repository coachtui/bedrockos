"use client";

import { useState } from "react";
import { Plus, HardHat, Users } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { CreateCrewModal } from "@/components/shell/CreateCrewModal";
import { CrewInspectorPanel } from "@/components/shell/CrewInspectorPanel";
import { useOrg } from "@/providers/OrgProvider";

export function CrewsClient() {
  const { crews } = useOrg();
  const [showModal,      setShowModal]      = useState(false);
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);

  const onSite  = crews.filter((c) => c.status === "on_site").length;
  const offSite = crews.filter((c) => c.status === "off_site").length;

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Crews"
        subtitle={`${crews.length} crews · ${onSite} on site · ${offSite} off site`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 min-h-11 md:min-h-0 px-4 md:px-3 py-2 md:py-1.5 text-sm md:text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 active:opacity-80 transition-colors"
          >
            <Plus size={13} />
            New Crew
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {crews.map((crew) => (
          <Card
            key={crew.id}
            variant="default"
            onClick={() => setSelectedCrewId(crew.id)}
            className="cursor-pointer hover:ring-1 hover:ring-surface-border-hover transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center">
                <HardHat size={16} className="text-content-secondary" />
              </div>
              {crew.status && <StatusBadge status={crew.status} />}
            </div>
            <p className="font-semibold text-content-primary text-sm">{crew.name}</p>
            {crew.leadName && (
              <p className="text-xs text-content-muted mt-1">Lead: {crew.leadName}</p>
            )}
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-surface-border">
              <Users size={13} className="text-content-muted" />
              <span className="text-xs text-content-secondary">
                {crew.memberIds.length > 0 ? `${crew.memberIds.length} members` : "No members assigned"}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <CreateCrewModal
          onClose={() => setShowModal(false)}
          onCreated={(_crewId) => setShowModal(false)}
        />
      )}

      <CrewInspectorPanel
        crewId={selectedCrewId}
        onClose={() => setSelectedCrewId(null)}
      />
    </PageContainer>
  );
}
