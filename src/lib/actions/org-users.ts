"use server";

import { supabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/ssr";
import { fetchOrgUserByAuthId, type OrgUserRow } from "@/lib/supabase/org-users";

const PRODUCTION_SITE_URL = "https://bedrockos.aigaai.com";

function inviteRedirectUrl(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_SITE_URL;
  return `${siteUrl}/accept-invite`;
}

async function assertAdmin(): Promise<{ orgUser?: OrgUserRow; error?: string }> {
  const session = await getSessionUser();
  if (!session) return { error: "Unauthorized" };
  const orgUser = await fetchOrgUserByAuthId(session.id);
  if (
    !orgUser ||
    (orgUser.role !== "owner" &&
      orgUser.role !== "admin" &&
      orgUser.role !== "equipment_director" &&
      orgUser.role !== "operations_manager")
  ) {
    return { error: "Forbidden: admin-level role required" };
  }
  return { orgUser };
}

export async function serverInviteUser(input: {
  email: string;
  name:  string;
  role:  string;
}): Promise<{ error?: string }> {
  const { orgUser, error: authError } = await assertAdmin();
  if (authError || !orgUser) return { error: authError ?? "Unauthorized" };

  const { data, error } = await supabase.auth.admin.inviteUserByEmail(input.email, {
    redirectTo: inviteRedirectUrl(),
  });
  if (error || !data.user) {
    return { error: error?.message ?? "Invite failed" };
  }
  const { error: insertError } = await supabase.from("org_users").insert({
    org_id:  orgUser.org_id,
    auth_id: data.user.id,
    email:   input.email,
    name:    input.name,
    role:    input.role,
  });
  if (insertError) return { error: insertError.message };
  return {};
}

export async function serverResendInvite(email: string): Promise<{ error?: string }> {
  const { error: authError } = await assertAdmin();
  if (authError) return { error: authError };
  // Use password recovery flow — inviteUserByEmail rejects existing users
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: inviteRedirectUrl(),
  });
  if (error) return { error: error.message };
  return {};
}

export async function serverUpdateUserRole(
  orgUserId: string,
  role: string,
): Promise<{ error?: string }> {
  const { orgUser, error: authError } = await assertAdmin();
  if (authError || !orgUser) return { error: authError ?? "Unauthorized" };
  const { error } = await supabase.from("org_users").update({ role }).eq("id", orgUserId).eq("org_id", orgUser.org_id);
  if (error) return { error: error.message };
  return {};
}

export async function serverUpdateUser(
  orgUserId: string,
  patch: { name?: string; role?: string },
): Promise<{ error?: string }> {
  const { orgUser, error: authError } = await assertAdmin();
  if (authError || !orgUser) return { error: authError ?? "Unauthorized" };
  const update: Record<string, string> = {};
  if (typeof patch.name === "string") update.name = patch.name.trim();
  if (typeof patch.role === "string") update.role = patch.role;
  if (Object.keys(update).length === 0) return {};
  const { error } = await supabase
    .from("org_users")
    .update(update)
    .eq("id", orgUserId)
    .eq("org_id", orgUser.org_id);
  if (error) return { error: error.message };
  return {};
}

export async function serverRemoveUser(orgUserId: string): Promise<{ error?: string }> {
  const { orgUser, error: authError } = await assertAdmin();
  if (authError || !orgUser) return { error: authError ?? "Unauthorized" };

  const { data: row, error: fetchError } = await supabase
    .from("org_users")
    .select("auth_id")
    .eq("id", orgUserId)
    .eq("org_id", orgUser.org_id)
    .maybeSingle();
  if (fetchError) return { error: fetchError.message };

  const { error: deleteError } = await supabase
    .from("org_users")
    .delete()
    .eq("id", orgUserId)
    .eq("org_id", orgUser.org_id);
  if (deleteError) return { error: deleteError.message };

  if (row?.auth_id) {
    const { error: authError } = await supabase.auth.admin.deleteUser(row.auth_id);
    if (authError) return { error: `Org row removed but auth user delete failed: ${authError.message}` };
  }

  return {};
}
