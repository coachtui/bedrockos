"use server";

import { supabase } from "@/lib/supabase/server";
import { throwSupabaseWriteFailure } from "@/lib/supabase/errors";
import type { ActivityEvent } from "@/types/domain";
import { getEnvOrgId } from "@/lib/config/org";

const ORG_ID = getEnvOrgId();

export async function serverInsertActivity(event: ActivityEvent): Promise<void> {
  const { error } = await supabase.from("activity").insert({
    id:          event.id,
    org_id:      ORG_ID,
    actor_name:  event.actor_name,
    action:      event.action,
    entity_type: event.entity_type,
    entity_id:   event.entity_id ?? null,
    entity_name: event.entity_name,
    project_id:  event.project_id,
    module:      event.module,
    timestamp:   event.timestamp,
    target_type: event.target_type ?? null,
    target_id:   event.target_id ?? null,
  });
  if (error) throwSupabaseWriteFailure(`serverInsertActivity(${event.id})`, error);
}
