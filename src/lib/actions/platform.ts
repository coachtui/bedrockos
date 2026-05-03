"use server";

import { supabase } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/ssr";
import { insertOrg, updateOrg } from "@/lib/supabase/platform-orgs";
import type { CreateOrgInput, UpdateOrgInput } from "@/types/platform";

async function assertPlatformAdmin(): Promise<{ error?: string }> {
  const user = await getSessionUser();
  const allowed = (process.env.PLATFORM_ADMIN_EMAILS ?? "tui@tuialailima.com")
    .split(",")
    .map(s => s.trim());
  if (!user || !allowed.includes(user.email ?? "")) {
    return { error: "Forbidden" };
  }
  return {};
}

export async function serverCreateOrg(
  input: CreateOrgInput,
): Promise<{ error?: string }> {
  const auth = await assertPlatformAdmin();
  if (auth.error) return auth;

  const orgId = `org_${input.slug}_${Date.now()}`;

  const orgResult = await insertOrg({
    id: orgId,
    name: input.name,
    slug: input.slug,
    status: input.status,
    enabledModules: input.enabledModules,
  });
  if (orgResult.error) return orgResult;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(input.adminEmail, {
      redirectTo: `${siteUrl}/accept-invite`,
    });
  if (inviteError || !inviteData.user) {
    return { error: inviteError?.message ?? "Invite failed" };
  }

  const { error: userError } = await supabase.from("org_users").insert({
    org_id: orgId,
    auth_id: inviteData.user.id,
    email: input.adminEmail,
    name: input.adminName,
    role: "owner",
  });
  if (userError) return { error: userError.message };

  // TODO: trigger invite email once email service is connected

  return {};
}

export async function serverUpdateOrg(
  input: UpdateOrgInput,
): Promise<{ error?: string }> {
  const auth = await assertPlatformAdmin();
  if (auth.error) return auth;

  return updateOrg(input);
}
