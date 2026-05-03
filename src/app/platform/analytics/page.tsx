import { BarChart2 }     from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const metadata = { title: "Analytics — BedrockOS Admin" };

export default function AnalyticsPage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Analytics"
        subtitle="Module usage, active companies, and platform health."
      />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BarChart2 size={32} className="text-content-muted mb-4" />
        <p className="text-content-primary font-semibold mb-2">Analytics coming soon</p>
        <p className="text-content-muted text-sm max-w-sm">
          Once companies are live, you'll see module adoption rates, active users per org,
          and platform-wide health metrics here.
        </p>
      </div>
    </PageContainer>
  );
}
