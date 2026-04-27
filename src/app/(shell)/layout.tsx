import { fetchOrgWorkers } from "@/lib/supabase/workers";
import { ShellClientRoot } from "./shell-client";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export default async function ShellRootLayout({ children }: { children: React.ReactNode }) {
  const workers = await fetchOrgWorkers(ORG_ID);
  return (
    <ShellClientRoot initialWorkers={workers}>
      {children}
    </ShellClientRoot>
  );
}
