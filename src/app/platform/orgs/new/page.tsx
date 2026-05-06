import { PageContainer }  from "@/components/ui/PageContainer";
import { SectionHeader }  from "@/components/ui/SectionHeader";
import { CreateOrgForm }  from "./CreateOrgForm";

export const metadata = { title: "Add Company — BedrockOS Admin" };

export default function NewOrgPage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Add Company"
        subtitle="Creates the org, enables modules, and queues the first admin invite."
      />
      <CreateOrgForm />
    </PageContainer>
  );
}
