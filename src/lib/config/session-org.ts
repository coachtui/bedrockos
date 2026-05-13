import "server-only";
import { getSessionUser } from "@/lib/supabase/ssr";
import { fetchOrgUserByAuthId } from "@/lib/supabase/org-users";
import { getEnvOrgId } from "@/lib/config/org";

/**
 * Resolves the active org_id from the signed-in user's session.
 * Falls back to the env var when there is no session or no org_users row.
 * Use this in server pages instead of getEnvOrgId() directly.
 */
export async function getSessionOrgId(): Promise<string> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return getEnvOrgId();
  const orgUser = await fetchOrgUserByAuthId(sessionUser.id);
  return orgUser?.org_id ?? getEnvOrgId();
}
