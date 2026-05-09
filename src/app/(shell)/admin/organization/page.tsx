"use client";

import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { useOrg } from "@/providers/OrgProvider";

const ROLE_LABELS: Record<string, string> = {
  owner:              "Owner",
  admin:              "Admin",
  pm:                 "Project Manager",
  project_engineer:   "Project Engineer",
  superintendent:     "Superintendent",
  foreman:            "Foreman",
  mechanic:           "Mechanic",
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 border-b border-surface-border last:border-0">
      <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-0.5">{label}</p>
      <p className="text-sm text-content-primary">{value}</p>
    </div>
  );
}

export default function ProfilePage() {
  const { currentUser, currentOrganization } = useOrg();

  return (
    <PageContainer>
      <SectionHeader title="Profile" subtitle={currentOrganization.name} />

      <div className="max-w-md">
        <Card variant="default">
          <Field label="Name"  value={currentUser.name} />
          <Field label="Email" value={currentUser.email} />
          <Field label="Role"  value={ROLE_LABELS[currentUser.role] ?? currentUser.role} />
        </Card>
      </div>
    </PageContainer>
  );
}
