# Asset & Crew Inspector Panels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clickable inspector panels to the Assets and Crews pages so users can view and edit entity details inline, following the established WorkerInspectorPanel pattern.

**Architecture:** Each page gets a `selectedId` state variable; clicking a card sets it, which mounts the panel. Two new panel components (`AssetInspectorPanel`, `CrewInspectorPanel`) consume OrgProvider context and new mutations added there. The existing `InspectorPanel` UI primitive handles the shell (header, backdrop, Escape key).

**Tech Stack:** Next.js 14, React, Tailwind CSS, TypeScript. No test framework installed — verification is TypeScript build + visual browser check.

---

## File Map

| File | Action |
|------|--------|
| `src/providers/OrgProvider.tsx` | Add 6 new mutations + update `OrgContextValue` interface |
| `src/components/shell/AssetInspectorPanel.tsx` | Create new component |
| `src/components/shell/CrewInspectorPanel.tsx` | Create new component |
| `src/app/(shell)/assets/client.tsx` | Add selectedAssetId state, card onClick, panel mount |
| `src/app/(shell)/crews/client.tsx` | Add selectedCrewId state, card onClick, panel mount |

---

## Task 1: OrgProvider — Asset Mutations

**Files:**
- Modify: `src/providers/OrgProvider.tsx`

- [ ] **Step 1: Add asset mutation signatures to `OrgContextValue` interface**

In `OrgProvider.tsx`, add to the `OrgContextValue` interface (after `toggleWorkerAvailability`):

```typescript
updateAssetStatus:  (assetId: string, status: AssetStatus) => void;
updateAssetProject: (assetId: string, projectId: string) => void;
```

The import at the top of the file already includes `Asset` and `AssetStatus` from `@/types/domain` — no import change needed.

Wait: check the existing import line — it currently imports `Asset` but not `AssetStatus`. Update it:

```typescript
// Before:
import type {
  Issue, ActivityEvent, Project, Asset, OrgWorker, OrgCrew,
  CreateProjectInput, CreateAssetInput, CreateCrewInput,
  CreateWorkerInput, WorkerRole,
} from "@/types/domain";

// After:
import type {
  Issue, ActivityEvent, Project, Asset, OrgWorker, OrgCrew,
  AssetStatus, CrewStatus,
  CreateProjectInput, CreateAssetInput, CreateCrewInput,
  CreateWorkerInput, WorkerRole,
} from "@/types/domain";
```

- [ ] **Step 2: Implement `updateAssetStatus` function**

Add after the `addWorker` function block, before `addSkillToRole`:

```typescript
function updateAssetStatus(assetId: string, status: AssetStatus): void {
  const asset = assets.find((a) => a.id === assetId);
  if (!asset) return;
  setAssets((prev) => prev.map((a) => a.id === assetId ? { ...a, status } : a));
  addEmittedActivity({
    id:          crypto.randomUUID(),
    actor_name:  config.currentUser.name,
    action:      `updated ${asset.name} status to ${status}`,
    entity_type: "equipment",
    entity_id:   assetId,
    entity_name: asset.name,
    project_id:  asset.project_id,
    module:      "shell",
    timestamp:   new Date().toISOString(),
  });
}
```

- [ ] **Step 3: Implement `updateAssetProject` function**

Add immediately after `updateAssetStatus`:

```typescript
function updateAssetProject(assetId: string, projectId: string): void {
  const asset   = assets.find((a) => a.id === assetId);
  const project = projects.find((p) => p.id === projectId);
  if (!asset) return;
  setAssets((prev) => prev.map((a) => a.id === assetId ? { ...a, project_id: projectId } : a));
  addEmittedActivity({
    id:          crypto.randomUUID(),
    actor_name:  config.currentUser.name,
    action:      `moved ${asset.name} to ${project?.name ?? projectId}`,
    entity_type: "equipment",
    entity_id:   assetId,
    entity_name: asset.name,
    project_id:  projectId,
    module:      "shell",
    timestamp:   new Date().toISOString(),
  });
}
```

- [ ] **Step 4: Expose mutations in the context value**

In the `OrgContext.Provider value={{...}}` block, add after `toggleWorkerAvailability`:

```typescript
updateAssetStatus,
updateAssetProject,
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npm run build 2>&1 | tail -20
```

Expected: no type errors related to OrgContextValue or the new functions.

- [ ] **Step 6: Commit**

```bash
git add src/providers/OrgProvider.tsx
git commit -m "feat(assets): add updateAssetStatus and updateAssetProject mutations"
```

---

## Task 2: OrgProvider — Crew Mutations

**Files:**
- Modify: `src/providers/OrgProvider.tsx`

- [ ] **Step 1: Add crew mutation signatures to `OrgContextValue` interface**

Add to `OrgContextValue` after `updateAssetProject`:

```typescript
updateCrewStatus:     (crewId: string, status: CrewStatus) => void;
updateCrewName:       (crewId: string, name: string) => void;
addWorkerToCrew:      (crewId: string, workerId: string) => void;
removeWorkerFromCrew: (crewId: string, workerId: string) => void;
```

Note: `CrewStatus` was added to the import in Task 1.

- [ ] **Step 2: Implement `updateCrewStatus`**

Add after `updateAssetProject`:

```typescript
function updateCrewStatus(crewId: string, status: CrewStatus): void {
  const crew = crews.find((c) => c.id === crewId);
  if (!crew) return;
  setCrews((prev) => prev.map((c) => c.id === crewId ? { ...c, status } : c));
  addEmittedActivity({
    id:          crypto.randomUUID(),
    actor_name:  config.currentUser.name,
    action:      `updated ${crew.name} status to ${status === "on_site" ? "on site" : "off site"}`,
    entity_type: "crew",
    entity_id:   crewId,
    entity_name: crew.name,
    project_id:  crew.projectId,
    module:      "shell",
    timestamp:   new Date().toISOString(),
  });
}
```

- [ ] **Step 3: Implement `updateCrewName`**

Add after `updateCrewStatus`:

```typescript
function updateCrewName(crewId: string, name: string): void {
  const crew = crews.find((c) => c.id === crewId);
  if (!crew) return;
  setCrews((prev) => prev.map((c) => c.id === crewId ? { ...c, name } : c));
  addEmittedActivity({
    id:          crypto.randomUUID(),
    actor_name:  config.currentUser.name,
    action:      `renamed crew to ${name}`,
    entity_type: "crew",
    entity_id:   crewId,
    entity_name: name,
    project_id:  crew.projectId,
    module:      "shell",
    timestamp:   new Date().toISOString(),
  });
}
```

- [ ] **Step 4: Implement `addWorkerToCrew`**

Add after `updateCrewName`:

```typescript
function addWorkerToCrew(crewId: string, workerId: string): void {
  const crew   = crews.find((c) => c.id === crewId);
  const worker = workers.find((w) => w.id === workerId);
  if (!crew || !worker) return;
  if (crew.memberIds.includes(workerId)) return;
  setCrews((prev) =>
    prev.map((c) => c.id === crewId ? { ...c, memberIds: [...c.memberIds, workerId] } : c),
  );
  addEmittedActivity({
    id:          crypto.randomUUID(),
    actor_name:  config.currentUser.name,
    action:      `added ${worker.name} to ${crew.name}`,
    entity_type: "crew",
    entity_id:   crewId,
    entity_name: crew.name,
    project_id:  crew.projectId,
    module:      "shell",
    timestamp:   new Date().toISOString(),
  });
}
```

- [ ] **Step 5: Implement `removeWorkerFromCrew`**

Add after `addWorkerToCrew`:

```typescript
function removeWorkerFromCrew(crewId: string, workerId: string): void {
  const crew   = crews.find((c) => c.id === crewId);
  const worker = workers.find((w) => w.id === workerId);
  if (!crew || !worker) return;
  setCrews((prev) =>
    prev.map((c) =>
      c.id === crewId ? { ...c, memberIds: c.memberIds.filter((id) => id !== workerId) } : c,
    ),
  );
  addEmittedActivity({
    id:          crypto.randomUUID(),
    actor_name:  config.currentUser.name,
    action:      `removed ${worker.name} from ${crew.name}`,
    entity_type: "crew",
    entity_id:   crewId,
    entity_name: crew.name,
    project_id:  crew.projectId,
    module:      "shell",
    timestamp:   new Date().toISOString(),
  });
}
```

- [ ] **Step 6: Expose crew mutations in context value**

In the `OrgContext.Provider value={{...}}` block, add after `updateAssetProject`:

```typescript
updateCrewStatus,
updateCrewName,
addWorkerToCrew,
removeWorkerFromCrew,
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npm run build 2>&1 | tail -20
```

Expected: no type errors.

- [ ] **Step 8: Commit**

```bash
git add src/providers/OrgProvider.tsx
git commit -m "feat(crews): add crew mutations to OrgProvider"
```

---

## Task 3: AssetInspectorPanel Component

**Files:**
- Create: `src/components/shell/AssetInspectorPanel.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/shell/AssetInspectorPanel.tsx` with the following content:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useOrg } from "@/providers/OrgProvider";
import { MOCK_ISSUES } from "@/lib/mock/issues";
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

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function AssetInspectorPanel({ assetId, onClose }: AssetInspectorPanelProps) {
  const {
    assets, projects, role,
    updateAssetStatus, updateAssetProject,
  } = useOrg();
  const router = useRouter();

  const asset        = assetId ? (assets.find((a) => a.id === assetId) ?? null) : null;
  const canEdit          = CAN_EDIT.has(role);
  const canChangeProject = CAN_CHANGE_PROJECT.has(role);

  const linkedIssues = asset
    ? MOCK_ISSUES.filter((i) => i.asset_id === asset.id)
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
                          {issue.status.replace("_", " ")}
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/AssetInspectorPanel.tsx
git commit -m "feat(assets): add AssetInspectorPanel component"
```

---

## Task 4: Wire AssetsClient

**Files:**
- Modify: `src/app/(shell)/assets/client.tsx`

- [ ] **Step 1: Replace the full content of `client.tsx`**

```tsx
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

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function AssetsClient() {
  const { assets } = useOrg();
  const [showModal,      setShowModal]      = useState(false);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Assets"
        subtitle={`${assets.length} tracked assets`}
        action={
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
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
```

- [ ] **Step 2: Check if `Card` accepts an `onClick` prop**

Read the Card component:

```bash
cat /Users/tui/aigacp/src/components/ui/Card.tsx
```

If `Card` does not accept `onClick` or `className` overrides, add them. The Card component likely renders a `<div>` — you need to forward `onClick` and allow `className` merging. If it already does, skip to step 3.

**If Card needs updating**, edit `src/components/ui/Card.tsx` to accept and forward `onClick` and a `className` prop. The typical pattern:

```tsx
interface CardProps {
  children:   React.ReactNode;
  variant?:   "default" | "elevated";
  onClick?:   () => void;
  className?: string;
}

export function Card({ children, variant = "default", onClick, className }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`... existing classes ... ${className ?? ""}`}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 4: Visual check**

Start the dev server (`npm run dev`) and open `http://localhost:3000/assets`. Click any asset card. Verify:
- Panel slides in from the right
- Asset name and type appear in header
- Status segmented control shows correct selected state
- Project dropdown shows the correct project (admin/owner role)
- Last seen timestamp displays
- Assets with linked issues (Cat 330, Crawler Crane CR-7, Scissor Lift SL-9) show issues list

- [ ] **Step 5: Commit**

```bash
git add src/app/\(shell\)/assets/client.tsx src/components/ui/Card.tsx
git commit -m "feat(assets): wire asset cards to inspector panel"
```

---

## Task 5: CrewInspectorPanel Component

**Files:**
- Create: `src/components/shell/CrewInspectorPanel.tsx`

- [ ] **Step 1: Create the component file**

Create `src/components/shell/CrewInspectorPanel.tsx`:

```tsx
"use client";

import { useState, useEffect } from "react";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useOrg } from "@/providers/OrgProvider";
import type { UserRole } from "@/types/org";
import type { CrewStatus } from "@/types/domain";

const CAN_EDIT = new Set<UserRole>(["owner", "admin", "superintendent"]);

const CREW_STATUSES: { value: CrewStatus; label: string }[] = [
  { value: "on_site",  label: "On Site" },
  { value: "off_site", label: "Off Site" },
];

interface CrewInspectorPanelProps {
  crewId:  string | null;
  onClose: () => void;
}

export function CrewInspectorPanel({ crewId, onClose }: CrewInspectorPanelProps) {
  const {
    crews, workers, role,
    updateCrewStatus, updateCrewName,
    addWorkerToCrew, removeWorkerFromCrew,
  } = useOrg();

  const crew    = crewId ? (crews.find((c) => c.id === crewId) ?? null) : null;
  const canEdit = CAN_EDIT.has(role);

  const [editingName, setEditingName] = useState(false);
  const [nameInput,   setNameInput]   = useState("");

  // Reset edit state when selected crew changes
  useEffect(() => {
    setEditingName(false);
    setNameInput(crew?.name ?? "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crewId]);

  const memberWorkers    = workers.filter((w) => crew?.memberIds.includes(w.id));
  const availableWorkers = workers.filter((w) => !crew?.memberIds.includes(w.id));

  function handleNameSave() {
    if (!crew || !nameInput.trim()) return;
    updateCrewName(crew.id, nameInput.trim());
    setEditingName(false);
  }

  return (
    <InspectorPanel
      open={!!crew}
      onClose={onClose}
      title={crew?.name ?? ""}
      subtitle="Crew"
    >
      {crew && (
        <div className="px-5 py-4 space-y-5">

          {/* ── Name ───────────────────────────────────────────────── */}
          {canEdit && (
            <section>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
                Name
              </h3>
              {editingName ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter")  handleNameSave();
                      if (e.key === "Escape") setEditingName(false);
                    }}
                    className="flex-1 text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:border-teal"
                  />
                  <button
                    onClick={handleNameSave}
                    className="px-3 py-1 text-[10px] font-semibold bg-teal text-white rounded hover:opacity-90 transition-opacity"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingName(false)}
                    className="text-[10px] text-content-muted hover:text-content-primary transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-content-primary">{crew.name}</p>
                  <button
                    onClick={() => { setNameInput(crew.name); setEditingName(true); }}
                    className="text-[10px] font-semibold text-content-muted hover:text-teal transition-colors"
                  >
                    Edit
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ── Status ─────────────────────────────────────────────── */}
          <section className={canEdit ? "border-t border-surface-border pt-4" : ""}>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Status
            </h3>
            {canEdit ? (
              <div className="flex gap-1">
                {CREW_STATUSES.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => updateCrewStatus(crew.id, value)}
                    className={`flex-1 px-2 py-1.5 text-[11px] font-semibold rounded border transition-colors ${
                      crew.status === value
                        ? "bg-teal text-white border-teal"
                        : "bg-surface-overlay text-content-secondary border-surface-border hover:border-teal/40"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <StatusBadge status={crew.status ?? "off_site"} />
            )}
          </section>

          {/* ── Lead ─────────────────────────────────────────────────── */}
          {crew.leadName && (
            <section className="border-t border-surface-border pt-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
                Lead
              </h3>
              <p className="text-xs font-semibold text-content-primary">{crew.leadName}</p>
            </section>
          )}

          {/* ── Members ──────────────────────────────────────────────── */}
          <section className="border-t border-surface-border pt-4 pb-2">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
              Members ({crew.memberIds.length})
            </h3>

            {memberWorkers.length === 0 ? (
              <p className="text-xs text-content-muted italic mb-4">No members assigned</p>
            ) : (
              <ul className="space-y-0.5 mb-4">
                {memberWorkers.map((w) => (
                  <li key={w.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface-overlay">
                    <div>
                      <p className="text-xs font-semibold text-content-primary">{w.name}</p>
                      <p className="text-[10px] text-content-muted capitalize">{w.role}</p>
                    </div>
                    {canEdit && (
                      <button
                        onClick={() => removeWorkerFromCrew(crew.id, w.id)}
                        className="text-[10px] text-content-muted hover:text-status-critical transition-colors font-semibold px-1"
                        aria-label={`Remove ${w.name}`}
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {canEdit && availableWorkers.length > 0 && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-2">
                  Available to Add
                </p>
                <ul className="space-y-0.5">
                  {availableWorkers.map((w) => (
                    <li key={w.id} className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-surface-overlay">
                      <div>
                        <p className="text-xs font-semibold text-content-primary">{w.name}</p>
                        <p className="text-[10px] text-content-muted capitalize">{w.role}</p>
                      </div>
                      <button
                        onClick={() => addWorkerToCrew(crew.id, w.id)}
                        className="text-[10px] text-content-muted hover:text-teal transition-colors font-semibold px-1"
                        aria-label={`Add ${w.name}`}
                      >
                        +
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>

        </div>
      )}
    </InspectorPanel>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/shell/CrewInspectorPanel.tsx
git commit -m "feat(crews): add CrewInspectorPanel component"
```

---

## Task 6: Wire CrewsClient

**Files:**
- Modify: `src/app/(shell)/crews/client.tsx`

- [ ] **Step 1: Replace the full content of `client.tsx`**

```tsx
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
  const [showModal,     setShowModal]     = useState(false);
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
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/tui/aigacp && npm run build 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 3: Visual check**

Open `http://localhost:3000/crews`. Click any crew card. Verify:
- Panel slides in with crew name in header
- Name section shows current name with Edit button (admin/owner/super role)
- Clicking Edit opens inline text input; Enter saves, Escape cancels; panel header updates
- Status segmented control reflects current on_site/off_site state; clicking switches it
- Members section shows workers in `memberIds` with × button
- Available to Add section shows remaining workers with + button
- Adding a worker moves them from Available to Members; removing does the reverse

- [ ] **Step 4: Final commit**

```bash
git add src/app/\(shell\)/crews/client.tsx
git commit -m "feat(crews): wire crew cards to inspector panel"
```
