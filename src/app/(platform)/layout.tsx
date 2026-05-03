import { redirect }            from "next/navigation";
import { PLATFORM_ADMIN_EMAILS } from "@/lib/platform-auth";
import { getSessionUser }      from "@/lib/supabase/ssr";
import { PlatformShell }       from "./PlatformShell";

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || !PLATFORM_ADMIN_EMAILS.includes(user.email ?? "")) {
    redirect("/login");
  }

  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    "Admin";

  return <PlatformShell userName={userName}>{children}</PlatformShell>;
}
