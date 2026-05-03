// src/lib/platform-auth.ts
import { getSessionUser } from "@/lib/supabase/ssr";

export const PLATFORM_ADMIN_EMAILS: string[] = (
  process.env.PLATFORM_ADMIN_EMAILS ?? "tui@tuialailima.com"
)
  .split(",")
  .map(s => s.trim());

export async function assertPlatformAdmin(): Promise<{ error?: string }> {
  const user = await getSessionUser();
  if (!user || !PLATFORM_ADMIN_EMAILS.includes(user.email ?? "")) {
    return { error: "Forbidden" };
  }
  return {};
}
