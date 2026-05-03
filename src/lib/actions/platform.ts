"use server";

import { supabase }              from "@/lib/supabase/server";
import { insertOrg, updateOrg }  from "@/lib/supabase/platform-orgs";
import { assertPlatformAdmin }   from "@/lib/platform-auth";
import type { CreateOrgInput, UpdateOrgInput } from "@/types/platform";

export async function serverCreateOrg(
  input: CreateOrgInput,
): Promise<{ error?: string }> {
  const auth = await assertPlatformAdmin();
  if (auth.error) return auth;

  const orgId = crypto.randomUUID();

  const orgResult = await insertOrg({
    id:             orgId,
    name:           input.name,
    slug:           input.slug,
    status:         input.status,
    enabledModules: input.enabledModules,
  });
  if (orgResult.error) return orgResult;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(input.adminEmail, {
      redirectTo: `${siteUrl}/accept-invite`,
    });
  if (inviteError || !inviteData.user) {
    await supabase.from("organizations").delete().eq("id", orgId);
    return { error: inviteError?.message ?? "Invite failed" };
  }

  const { error: userError } = await supabase.from("org_users").insert({
    org_id:  orgId,
    auth_id: inviteData.user.id,
    email:   input.adminEmail,
    name:    input.adminName,
    role:    "owner",
  });
  if (userError) {
    await supabase.auth.admin.deleteUser(inviteData.user.id);
    await supabase.from("organizations").delete().eq("id", orgId);
    return { error: userError.message };
  }

  // TODO: send a branded welcome email via Resend once template is ready.
  // Supabase invite email is already dispatched above.

  return {};
}

export async function serverUpdateOrg(
  input: UpdateOrgInput,
): Promise<{ error?: string }> {
  const auth = await assertPlatformAdmin();
  if (auth.error) return auth;

  return updateOrg(input);
}
