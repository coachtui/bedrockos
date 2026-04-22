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
