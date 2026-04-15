# Asset & Crew Inspector Panels — Design Spec

**Date:** 2026-04-15
**Status:** Approved

---

## Overview

Assets and Crews pages currently render static cards with no interactivity. This spec adds inspector panels to both pages — following the established WorkerInspectorPanel pattern — so users can view and edit entity details inline.

---

## Interaction Model

Clicking anywhere on an asset card or crew card opens a slide-in inspector panel from the right. Cards gain a hover state (cursor pointer, subtle ring) to signal clickability. Panel state is managed locally in each page client component via a `selectedId` string (null = closed).

---

## Asset Inspector Panel

**Component:** `src/components/shell/AssetInspectorPanel.tsx`

**Trigger:** Click on any asset card in `AssetsClient`.

**Panel sections:**

1. **Header** — asset name, type subtitle, close button
2. **Status** — inline segmented control: Active / Maintenance / Offline. Role-gated: owner, admin, superintendent can edit.
3. **Project** — dropdown of org projects showing current assignment. Role-gated: owner, admin only.
4. **Last Seen** — read-only relative timestamp.
5. **Linked Issues** — list of open issues filtered by `asset_id`. Each row shows severity badge, title, status. Clickable — navigates to `/modules/fix?issueId=xxx&assetId=xxx&source=asset-inspector` for fix issues, or `/issues?highlight=xxx` for others.

**OrgProvider mutations needed:**
- `updateAssetStatus(assetId: string, status: AssetStatus): void`
- `updateAssetProject(assetId: string, projectId: string): void`

---

## Crew Inspector Panel

**Component:** `src/components/shell/CrewInspectorPanel.tsx`

**Trigger:** Click on any crew card in `CrewsClient`.

**Panel sections:**

1. **Header** — crew name (editable inline), close button. Name edit role-gated: owner, admin, superintendent.
2. **Status** — inline segmented control: On Site / Off Site. Same role gate.
3. **Lead** — read-only display of `leadName`. Lead reassignment is out of scope.
4. **Members** — two stacked lists:
   - *In this crew* — workers in `memberIds`, each row shows name + role + remove (×) button.
   - *Available to add* — all OrgWorkers not in this crew, each row shows name + role + add (+) button.
   - No search/filter (crews are small enough that a flat list is sufficient for Phase 1).

**OrgProvider mutations needed:**
- `updateCrewStatus(crewId: string, status: CrewStatus): void`
- `updateCrewName(crewId: string, name: string): void`
- `addWorkerToCrew(crewId: string, workerId: string): void`
- `removeWorkerFromCrew(crewId: string, workerId: string): void`

---

## Role Gating Summary

| Action                        | Allowed Roles                        |
|-------------------------------|--------------------------------------|
| Edit asset status             | owner, admin, superintendent         |
| Edit asset project            | owner, admin                         |
| Edit crew name                | owner, admin, superintendent         |
| Edit crew status              | owner, admin, superintendent         |
| Add/remove crew members       | owner, admin, superintendent         |

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/shell/AssetInspectorPanel.tsx` | New component |
| `src/components/shell/CrewInspectorPanel.tsx` | New component |
| `src/app/(shell)/assets/client.tsx` | Add selectedAssetId state, card onClick, panel mount |
| `src/app/(shell)/crews/client.tsx` | Add selectedCrewId state, card onClick, panel mount |
| `src/providers/OrgProvider.tsx` | Add 4 asset mutations + 4 crew mutations |

---

## Out of Scope

- Lead reassignment on crew panel
- Search/filter on crew member lists
- Asset history / maintenance log
- Backend persistence (Phase 1 — mock data only)
