# MX Role-Based Work Order Visibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scope MX work order visibility so supes, engineers, foremen, and PMs only see work orders for their current jobsite, while mechanics and admins see all.

**Architecture:** Add two pure functions to `rules.ts` (the existing pattern for business rules), wrap them in a `useVisibleWorkOrders()` hook, then swap the raw `workOrders` pull in the work orders list page and scheduling board page.

**Tech Stack:** Next.js App Router, React hooks, TypeScript. No test framework — verification done via the role switcher in the running dev server.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/lib/mx/rules.ts` | Modify | Add `canSeeAllProjects` + `filterWorkOrdersByVisibility` |
| `src/hooks/mx/useVisibleWorkOrders.ts` | Create | Compose `useMx` + `useOrg` → filtered list |
| `src/app/(shell)/modules/mx/work-orders/page.tsx` | Modify | Swap raw `workOrders` for `useVisibleWorkOrders()` |
| `src/app/(shell)/modules/mx/scheduling/page.tsx` | Modify | Same swap; keep other `useMx` destructures |

---

## Task 1: Add visibility rule functions to `rules.ts`

**Files:**
- Modify: `src/lib/mx/rules.ts` (append after `canUpdateWorkOrderStatus`)

- [ ] **Step 1: Add the two functions**

Open `src/lib/mx/rules.ts`. After the `canUpdateWorkOrderStatus` function (around line 56), add:

```ts
/** Roles that can see work orders across all projects (not just current jobsite) */
export function canSeeAllProjects(role: UserRole): boolean {
  return ["owner", "admin", "mechanic"].includes(role);
}

/** Returns work orders visible to the current role/project combination */
export function filterWorkOrdersByVisibility(
  workOrders: MxWorkOrder[],
  role: UserRole,
  currentProjectId: string,
): MxWorkOrder[] {
  if (canSeeAllProjects(role)) return workOrders;
  return workOrders.filter((wo) => wo.projectId === currentProjectId);
}
```

The `MxWorkOrder` type is already imported at the top of the file. `UserRole` is also already imported.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/mx/rules.ts
git commit -m "feat(mx): add canSeeAllProjects and filterWorkOrdersByVisibility rules"
```

---

## Task 2: Create `useVisibleWorkOrders` hook

**Files:**
- Create: `src/hooks/mx/useVisibleWorkOrders.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p src/hooks/mx
```

Create `src/hooks/mx/useVisibleWorkOrders.ts`:

```ts
"use client";

import { useMx } from "@/providers/MxProvider";
import { useOrg } from "@/providers/OrgProvider";
import { filterWorkOrdersByVisibility } from "@/lib/mx/rules";
import type { MxWorkOrder } from "@/lib/mx/types";

export function useVisibleWorkOrders(): MxWorkOrder[] {
  const { workOrders } = useMx();
  const { role, currentProject } = useOrg();
  return filterWorkOrdersByVisibility(workOrders, role, currentProject.id);
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/mx/useVisibleWorkOrders.ts
git commit -m "feat(mx): add useVisibleWorkOrders hook"
```

---

## Task 3: Update work orders page

**Files:**
- Modify: `src/app/(shell)/modules/mx/work-orders/page.tsx`

- [ ] **Step 1: Swap the import and hook call**

At the top of the file, add the import:

```ts
import { useVisibleWorkOrders } from "@/hooks/mx/useVisibleWorkOrders";
```

Inside `MxWorkOrdersContent`, replace:

```ts
const { workOrders } = useMx();
```

with:

```ts
const workOrders = useVisibleWorkOrders();
```

The `useMx` import can be removed if `workOrders` was the only thing destructured from it. Check the file — if `useMx` is still needed for other values (e.g. `createWorkOrder`), keep it but remove `workOrders` from the destructure.

Looking at the current file: `useMx` is only used for `workOrders` on line 64. Remove the `useMx` import and its call entirely.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and verify in browser**

```bash
npm run dev
```

Navigate to `/modules/mx/work-orders`. Use the role switcher (top of shell) to test:

| Role | Jobsite | Expected |
|---|---|---|
| superintendent | Highland Tower — Phase 2 | Only WOs with `projectId: "proj_highland_002"` (WO-0001, WO-0003, WO-0004, WO-0007) |
| superintendent | Oakridge Industrial Complex | Only WOs with `projectId: "proj_oakridge_001"` (WO-0002, WO-0005, WO-0008) |
| mechanic | Any | All 8 WOs visible |
| admin | Any | All 8 WOs visible |
| foreman | Meridian Bridge Rehab | Only WO-0006 |
| pm | Highland Tower — Phase 2 | Only WOs for Highland (WO-0001, WO-0003, WO-0004, WO-0007) |

Filter tab counts should update to reflect the scoped list, not the global total.

- [ ] **Step 4: Commit**

```bash
git add src/app/(shell)/modules/mx/work-orders/page.tsx
git commit -m "feat(mx): scope work orders list to current jobsite for non-admin roles"
```

---

## Task 4: Update scheduling page

**Files:**
- Modify: `src/app/(shell)/modules/mx/scheduling/page.tsx`

- [ ] **Step 1: Swap the hook**

Add the import at the top:

```ts
import { useVisibleWorkOrders } from "@/hooks/mx/useVisibleWorkOrders";
```

The scheduling page destructures multiple things from `useMx` on line 393:

```ts
const { workOrders, assignMechanic, unassignMechanic, updateWorkOrderStatus, updateWorkOrder } = useMx();
```

Split this into two lines — keep `useMx` for the actions, pull `workOrders` from the new hook:

```ts
const { assignMechanic, unassignMechanic, updateWorkOrderStatus, updateWorkOrder } = useMx();
const workOrders = useVisibleWorkOrders();
```

The `useMx` import stays. All `useMemo` hooks that depend on `workOrders` update automatically since the variable name is unchanged.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Verify in browser**

Navigate to `/modules/mx/scheduling`. Use the role switcher:

| Role | Jobsite | Expected |
|---|---|---|
| superintendent | Highland Tower — Phase 2 | Board shows only Highland WOs in columns |
| admin | Any | Full board with all WOs |
| mechanic | Any | Full board (mechanics see all) |

Drag-and-drop assign (admin only) should still function correctly. The WO inspector panel should open normally when clicking a card.

- [ ] **Step 4: Commit**

```bash
git add src/app/(shell)/modules/mx/scheduling/page.tsx
git commit -m "feat(mx): scope scheduling board to current jobsite for non-admin roles"
```
