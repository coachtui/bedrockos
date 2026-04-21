# MX Role-Based Work Order Visibility

**Date:** 2026-04-21
**Status:** Approved

## Problem

The MX work orders list and scheduling board show all work orders to all roles regardless of which jobsite is selected. Superintendents, project engineers, foremen, and PMs should only see work orders for their current jobsite. Mechanics and admins need cross-project visibility.

## Visibility Rules

| Role | Sees |
|---|---|
| owner, admin, mechanic | All work orders across all projects |
| pm, project_engineer, superintendent, foreman, viewer | Work orders for current jobsite only |

Switching jobsites updates the scoped view immediately since `currentProject` comes from `useOrg()` context.

## Implementation

### 1. New pure functions in `src/lib/mx/rules.ts`

```ts
export function canSeeAllProjects(role: UserRole): boolean {
  return ["owner", "admin", "mechanic"].includes(role);
}

export function filterWorkOrdersByVisibility(
  workOrders: MxWorkOrder[],
  role: UserRole,
  currentProjectId: string,
): MxWorkOrder[] {
  if (canSeeAllProjects(role)) return workOrders;
  return workOrders.filter((wo) => wo.projectId === currentProjectId);
}
```

### 2. New hook `src/hooks/mx/useVisibleWorkOrders.ts`

```ts
import { useMx } from "@/providers/MxProvider";
import { useOrg } from "@/providers/OrgProvider";
import { filterWorkOrdersByVisibility } from "@/lib/mx/rules";

export function useVisibleWorkOrders() {
  const { workOrders } = useMx();
  const { role, currentProject } = useOrg();
  return filterWorkOrdersByVisibility(workOrders, role, currentProject.id);
}
```

### 3. Page changes

**Work Orders page** (`src/app/(shell)/modules/mx/work-orders/page.tsx`):
- Replace `const { workOrders } = useMx()` with `const workOrders = useVisibleWorkOrders()`
- All derived state (counts, sorted list, filter tabs) automatically scopes correctly

**Scheduling page** (`src/app/(shell)/modules/mx/scheduling/page.tsx`):
- Same swap — replace raw `workOrders` pull with `useVisibleWorkOrders()`

**My Work page** (`src/app/(shell)/modules/mx/my-work/page.tsx`):
- No change — already filters by `assignedMechanicIds`; only mechanics/admins use it

## Out of Scope

- Driver assignment — future OPS concept (fueling dispatch, pump truck, equipment moves)
- UX messaging to scoped users — no banner needed, scoped data is their expected reality
- Assignment permissions — `canAssignMechanic()` already limits to owner/admin, no change needed

## Future Considerations

- When real auth and backend land, `filterWorkOrdersByVisibility` becomes the contract for what the API query should enforce server-side
- The `canSeeAllProjects` rule may grow to include org-level overrides or module-scope entitlements
