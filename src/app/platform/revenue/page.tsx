import { DollarSign }    from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";

export const metadata = { title: "Revenue — BedrockOS Admin" };

export default function RevenuePage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Revenue"
        subtitle="MRR, churn, and billing overview."
      />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <DollarSign size={32} className="text-content-muted mb-4" />
        <p className="text-content-primary font-semibold mb-2">Revenue tracking coming soon</p>
        <p className="text-content-muted text-sm max-w-sm">
          Revenue metrics will appear here once billing is connected. This is where you'll
          track MRR, trial conversions, and churn.
        </p>
      </div>
    </PageContainer>
  );
}
