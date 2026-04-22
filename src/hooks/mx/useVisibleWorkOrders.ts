"use client";

import { useMx } from "@/providers/MxProvider";
import { useOrg } from "@/providers/OrgProvider";
import { filterWorkOrdersByVisibility } from "@/lib/mx/rules";

/** Returns work orders scoped to the current project for non-admin roles. */
export function useVisibleWorkOrders() {
  const { workOrders } = useMx();
  const { role, currentProject } = useOrg();
  return filterWorkOrdersByVisibility(workOrders, role, currentProject.id);
}
