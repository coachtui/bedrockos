import type {
  HeavyEquipmentContext, MessageResponse, OBDResult,
  SessionMode, SessionState, SessionSummary, Vehicle,
} from "./types";

const BASE = "/api/fix";

async function fetchJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Fix API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export function createSession(
  description: string,
  vehicle?: Vehicle,
  options?: { session_mode?: SessionMode; heavy_context?: HeavyEquipmentContext },
): Promise<MessageResponse> {
  return fetchJSON<MessageResponse>("/sessions", {
    method: "POST",
    body: JSON.stringify({
      description,
      vehicle,
      session_mode: options?.session_mode ?? "mechanic",
      heavy_context: options?.heavy_context,
    }),
  });
}

export function sendMessage(sessionId: string, content: string): Promise<MessageResponse> {
  return fetchJSON<MessageResponse>(`/sessions/${sessionId}/message`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export function getSession(sessionId: string): Promise<SessionState> {
  return fetchJSON<SessionState>(`/sessions/${sessionId}`);
}

export function listSessions(): Promise<SessionSummary[]> {
  return fetchJSON<SessionSummary[]>("/sessions");
}

export function completeSession(sessionId: string): Promise<{ session_id: string; status: string }> {
  return fetchJSON(`/sessions/${sessionId}/complete`, { method: "PATCH" });
}

export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${BASE}/sessions/${sessionId}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`Fix API ${res.status}`);
}

export function lookupOBDCode(code: string, vehicle?: Vehicle): Promise<OBDResult> {
  return fetchJSON<OBDResult>("/obd/lookup", {
    method: "POST",
    body: JSON.stringify({ code, vehicle }),
  });
}

export async function uploadImage(
  sessionId: string,
  file: File,
  confidenceModifier: number = 0.8,
): Promise<MessageResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("confidence_modifier", String(confidenceModifier));
  const res = await fetch(`${BASE}/sessions/${sessionId}/image`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Fix API ${res.status}: ${body || res.statusText}`);
  }
  return res.json() as Promise<MessageResponse>;
}
