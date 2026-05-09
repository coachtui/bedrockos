"use client";

import { useState } from "react";
import { Plus, Truck } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AddAssetModal } from "@/components/shell/AddAssetModal";
import { AssetInspectorPanel } from "@/components/shell/AssetInspectorPanel";
import { useOrg } from "@/providers/OrgProvider";
import { relativeTime } from "@/lib/utils/time";

export function AssetsClient() {
  const { assets } = useOrg();
  const [showModal,       setShowModal]       = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Assets"
        subtitle={`${assets.length} tracked assets`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 min-h-11 md:min-h-0 px-4 md:px-3 py-2 md:py-1.5 text-sm md:text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 active:opacity-80 transition-colors"
          >
            <Plus size={13} />
            Add Asset
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((asset) => (
          <Card
            key={asset.id}
            variant="default"
            onClick={() => setSelectedAssetId(asset.id)}
            className="cursor-pointer hover:ring-1 hover:ring-surface-border-hover transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-lg bg-surface-overlay border border-surface-border flex items-center justify-center">
                <Truck size={16} className="text-content-secondary" />
              </div>
              <StatusBadge status={asset.status} />
            </div>
            <p className="font-semibold text-content-primary text-sm leading-tight">{asset.name}</p>
            <p className="text-xs text-content-muted mt-1">{asset.type}</p>
            <p className="text-xs text-content-muted mt-3 pt-3 border-t border-surface-border">
              Last seen {relativeTime(asset.last_seen)}
            </p>
          </Card>
        ))}
      </div>

      {showModal && (
        <AddAssetModal
          onClose={() => setShowModal(false)}
          onCreated={(_assetId) => setShowModal(false)}
        />
      )}

      <AssetInspectorPanel
        assetId={selectedAssetId}
        onClose={() => setSelectedAssetId(null)}
      />
    </PageContainer>
  );
}
