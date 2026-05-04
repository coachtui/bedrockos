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
 * The resulting MX work order ID is stored on the request as linkedMxWorkOrderId.
 *
 * Phase 3 migration path: swap poursService / requestsService for Supabase
 * calls — no page-component changes required.
 */

import React, { createContext, useContext, useReducer, useEffect } from "react";
import * as poursService from "@/lib/ops/poursService";
import * as requestsService from "@/lib/ops/requestsService";
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
  | { type: "INIT_REQUESTS";   requests: OpsRequest[] }
  | { type: "APPROVE_REQUEST"; id: string }
  | {
      type:                 "ASSIGN_REQUEST";
      id:                   string;
      worker?:              WorkerInput;
      linkedMxWorkOrderId?: string;
    } & DispatchAssignment
  | { type: "CREATE_REQUEST"; request: OpsRequest }
  // Pour actions — state update only; service already persisted before dispatch
  | { type: "INIT_POURS";  pours: PourEvent[] }
  | { type: "UPSERT_POUR"; pour:  PourEvent   };

// ── Reducer ───────────────────────────────────────────────────────────────────

function opsReducer(state: OpsState, action: OpsAction): OpsState {
  switch (action.type) {

    case "INIT_REQUESTS": {
      return { ...state, requests: action.requests };
    }

    case "APPROVE_REQUEST": {
      const req = state.requests.find((r) => r.id === action.id);
      if (!req || !REQUEST_TRANSITIONS[req.status].includes("approved")) return state;
      return {
        ...state,
        requests: state.requests.map((r) =>
          r.id === action.id ? { ...r, status: "approved" } : r,
        ),
      };
    }

    case "ASSIGN_REQUEST": {
      const req = state.requests.find((r) => r.id === action.id);
      if (!req) return state;

      const newStatus: RequestStatus = (req.status === "open") ? "closed" : "assigned";
      if (!(REQUEST_TRANSITIONS[req.status] ?? []).includes(newStatus)) return state;

      const { worker, linkedMxWorkOrderId } = action;

      const updatedReq: OpsRequest = {
        ...req,
        status:              newStatus,
        // Legacy CRU fields (pour-linked flow)
        assignedToId:        worker?.id,
        assignedToLabel:     worker?.label ?? action.assignedTo ?? "TBD",
        assignedToRole:      worker?.role,
        linkedMxWorkOrderId,
        // Dispatch fields (new flow)
        assignedTo:          action.assignedTo ?? worker?.label,
        assignedFrom:        action.assignedFrom,
        assignedFromCustom:  action.assignedFromCustom,
        assignedAt:          new Date().toISOString(),
        assignedBy:          action.assignedBy,
      };

      return {
        ...state,
        requests: state.requests.map((r) => r.id === action.id ? updatedReq : r),
      };
    }

    case "CREATE_REQUEST": {
      return { ...state, requests: [...state.requests, action.request] };
    }

    case "INIT_POURS": {
      return { ...state, pours: action.pours };
    }

    case "UPSERT_POUR": {
      const exists = state.pours.some((p) => p.id === action.pour.id);
      return {
        ...state,
        pours: exists
          ? state.pours.map((p) => (p.id === action.pour.id ? action.pour : p))
          : [...state.pours, action.pour],
      };
    }

    default:
      return state;
  }
}

const INITIAL_STATE: OpsState = {
  requests: [], // loaded from requestsService after hydration
  pours:    [], // loaded from poursService after hydration
};

// ── Context ───────────────────────────────────────────────────────────────────

interface OpsContextValue {
  requests:              OpsRequest[];
  approveRequest:        (id: string) => void;
  /**
   * Assign a request to a worker.
   * This creates a MX work order (via the injected callback) and stores the
   * returned WO id as linkedMxWorkOrderId on the request.
   */
  assignRequest:         (id: string, worker?: WorkerInput, opts?: DispatchAssignment) => void;
  createRequest:         (data: Omit<OpsRequest, "id">) => void;
  // Pours
  pours:                 PourEvent[];
  createPour:            (input: CreatePourInput, asDraft: boolean) => void;
  editPour:              (id: string, updates: Omit<CreatePourInput, "createdBy" | "createdByName">, actorRole: UserRole, actorId: string, options?: { preserveStatus?: boolean; submitForApproval?: boolean }) => void;
  submitPourForApproval: (id: string, actorRole: UserRole, actorId: string) => void;
  approvePour:           (id: string, actorRole: UserRole, actorId: string, actorName: string) => void;
  rejectPour:            (id: string, reason: string, actorRole: UserRole, actorId: string, actorName: string) => void;
  cancelPour:            (id: string, reason: string, actorRole: UserRole, actorId: string, actorName: string) => void;
}

const OpsContext = createContext<OpsContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

interface OpsProviderProps {
  children: React.ReactNode;
  /** Injected by the layout so OpsProvider can create MX work orders without
   *  depending on MxProvider directly (they are siblings in the tree). */
  onCreateMxWorkOrder: (input: CreateMxWorkOrderInput) => { id: string };
}

export function OpsProvider({ children, onCreateMxWorkOrder }: OpsProviderProps) {
  const [state, dispatch] = useReducer(opsReducer, INITIAL_STATE);

  // Load pours + requests from services after hydration to avoid SSR/client mismatch
  useEffect(() => {
    dispatch({ type: "INIT_POURS",    pours:    poursService.getAllPours() });
    dispatch({ type: "INIT_REQUESTS", requests: requestsService.getAllRequests() });
  }, []);

  // Persist requests to localStorage whenever they change (after initial load)
  useEffect(() => {
    if (state.requests.length === 0) return;
    requestsService.saveAll(state.requests);
  }, [state.requests]);

  // ── Request actions ───────────────────────────────────────────────────────

  function approveRequest(id: string): void {
    dispatch({ type: "APPROVE_REQUEST", id });
  }

  function assignRequest(id: string, worker?: WorkerInput, opts?: DispatchAssignment): void {
    const req = state.requests.find((r) => r.id === id);
    if (!req) return;

    let linkedMxWorkOrderId: string | undefined;

    // Only create an MX work order for the legacy CRU-linked flow (approved → assigned).
    // New dispatch requests (open → closed) don't need MX work orders.
    if (req.status === "approved") {
      const wo = onCreateMxWorkOrder({
        title:            `Dispatch: ${req.type.replace("_", " ")} — ${req.jobsite}`,
        category:         "corrective",
        priority:         "medium",
        requestedBy:      req.requestedBy ?? "OPS",
        requestedDate:    new Date().toISOString().split("T")[0],
        neededByDate:     req.dateNeeded,
        readinessImpact:  null,
        opsBlocking:      false,
      });
      linkedMxWorkOrderId = wo.id;
    }

    dispatch({
      type:                "ASSIGN_REQUEST",
      id,
      worker,
      linkedMxWorkOrderId,
      ...opts,
    });
  }

  function createRequest(data: Omit<OpsRequest, "id">): void {
    dispatch({ type: "CREATE_REQUEST", request: { ...data, id: crypto.randomUUID() } });
  }

  // ── Pour actions ──────────────────────────────────────────────────────────
  // Each function calls the service (which enforces rules + persists), then
  // dispatches to update React state.

  function createPour(input: CreatePourInput, asDraft: boolean): void {
    const pour = poursService.createPour(input, asDraft);
    dispatch({ type: "UPSERT_POUR", pour });
  }

  function editPour(
    id: string,
    updates: Omit<CreatePourInput, "createdBy" | "createdByName">,
    actorRole: UserRole,
    actorId: string,
    options?: { preserveStatus?: boolean; submitForApproval?: boolean },
  ): void {
    const pour = poursService.editPour(id, updates, actorRole, actorId, options);
    if (pour) dispatch({ type: "UPSERT_POUR", pour });
  }

  function submitPourForApproval(id: string, actorRole: UserRole, actorId: string): void {
    const pour = poursService.submitForApproval(id, actorRole, actorId);
    if (pour) dispatch({ type: "UPSERT_POUR", pour });
  }

  function approvePour(id: string, actorRole: UserRole, actorId: string, actorName: string): void {
    const pour = poursService.approvePour(id, actorRole, actorId, actorName);
    if (!pour) return;
    dispatch({ type: "UPSERT_POUR", pour });

    // Auto-create dispatch requests for resource needs declared on this pour.
    // Guard against duplicates on re-approval.
    const alreadyCreated = state.requests.filter((r) => r.sourcePourId === id);

    if (pour.pumpRequest.requested && !alreadyCreated.some((r) => r.type === "pump_truck")) {
      dispatch({
        type: "CREATE_REQUEST",
        request: {
          id:                crypto.randomUUID(),
          type:              "pump_truck",
          jobsite:           pour.location,
          dateNeeded:        pour.date,
          notes:             pour.pumpRequest.notes ?? `Pump truck for ${pour.yardage} yd³ pour.`,
          status:            "pending",
          requestedBy:       pour.createdByName,
          requestedByUserId: pour.createdBy,
          sourcePourId:      pour.id,
        },
      });
    }

    if (pour.masonRequest.requested && !alreadyCreated.some((r) => r.type === "mason")) {
      dispatch({
        type: "CREATE_REQUEST",
        request: {
          id:                crypto.randomUUID(),
          type:              "mason",
          jobsite:           pour.location,
          dateNeeded:        pour.date,
          notes:             pour.masonRequest.notes ?? `${pour.masonRequest.masonCount ?? "?"} masons needed for pour.`,
          status:            "pending",
          requestedBy:       pour.createdByName,
          requestedByUserId: pour.createdBy,
          requestedCount:    pour.masonRequest.masonCount,
          sourcePourId:      pour.id,
        },
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
    const pour = poursService.rejectPour(id, reason, actorRole, actorId, actorName);
    if (pour) dispatch({ type: "UPSERT_POUR", pour });
  }

  function cancelPour(
    id: string,
    reason: string,
    actorRole: UserRole,
    actorId: string,
    actorName: string,
  ): void {
    const pour = poursService.cancelPour(id, reason, actorRole, actorId, actorName);
    if (pour) dispatch({ type: "UPSERT_POUR", pour });
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

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOps(): OpsContextValue {
  const ctx = useContext(OpsContext);
  if (!ctx) throw new Error("useOps must be used within OpsProvider");
  return ctx;
}
