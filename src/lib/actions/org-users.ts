"use server";

import { supabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/ssr";
import { fetchOrgUser } from "@/lib/supabase/org-users";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

async function assertAdmin(): Promise<{ error?: string }> {
  const session = await getSessionUser();
  if (!session) return { error: "Unauthorized" };
  const orgUser = await fetchOrgUser(ORG_ID, session.id);
  if (
    !orgUser ||
    (orgUser.role !== "owner" &&
      orgUser.role !== "admin" &&
      orgUser.role !== "equipment_director" &&
      orgUser.role !== "operations_manager")
  ) {
    return { error: "Forbidden: admin-level role required" };
  }
  return {};
}

export async function serverInviteUser(input: {
  email: string;
  name:  string;
  role:  string;
}): Promise<{ error?: string }> {
  const authCheck = await assertAdmin();
  if (authCheck.error) return authCheck;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: `${siteUrl}/accept-invite`,
  });
  if (error || !data.user) {
    return { error: error?.message ?? "Invite failed" };
  }
  const { error: insertError } = await supabase.from("org_users").insert({
    org_id:  ORG_ID,
    auth_id: data.user.id,
    email:   input.email,
    name:    input.name,
    role:    input.role,
  });
  if (insertError) return { error: insertError.message };
  return {};
}

export async function serverResendInvite(email: string): Promise<{ error?: string }> {
  const authCheck = await assertAdmin();
  if (authCheck.error) return authCheck;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // Use password recovery flow — inviteUserByEmail rejects existing users
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/accept-invite`,
  });
  if (error) return { error: error.message };
  return {};
}

export async function serverUpdateUserRole(
  orgUserId: string,
  role: string,
): Promise<{ error?: string }> {
  const authCheck = await assertAdmin();
  if (authCheck.error) return authCheck;
  const { error } = await supabase.from("org_users").update({ role }).eq("id", orgUserId).eq("org_id", ORG_ID);
  if (error) return { error: error.message };
  return {};
}

export async function serverUpdateUser(
  orgUserId: string,
  patch: { name?: string; role?: string },
): Promise<{ error?: string }> {
  const authCheck = await assertAdmin();
  if (authCheck.error) return authCheck;
  const update: Record<string, string> = {};
  if (typeof patch.name === "string") update.name = patch.name.trim();
  if (typeof patch.role === "string") update.role = patch.role;
  if (Object.keys(update).length === 0) return {};
  const { error } = await supabase
    .from("org_users")
    .update(update)
    .eq("id", orgUserId)
    .eq("org_id", ORG_ID);
  if (error) return { error: error.message };
  return {};
}

export async function serverRemoveUser(orgUserId: string): Promise<{ error?: string }> {
  const authCheck = await assertAdmin();
  if (authCheck.error) return authCheck;
  const { error } = await supabase.from("org_users").delete().eq("id", orgUserId).eq("org_id", ORG_ID);
  if (error) return { error: error.message };
  return {};
}
