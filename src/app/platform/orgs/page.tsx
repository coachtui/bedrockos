import Link                  from "next/link";
import { fetchPlatformOrgs } from "@/lib/supabase/platform-orgs";
import { ENABLE_MOCK_FALLBACK, warnMockFallback } from "@/lib/config/data-source";
import { MOCK_PLATFORM_ORGS } from "@/lib/mock/platform";
import { PageContainer }     from "@/components/ui/PageContainer";
import { SectionHeader }     from "@/components/ui/SectionHeader";
import { OrgTable }          from "./OrgTable";

export const metadata = { title: "Organizations — BedrockOS Admin" };

export default async function PlatformOrgsPage() {
  const fetched = await fetchPlatformOrgs();
  const orgs = fetched.length > 0
    ? fetched
    : ENABLE_MOCK_FALLBACK
      ? MOCK_PLATFORM_ORGS
      : [];

  if (fetched.length === 0 && ENABLE_MOCK_FALLBACK) {
    warnMockFallback("platform organizations", "Supabase returned no organizations");
  }

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Organizations"
        subtitle={`${orgs.length} ${orgs.length === 1 ? "company" : "companies"} on BedrockOS`}
        action={
          <Link
            href="/platform/orgs/new"
            className="bg-[#2d3561] text-[#a5b4fc] border border-[#3d4a8a] px-3 py-2 rounded-md text-xs font-semibold hover:bg-[#3a4575] transition-colors"
          >
            + Add Company
          </Link>
        }
      />
      <OrgTable orgs={orgs} />
    </PageContainer>
  );
}
