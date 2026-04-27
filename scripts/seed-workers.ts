import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const CRU_URL  = process.env.CRU_SUPABASE_URL;
const CRU_KEY  = process.env.CRU_OPS_INTERNAL_API_KEY;
const AIGA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const AIGA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const orgId    = process.env.NEXT_PUBLIC_CRU_ORG_ID;

if (!CRU_URL || !CRU_KEY || !AIGA_URL || !AIGA_KEY || !orgId) {
  console.error("Missing required env vars. Check .env.local.");
  process.exit(1);
}

const aiga = createClient(AIGA_URL, AIGA_KEY);

interface DbWorker {
  id:                  string;
  name:                string;
  role:                string;
  availability_status: string;
  job_site_id:         string | null;
  job_site:            { id: string; name: string } | null;
}

type WorkerRole = "mechanic" | "driver" | "mason" | "carpenter" | "foreman" | "superintendent" | "operator" | "laborer";

const KNOWN_ROLES = new Set<WorkerRole>([
  "mechanic", "driver", "mason", "carpenter",
  "foreman", "superintendent", "operator", "laborer",
]);

function toWorkerRole(r: string): WorkerRole {
  return KNOWN_ROLES.has(r as WorkerRole) ? (r as WorkerRole) : "laborer";
}

async function fetchCruWorkers(): Promise<DbWorker[]> {
  const res = await fetch(`${CRU_URL}/functions/v1/ops-api`, {
    method:  "POST",
    headers: {
      "Content-Type":       "application/json",
      "x-internal-api-key": CRU_KEY,
    },
    body: JSON.stringify({ action: "getWorkersForOrg", orgId }),
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(`CRU fetch failed: ${json?.error ?? res.status}`);
  }
  if (json.success !== true || !Array.isArray(json.data)) {
    throw new Error(`Invalid CRU response: ${JSON.stringify(json)}`);
  }
  return json.data as DbWorker[];
}

async function main() {
  console.log(`Fetching workers from CRU for org: ${orgId}`);
  const cruWorkers = await fetchCruWorkers();
  console.log(`  Found ${cruWorkers.length} workers in CRU`);

  const rows = cruWorkers.map((w) => ({
    id:         w.id,
    org_id:     orgId,
    name:       w.name,
    role:       toWorkerRole(w.role),
    project_id: w.job_site_id ?? null,
    site_name:  w.job_site?.name ?? null,
    available:  w.availability_status === "available",
    skills:     [],
  }));

  const { error, count } = await aiga
    .from("workers")
    .upsert(rows, { onConflict: "id", count: "exact" });

  if (error) {
    console.error("Supabase upsert failed:", error.message);
    process.exit(1);
  }

  console.log(`  Upserted ${count ?? rows.length} workers into AIGACP Supabase`);
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
