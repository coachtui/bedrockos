// src/app/(platform)/orgs/[orgId]/page.tsx
import Link                   from "next/link";
import { notFound }           from "next/navigation";
import { fetchPlatformOrg }   from "@/lib/supabase/platform-orgs";
import { fetchOrgUsers }      from "@/lib/supabase/org-users";
import { ENABLE_MOCK_FALLBACK, warnMockFallback } from "@/lib/config/data-source";
import { MOCK_PLATFORM_ORGS } from "@/lib/mock/platform";
import { PageContainer }      from "@/components/ui/PageContainer";
import { SectionHeader }      from "@/components/ui/SectionHeader";
import { EditOrgForm }        from "./EditOrgForm";

type Params = Promise<{ orgId: string }>;

export default async function OrgDetailPage({ params }: { params: Params }) {
  const { orgId } = await params;

  const fetchedOrg = await fetchPlatformOrg(orgId);
  const mockOrg = ENABLE_MOCK_FALLBACK
    ? MOCK_PLATFORM_ORGS.find(o => o.id === orgId) ?? null
    : null;
  if (!fetchedOrg && mockOrg) {
    warnMockFallback(`platform organization ${orgId}`, "Supabase returned no organization");
  }
  const org = fetchedOrg ?? mockOrg;

  if (!org) notFound();

  const users = await fetchOrgUsers(org.id);

  return (
    <PageContainer>
      <SectionHeader
        title={org.name}
        subtitle={`${org.id} · created ${org.createdAt}`}
        action={
          <Link
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7c83e8] border border-[#2d3561] px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#1a1f35] transition-colors"
          >
            View as tenant ↗
          </Link>
        }
      />
      <EditOrgForm org={org} users={users} />
    </PageContainer>
  );
}
