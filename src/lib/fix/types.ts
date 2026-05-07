export type VehicleType =
  | "car" | "truck" | "motorcycle" | "boat" | "generator"
  | "atv" | "pwc" | "rv" | "heavy_equipment" | "other";

export type SessionMode = "consumer" | "operator" | "mechanic";

export interface HeavyEquipmentContext {
  hours_of_operation?: number;
  last_service_hours?: number;
  environment?: "dusty" | "muddy" | "marine" | "urban";
  storage_duration?: number;
  recent_work_type?: string;
}

export interface Vehicle {
  year?: number;
  make?: string;
  model?: string;
  engine?: string;
  vehicle_type?: VehicleType;
}

export interface RankedCause {
  cause: string;
  confidence: number;
  reasoning: string;
}

export interface SuggestedPart {
  name: string;
  notes: string;
}

export interface DiagnosticResult {
  ranked_causes: RankedCause[];
  next_checks: string[];
  diy_difficulty: "easy" | "moderate" | "hard" | "seek_mechanic" | null;
  suggested_parts: SuggestedPart[];
  escalation_guidance: string | null;
  confidence_level: number;
  post_diagnosis: string[];
}

export interface OBDResult {
  code: string;
  description: string;
  severity: "low" | "moderate" | "high" | "critical";
  likely_causes: string[];
  next_steps: string[];
  diy_difficulty: "easy" | "moderate" | "hard" | "seek_mechanic";
}

export interface MessageResponse {
  session_id: string;
  message: string;
  msg_type: "question" | "result" | "error";
  turn: number;
  result: DiagnosticResult | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  msg_type?: "question" | "result" | "chat" | "image" | "error";
  result?: DiagnosticResult;
  obd_result?: OBDResult;
}

export interface SessionSummary {
  session_id: string;
  created_at: string;
  status: "active" | "awaiting_followup" | "complete" | "abandoned";
  symptom_category: string | null;
  vehicle_year: number | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_type: VehicleType;
  excerpt: string;
  top_cause: string | null;
}

export interface SessionState {
  session_id: string;
  status: string;
  turn_count: number;
  symptom_category: string | null;
  vehicle: Vehicle;
  messages: { role: string; content: string; type: string }[];
  result: DiagnosticResult | null;
}
