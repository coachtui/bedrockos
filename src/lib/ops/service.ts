import { MOCK_REQUESTS, MOCK_POUR_EVENTS } from "./mock-data";
import type {
  Request,          RequestStatus,
  LegacyPourEvent,
} from "./types";

// ── Internal mutable state ────────────────────────────────────────────────────
// Copies from mock — never mutate the imported arrays directly.

let requests:   Request[]         = [...MOCK_REQUESTS];
let pourEvents: LegacyPourEvent[] = [...MOCK_POUR_EVENTS];

// ── Transition rules ──────────────────────────────────────────────────────────

export const REQUEST_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  pending:  ["approved"],
  approved: ["assigned"],
  assigned: [],
  open:     ["closed"],
  closed:   [],
};

// ── Requests ──────────────────────────────────────────────────────────────────

export function getRequests(): Request[] {
  return requests;
}

export function createRequest(data: Omit<Request, "id">): Request {
  const req: Request = { ...data, id: crypto.randomUUID() };
  requests = [...requests, req];
  return req;
}

/**
 * Transition a request status.
 *
 * When transitioning to "assigned", an optional CRU worker can be provided.
 * The worker data is stamped onto the request. Work order creation is handled
 * by MX — the caller supplies the resulting linkedMxWorkOrderId.
 */
export function updateRequestStatus(
  id:                  string,
  status:              RequestStatus,
  worker?:             { id: string; label: string; role?: string },
  linkedMxWorkOrderId?: string,
): Request | null {
  const req = requests.find((r) => r.id === id);
  if (!req) return null;
  if (!REQUEST_TRANSITIONS[req.status].includes(status)) return null;

  const updated: Request = {
    ...req,
    status,
    ...(worker && status === "assigned"
      ? {
          assignedToId:    worker.id,
          assignedToLabel: worker.label,
          assignedToRole:  worker.role,
        }
      : {}),
    ...(linkedMxWorkOrderId ? { linkedMxWorkOrderId } : {}),
  };
  requests = requests.map((r) => (r.id === id ? updated : r));
  return updated;
}

// ── Pour Schedule (legacy API route — UI uses poursService instead) ───────────

export function getPourSchedule(): LegacyPourEvent[] {
  return pourEvents;
}

export function createPourEvent(data: Omit<LegacyPourEvent, "id">): LegacyPourEvent {
  const event: LegacyPourEvent = { ...data, id: crypto.randomUUID() };
  pourEvents = [...pourEvents, event];
  return event;
}
