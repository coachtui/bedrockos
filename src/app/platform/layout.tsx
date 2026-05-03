import { redirect }            from "next/navigation";
import { PLATFORM_ADMIN_EMAILS } from "@/lib/platform-auth";
import { getSessionUser }      from "@/lib/supabase/ssr";
import { PlatformShell }       from "./PlatformShell";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Phase 1-2: no auth — bypass in dev, enforce in production
  const isDev = process.env.NODE_ENV !== "production";
  const user  = isDev ? null : await getSessionUser();

  if (!isDev && (!user || !PLATFORM_ADMIN_EMAILS.includes(user?.email ?? ""))) {
    redirect("/login");
  }

  const userName =
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email ??
    "Tui Alailima";

  return <PlatformShell userName={userName}>{children}</PlatformShell>;
}
