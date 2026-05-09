"use client";

import { useState } from "react";
import { useOrg } from "@/providers/OrgProvider";
import { BottomSheet } from "@/components/ui/BottomSheet";
import type { CreateAssetInput, AssetStatus } from "@/types/domain";

interface Props {
  onClose:   () => void;
  onCreated: (assetId: string) => void;
}

const ASSET_TYPES = ["Excavator", "Crane", "Dozer", "Pump", "Lift", "Truck", "Compactor", "Generator", "Other"];
const STATUSES: AssetStatus[] = ["active", "maintenance", "offline"];

const EXIT_MS = 250;

export function AddAssetModal({ onClose, onCreated }: Props) {
  const { projects, addAsset, currentProject } = useOrg();

  const [open, setOpen] = useState(true);
  const [form, setForm] = useState({
    name:      "",
    type:      "Excavator",
    status:    "active" as AssetStatus,
    projectId: currentProject.id,
  });
  const [error, setError] = useState("");

  function set<K extends keyof typeof form>(key: K, value: typeof form[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function close() {
    setOpen(false);
    window.setTimeout(onClose, EXIT_MS);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setError("Asset name is required."); return; }

    const input: CreateAssetInput = {
      name:      form.name.trim(),
      type:      form.type,
      status:    form.status,
      projectId: form.projectId,
    };

    const asset = addAsset(input);
    setOpen(false);
    window.setTimeout(() => {
      onCreated(asset.id);
      onClose();
    }, EXIT_MS);
  }

  return (
    <BottomSheet open={open} onClose={close} title="Add Asset">
      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
        {error && (
          <p className="text-xs text-red-400 bg-red-400/10 border border-red-400/20 rounded px-3 py-2">{error}</p>
        )}

        <div>
          <label className="block text-xs font-medium text-content-secondary mb-1">Asset Name</label>
          <input
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Cat 336 Excavator #EQ-022"
            className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-content-secondary mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => set("type", e.target.value)}
            className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
          >
            {ASSET_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-content-secondary mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value as AssetStatus)}
            className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-content-secondary mb-1">Project</label>
          <select
            value={form.projectId}
            onChange={(e) => set("projectId", e.target.value)}
            className="w-full text-sm bg-surface-overlay border border-surface-border rounded px-3 py-2 text-content-primary focus:outline-none focus:border-gold"
          >
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={close} className="min-h-11 px-4 py-2 text-sm md:text-xs text-content-secondary hover:text-content-primary active:opacity-70 transition-colors">
            Cancel
          </button>
          <button type="submit" className="min-h-11 px-4 py-2 text-sm md:text-xs font-semibold bg-gold text-black rounded hover:bg-gold-hover active:opacity-80 transition-colors">
            Add Asset
          </button>
        </div>
      </form>
    </BottomSheet>
  );
}
