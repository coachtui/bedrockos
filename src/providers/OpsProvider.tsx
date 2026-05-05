"use client";

/**
 * OpsProvider — shared OPS session state
 *
 * Responsibilities:
 *   - requests (create, approve, assign)
 *   - pour schedule (create, edit, submit, approve, reject, cancel)
 *
 * Work orders are NOT owned here. MX is the single source of truth for all
 * work orders. When a request is assigned, OpsProvider calls onCreateMxWorkOrder
 * (injected by the layout) so that MxProvider creates the canonical WO.
 *
 * Hydrates from server-fetched initialPours and initialRequests. Mutations
 * follow optimistic-then-reconcile: dispatch optimistic state, fire server
 * action, UPSERT with the persisted row when it lands.
 */

import React, { createContext, useContext, useReducer } from "react";
import {
  serverCreatePour,
  serverEditPour,
  serverSubmitPourForApproval,
  serverApprovePour,
  serverRejectPour,
  serverCancelPour,
} from "@/lib/actions/ops-pours";
import {
  serverCreateRequest,
  serverApproveRequest,
  serverAssignRequest,
} from "@/lib/actions/ops-requests";
import {
  POUR_STATUS,
  isValidTransition,
  isAdminRole,
  canApprovePour,
  canCancelPour,
  canSubmitForApproval,
  canEditPour,
} from "@/lib/ops/pourRules";
import type {
  Request as OpsRequest, RequestStatus,
  PourEvent, CreatePourInput,
} from "@/lib/ops/types";
import type { CreateMxWorkOrderInput } from "@/lib/mx/types";
import type { UserRole } from "@/types/org";

// ── Transition rules ──────────────────────────────────────────────────────────

const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  pending:  ["approved"],
  approved: ["assigned"],
  assigned: [],
  open:     ["closed"],
  closed:   [],
};

// ── State ─────────────────────────────────────────────────────────────────────

interface OpsState {
  requests: OpsRequest[];
  pours:    PourEvent[];
}

type WorkerInput = { id: string; label: string; role?: string };

export interface DispatchAssignment {
  assignedTo?:         string;
  assignedFrom?:       string;
  assignedFromCustom?: string;
  assignedBy?:         string;
}

type OpsAction =
  | { type: "UPSERT_REQUEST"; request: OpsRequest }
  | { type: "REMOVE_REQUEST"; id: string }
  | { type: "UPSERT_POUR";    pour: PourEvent }
  | { type: "REMOVE_POUR";    id: string };

function opsReducer(state: OpsState, action: OpsAction): OpsState {
  switch (action.type) {
    case "UPSERT_REQUEST": {
      const exists = state.requests.some((r) => r.id === action.request.id);
      return {
        ...state,
        requests: exists
          ? state.requests.map((r) => (r.id === action.request.id ? action.request : r))
          : [...state.requests, action.request],
      };
    }
    case "REMOVE_REQUEST":
      return { ...state, requests: state.requests.filter((r) => r.id !== action.id) };
    case "UPSERT_POUR": {
      const exists = state.pours.some((p) => p.id === action.pour.id);
      return {
        ...state,
        pours: exists
          ? state.pours.map((p) => (p.id === action.pour.id ? action.pour : p))
          : [...state.pours, action.pour],
      };
    }
    case "REMOVE_POUR":
      return { ...state, pours: state.pours.filter((p) => p.id !== action.id) };
    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────

interface OpsContextValue {
  requests:              OpsRequest[];
  approveRequest:        (id: string) => void;
  assignRequest:         (id: string, worker?: WorkerInput, opts?: DispatchAssignment) => void;
  createRequest:         (data: Omit<OpsRequest, "id">) => void;
  pours:                 PourEvent[];
  createPour:            (input: CreatePourInput, asDraft: boolean) => void;
  editPour:              (id: string, updates: Omit<CreatePourInput, "createdBy" | "createdByName">, actorRole: UserRole, actorId: string, options?: { preserveStatus?: boolean; submitForApproval?: boolean }) => void;
  submitPourForApproval: (id: string, actorRole: UserRole, actorId: string) => void;
  approvePour:           (id: string, actorRole: UserRole, actorId: string, actorName: string) => void;
  rejectPour:            (id: string, reason: string, actorRole: UserRole, actorId: string, actorName: string) => void;
  cancelPour:            (id: string, reason: string, actorRole: UserRole, actorId: string, actorName: string) => void;
}

const OpsContext = createContext<OpsContextValue | null>(null);

function logMutationFailure(operation: string): (error: unknown) => void {
  return (error) => {
    console.error(`[ops:persist] ${operation} failed`, error);
  };
}

// ── Provider ──────────────────────────────────────────────────────────────────

interface OpsProviderProps {
  children:            React.ReactNode;
  initialPours:        PourEvent[];
  initialRequests:     OpsRequest[];
  /** Injected by the layout so OpsProvider can create MX work orders without
   *  depending on MxProvider directly (they are siblings in the tree). */
  onCreateMxWorkOrder: (input: CreateMxWorkOrderInput) => { id: string };
}

export function OpsProvider({
  children,
  initialPours,
  initialRequests,
  onCreateMxWorkOrder,
}: OpsProviderProps) {
  const [state, dispatch] = useReducer(opsReducer, {
    requests: initialRequests,
    pours:    initialPours,
  });

  // ── Request actions ───────────────────────────────────────────────────────

  function approveRequest(id: string): void {
    const req = state.requests.find((r) => r.id === id);
    if (!req || !REQUEST_TRANSITIONS[req.status].includes("approved")) return;

    const optimistic: OpsRequest = { ...req, status: "approved" };
    dispatch({ type: "UPSERT_REQUEST", request: optimistic });

    serverApproveRequest(id)
      .then((persisted) => dispatch({ type: "UPSERT_REQUEST", request: persisted }))
      .catch(logMutationFailure(`approveRequest(${id})`));
  }

  function assignRequest(id: string, worker?: WorkerInput, opts?: DispatchAssignment): void {
    const req = state.requests.find((r) => r.id === id);
    if (!req) return;

    const newStatus: RequestStatus = req.status === "open" ? "closed" : "assigned";
    if (!REQUEST_TRANSITIONS[req.status].includes(newStatus)) return;

    let linkedMxWorkOrderId: string | undefined;
    if (req.status === "approved") {
      const wo = onCreateMxWorkOrder({
        title:           `Dispatch: ${req.type.replace("_", " ")} — ${req.jobsite}`,
        category:        "corrective",
        priority:        "medium",
        requestedBy:     req.requestedBy ?? "OPS",
        requestedDate:   new Date().toISOString().split("T")[0],
        neededByDate:    req.dateNeeded,
        readinessImpact: null,
        opsBlocking:     false,
      });
      linkedMxWorkOrderId = wo.id;
    }

    const now = new Date().toISOString();
    const optimistic: OpsRequest = {
      ...req,
      status:              newStatus,
      assignedToId:        worker?.id,
      assignedToLabel:     worker?.label ?? opts?.assignedTo ?? "TBD",
      assignedToRole:      worker?.role,
      linkedMxWorkOrderId,
      assignedTo:          opts?.assignedTo ?? worker?.label,
      assignedFrom:        opts?.assignedFrom,
      assignedFromCustom:  opts?.assignedFromCustom,
      assignedAt:          now,
      assignedBy:          opts?.assignedBy,
    };
    dispatch({ type: "UPSERT_REQUEST", request: optimistic });

    serverAssignRequest(id, {
      status:              newStatus,
      assignedTo:          optimistic.assignedTo,
      assignedFrom:        optimistic.assignedFrom,
      assignedFromCustom:  optimistic.assignedFromCustom,
      assignedAt:          now,
      assignedBy:          optimistic.assignedBy,
      assignedToId:        optimistic.assignedToId,
      assignedToLabel:     optimistic.assignedToLabel,
      assignedToRole:      optimistic.assignedToRole,
      linkedMxWorkOrderId,
    })
      .then((persisted) => dispatch({ type: "UPSERT_REQUEST", request: persisted }))
      .catch(logMutationFailure(`assignRequest(${id})`));
  }

  function createRequest(data: Omit<OpsRequest, "id">): void {
    const optimistic: OpsRequest = { ...data, id: crypto.randomUUID() };
    dispatch({ type: "UPSERT_REQUEST", request: optimistic });

    serverCreateRequest(optimistic)
      .then((persisted) => dispatch({ type: "UPSERT_REQUEST", request: persisted }))
      .catch((err) => {
        logMutationFailure(`createRequest(${optimistic.id})`)(err);
        dispatch({ type: "REMOVE_REQUEST", id: optimistic.id });
      });
  }

  // ── Pour actions ──────────────────────────────────────────────────────────

  function createPour(input: CreatePourInput, asDraft: boolean): void {
    const id = crypto.randomUUID();
    const optimistic: PourEvent = {
      ...input,
      id,
      status:               asDraft ? POUR_STATUS.DRAFT : POUR_STATUS.PENDING_APPROVAL,
      requestedAt:          new Date().toISOString(),
      relatedWorkOrderIds:  [],
      equipmentAssignments: [],
    };
    dispatch({ type: "UPSERT_POUR", pour: optimistic });

    serverCreatePour(id, input, asDraft)
      .then((persisted) => dispatch({ type: "UPSERT_POUR", pour: persisted }))
      .catch((err) => {
        logMutationFailure(`createPour(${id})`)(err);
        dispatch({ type: "REMOVE_POUR", id });
      });
  }

  function editPour(
    id: string,
    updates: Omit<CreatePourInput, "createdBy" | "createdByName">,
    actorRole: UserRole,
    actorId: string,
    options?: { preserveStatus?: boolean; submitForApproval?: boolean },
  ): void {
    const pour = state.pours.find((p) => p.id === id);
    if (!pour) return;
    if (!canEditPour(actorRole, pour, actorId)) return;

    let newStatus = pour.status;
    if (options?.submitForApproval && canSubmitForApproval(actorRole, pour, actorId)) {
      newStatus = POUR_STATUS.PENDING_APPROVAL;
    } else if (!options?.preserveStatus && !isAdminRole(actorRole) && pour.status === POUR_STATUS.APPROVED) {
      newStatus = POUR_STATUS.PENDING_APPROVAL;
    }
    const clearApproval = newStatus === POUR_STATUS.PENDING_APPROVAL && pour.status === POUR_STATUS.APPROVED;

    const optimistic: PourEvent = {
      ...pour,
      ...updates,
      status: newStatus,
      ...(clearApproval ? {
        approvedBy:     undefined,
        approvedByName: undefined,
        approvedAt:     undefined,
      } : {}),
    };
    dispatch({ type: "UPSERT_POUR", pour: optimistic });

    serverEditPour(id, updates, newStatus, clearApproval)
      .then((persisted) => dispatch({ type: "UPSERT_POUR", pour: persisted }))
      .catch(logMutationFailure(`editPour(${id})`));
  }

  function submitPourForApproval(id: string, actorRole: UserRole, actorId: string): void {
    const pour = state.pours.find((p) => p.id === id);
    if (!pour) return;
    if (!canSubmitForApproval(actorRole, pour, actorId)) return;

    const optimistic: PourEvent = {
      ...pour,
      status:          POUR_STATUS.PENDING_APPROVAL,
      rejectionReason: undefined,
    };
    dispatch({ type: "UPSERT_POUR", pour: optimistic });

    serverSubmitPourForApproval(id)
      .then((persisted) => dispatch({ type: "UPSERT_POUR", pour: persisted }))
      .catch(logMutationFailure(`submitPourForApproval(${id})`));
  }

  function approvePour(id: string, actorRole: UserRole, actorId: string, actorName: string): void {
    const pour = state.pours.find((p) => p.id === id);
    if (!pour) return;
    if (!canApprovePour(actorRole)) return;
    if (!isValidTransition(pour.status, POUR_STATUS.APPROVED)) return;

    const now = new Date().toISOString();
    const optimistic: PourEvent = {
      ...pour,
      status:          POUR_STATUS.APPROVED,
      approvedBy:      actorId,
      approvedByName:  actorName,
      approvedAt:      now,
      rejectedBy:      undefined,
      rejectedByName:  undefined,
      rejectionReason: undefined,
    };
    dispatch({ type: "UPSERT_POUR", pour: optimistic });

    serverApprovePour(id, actorId, actorName)
      .then((persisted) => dispatch({ type: "UPSERT_POUR", pour: persisted }))
      .catch(logMutationFailure(`approvePour(${id})`));

    // Auto-create dispatch requests for resource needs declared on this pour.
    // Guard against duplicates on re-approval.
    const alreadyCreated = state.requests.filter((r) => r.sourcePourId === id);

    if (pour.pumpRequest.requested && !alreadyCreated.some((r) => r.type === "pump_truck")) {
      createRequest({
        type:              "pump_truck",
        jobsite:           pour.location,
        dateNeeded:        pour.date,
        notes:             pour.pumpRequest.notes ?? `Pump truck for ${pour.yardage} yd³ pour.`,
        status:            "pending",
        requestedBy:       pour.createdByName,
        requestedByUserId: pour.createdBy,
        sourcePourId:      pour.id,
      });
    }

    if (pour.masonRequest.requested && !alreadyCreated.some((r) => r.type === "mason")) {
      createRequest({
        type:              "mason",
        jobsite:           pour.location,
        dateNeeded:        pour.date,
        notes:             pour.masonRequest.notes ?? `${pour.masonRequest.masonCount ?? "?"} masons needed for pour.`,
        status:            "pending",
        requestedBy:       pour.createdByName,
        requestedByUserId: pour.createdBy,
        requestedCount:    pour.masonRequest.masonCount,
        sourcePourId:      pour.id,
      });
    }
  }

  function rejectPour(
    id: string,
    reason: string,
    actorRole: UserRole,
    actorId: string,
    actorName: string,
  ): void {
    const pour = state.pours.find((p) => p.id === id);
    if (!pour) return;
    if (!canApprovePour(actorRole)) return;
    if (!isValidTransition(pour.status, POUR_STATUS.REJECTED)) return;

    const optimistic: PourEvent = {
      ...pour,
      status:          POUR_STATUS.REJECTED,
      rejectedBy:      actorId,
      rejectedByName:  actorName,
      rejectionReason: reason.trim() || "No reason provided.",
      approvedBy:      undefined,
      approvedByName:  undefined,
      approvedAt:      undefined,
    };
    dispatch({ type: "UPSERT_POUR", pour: optimistic });

    serverRejectPour(id, reason, actorId, actorName)
      .then((persisted) => dispatch({ type: "UPSERT_POUR", pour: persisted }))
      .catch(logMutationFailure(`rejectPour(${id})`));
  }

  function cancelPour(
    id: string,
    reason: string,
    actorRole: UserRole,
    actorId: string,
    actorName: string,
  ): void {
    const pour = state.pours.find((p) => p.id === id);
    if (!pour) return;
    if (!canCancelPour(actorRole, pour, actorId)) return;

    const optimistic: PourEvent = {
      ...pour,
      status:             POUR_STATUS.CANCELED,
      canceledBy:         actorId,
      canceledByName:     actorName,
      canceledAt:         new Date().toISOString(),
      cancellationReason: reason.trim() || "No reason provided.",
    };
    dispatch({ type: "UPSERT_POUR", pour: optimistic });

    serverCancelPour(id, reason, actorId, actorName)
      .then((persisted) => dispatch({ type: "UPSERT_POUR", pour: persisted }))
      .catch(logMutationFailure(`cancelPour(${id})`));
  }

  return (
    <OpsContext.Provider
      value={{
        requests:              state.requests,
        approveRequest,
        assignRequest,
        createRequest,
        pours:                 state.pours,
        createPour,
        editPour,
        submitPourForApproval,
        approvePour,
        rejectPour,
        cancelPour,
      }}
    >
      {children}
    </OpsContext.Provider>
  );
}

export function useOps(): OpsContextValue {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error("useOps must be used within OpsProvider");
  return ctx;
}
