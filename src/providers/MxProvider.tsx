"use client";

/**
 * MxProvider — Maintenance module session state
 *
 * Hydrates from server-fetched initialWorkOrders (props). Mutations follow the
 * optimistic-then-reconcile pattern: dispatch optimistic state immediately,
 * fire server action, then UPSERT with the persisted row when it lands.
 *
 * Responsibilities:
 *   - MX work orders (CRUD + status transitions)
 *   - Mechanic assignment / unassignment
 *   - Derived equipment readiness (computed via readiness.ts — not stored)
 *
 * NOT responsible for:
 *   - CRU data fetching (stays in src/lib/integrations/cru.ts)
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useMemo,
  useRef,
} from "react";
import {
  serverCreateMxWorkOrder,
  serverUpdateMxWorkOrderStatus,
  serverUpdateMxWorkOrder,
  serverAssignMechanic,
  serverUnassignMechanic,
} from "@/lib/actions/mx-work-orders";
import { deriveAllReadiness } from "@/lib/mx/readiness";
import { WO_TRANSITIONS } from "@/lib/mx/rules";
import type {
  MxWorkOrder,
  MxWorkOrderStatus,
  CreateMxWorkOrderInput,
  MxWorkOrderUpdate,
  EquipmentReadiness,
} from "@/lib/mx/types";
import type { ActivityEvent } from "@/types/domain";

type EmitActivityInput =
  Omit<ActivityEvent, "id" | "timestamp" | "actor_name"> &
  { actor_name?: string };
export type EmitActivityFn = (event: EmitActivityInput) => void;

// ── State ─────────────────────────────────────────────────────────────────────

interface MxState {
  workOrders: MxWorkOrder[];
}

type MxAction =
  | { type: "UPSERT_WORK_ORDER"; workOrder: MxWorkOrder }
  | { type: "REMOVE_WORK_ORDER"; id: string };

function mxReducer(state: MxState, action: MxAction): MxState {
  switch (action.type) {
    case "UPSERT_WORK_ORDER": {
      const exists = state.workOrders.some((w) => w.id === action.workOrder.id);
      return {
        workOrders: exists
          ? state.workOrders.map((w) => (w.id === action.workOrder.id ? action.workOrder : w))
          : [...state.workOrders, action.workOrder],
      };
    }
    case "REMOVE_WORK_ORDER":
      return { workOrders: state.workOrders.filter((w) => w.id !== action.id) };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface MxContextValue {
  workOrders:            MxWorkOrder[];
  readiness:             EquipmentReadiness[];
  createWorkOrder:       (input: CreateMxWorkOrderInput) => MxWorkOrder;
  updateWorkOrderStatus: (id: string, status: MxWorkOrderStatus) => void;
  updateWorkOrder:       (id: string, updates: MxWorkOrderUpdate) => void;
  assignMechanic:        (workOrderId: string, mechanicId: string) => void;
  unassignMechanic:      (workOrderId: string, mechanicId: string) => void;
}

const MxContext = createContext<MxContextValue | null>(null);

// ── Helpers ───────────────────────────────────────────────────────────────────

function maxWoNumber(workOrders: MxWorkOrder[]): number {
  let max = 0;
  for (const wo of workOrders) {
    const m = /^WO-(\d+)$/.exec(wo.woNumber);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n > max) max = n;
    }
  }
  return max;
}

function logMutationFailure(operation: string): (error: unknown) => void {
  return (error) => {
    console.error(`[mx:persist] ${operation} failed`, error);
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function MxProvider({
  children,
  initialWorkOrders = [],
  onEmitActivity,
}: {
  children:           React.ReactNode;
  initialWorkOrders?: MxWorkOrder[];
  onEmitActivity?:    EmitActivityFn;
}) {
  const [state, dispatch] = useReducer(mxReducer, { workOrders: initialWorkOrders });

  // Local-only WO number counter for optimistic display. Server trigger is the
  // source of truth — UPSERT reconciles when the persisted row lands.
  const localWoCounterRef = useRef(maxWoNumber(initialWorkOrders) + 1);
  const nextOptimisticWoNumber = (): string =>
    `WO-${String(localWoCounterRef.current++).padStart(4, "0")}`;

  const readiness = useMemo(
    () => deriveAllReadiness(state.workOrders),
    [state.workOrders],
  );

  function createWorkOrder(input: CreateMxWorkOrderInput): MxWorkOrder {
    const now = new Date().toISOString();
    const optimistic: MxWorkOrder = {
      id:                  crypto.randomUUID(),
      woNumber:            nextOptimisticWoNumber(),
      title:               input.title,
      description:         input.description,
      category:            input.category,
      priority:            input.priority,
      status:              "open",
      sourceType:          "manual",
      equipmentId:         input.equipmentId,
      equipmentLabel:      input.equipmentLabel,
      projectId:           input.projectId,
      projectName:         input.projectName,
      requestedBy:         input.requestedBy,
      requestedByUserId:   input.requestedByUserId,
      requestedDate:       input.requestedDate,
      neededByDate:        input.neededByDate,
      requiredSkills:      input.requiredSkills ?? [],
      estimatedHours:      input.estimatedHours,
      readinessImpact:     input.readinessImpact,
      opsBlocking:         input.opsBlocking,
      assignedMechanicIds: [],
      createdAt:           now,
      updatedAt:           now,
    };
    dispatch({ type: "UPSERT_WORK_ORDER", workOrder: optimistic });

    serverCreateMxWorkOrder(optimistic.id, input)
      .then((persisted) => dispatch({ type: "UPSERT_WORK_ORDER", workOrder: persisted }))
      .catch((err) => {
        logMutationFailure(`createWorkOrder(${optimistic.id})`)(err);
        dispatch({ type: "REMOVE_WORK_ORDER", id: optimistic.id });
      });

    onEmitActivity?.({
      action:      "created work order",
      entity_type: "work_order",
      entity_id:   optimistic.id,
      entity_name: optimistic.woNumber,
      project_id:  input.projectId ?? "",
      module:      "mx",
    });

    return optimistic;
  }

  function updateWorkOrderStatus(id: string, status: MxWorkOrderStatus): void {
    const wo = state.workOrders.find((w) => w.id === id);
    if (!wo) return;
    if (!WO_TRANSITIONS[wo.status].includes(status)) return;

    const now = new Date().toISOString();
    const optimistic: MxWorkOrder = {
      ...wo,
      status,
      actualStart: status === "in_progress" ? now : wo.actualStart,
      actualEnd:   status === "completed"   ? now : wo.actualEnd,
      updatedAt:   now,
    };
    dispatch({ type: "UPSERT_WORK_ORDER", workOrder: optimistic });

    serverUpdateMxWorkOrderStatus(id, status)
      .then((persisted) => dispatch({ type: "UPSERT_WORK_ORDER", workOrder: persisted }))
      .catch(logMutationFailure(`updateWorkOrderStatus(${id})`));

    onEmitActivity?.({
      action:      `moved work order to ${status.replace("_", " ")}`,
      entity_type: "work_order",
      entity_id:   id,
      entity_name: wo.woNumber,
      project_id:  wo.projectId ?? "",
      module:      "mx",
    });
  }

  function updateWorkOrder(id: string, updates: MxWorkOrderUpdate): void {
    const wo = state.workOrders.find((w) => w.id === id);
    if (!wo) return;

    const optimistic: MxWorkOrder = {
      ...wo,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    dispatch({ type: "UPSERT_WORK_ORDER", workOrder: optimistic });

    serverUpdateMxWorkOrder(id, updates)
      .then((persisted) => dispatch({ type: "UPSERT_WORK_ORDER", workOrder: persisted }))
      .catch(logMutationFailure(`updateWorkOrder(${id})`));
  }

  function assignMechanic(workOrderId: string, mechanicId: string): void {
    const wo = state.workOrders.find((w) => w.id === workOrderId);
    if (!wo) return;
    if (wo.assignedMechanicIds.includes(mechanicId)) return;

    const optimistic: MxWorkOrder = {
      ...wo,
      assignedMechanicIds: [...wo.assignedMechanicIds, mechanicId],
      updatedAt:           new Date().toISOString(),
    };
    dispatch({ type: "UPSERT_WORK_ORDER", workOrder: optimistic });

    serverAssignMechanic(workOrderId, mechanicId)
      .then((persisted) => dispatch({ type: "UPSERT_WORK_ORDER", workOrder: persisted }))
      .catch(logMutationFailure(`assignMechanic(${workOrderId}, ${mechanicId})`));

    onEmitActivity?.({
      action:      "assigned mechanic to",
      entity_type: "work_order",
      entity_id:   workOrderId,
      entity_name: wo.woNumber,
      project_id:  wo.projectId ?? "",
      module:      "mx",
    });
  }

  function unassignMechanic(workOrderId: string, mechanicId: string): void {
    const wo = state.workOrders.find((w) => w.id === workOrderId);
    if (!wo) return;

    const optimistic: MxWorkOrder = {
      ...wo,
      assignedMechanicIds: wo.assignedMechanicIds.filter((id) => id !== mechanicId),
      updatedAt:           new Date().toISOString(),
    };
    dispatch({ type: "UPSERT_WORK_ORDER", workOrder: optimistic });

    serverUnassignMechanic(workOrderId, mechanicId)
      .then((persisted) => dispatch({ type: "UPSERT_WORK_ORDER", workOrder: persisted }))
      .catch(logMutationFailure(`unassignMechanic(${workOrderId}, ${mechanicId})`));

    onEmitActivity?.({
      action:      "removed mechanic from",
      entity_type: "work_order",
      entity_id:   workOrderId,
      entity_name: wo.woNumber,
      project_id:  wo.projectId ?? "",
      module:      "mx",
    });
  }

  return (
    <MxContext.Provider
      value={{
        workOrders:            state.workOrders,
        readiness,
        createWorkOrder,
        updateWorkOrderStatus,
        updateWorkOrder,
        assignMechanic,
        unassignMechanic,
      }}
    >
      {children}
    </MxContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMx(): MxContextValue {
  const ctx = useContext(MxContext);
  if (!ctx) throw new Error("useMx must be used within MxProvider");
  return ctx;
}
