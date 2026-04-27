import { fetchOrgWorkers } from "@/lib/supabase/workers";
import { MOCK_ORG_CONFIG } from "@/lib/config/org";
import { ShellClientRoot } from "./shell-client";

export default async function ShellRootLayout({ children }: { children: React.ReactNode }) {
  const workers = await fetchOrgWorkers(MOCK_ORG_CONFIG.org.id);
  return (
    <ShellClientRoot initialWorkers={workers}>
      {children}
    </ShellClientRoot>
  );
}
