"use client";

import { useState } from "react";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Card } from "@/components/ui/Card";
import { useOrg } from "@/providers/OrgProvider";
import { serverUpdateOwnProfile } from "@/lib/actions/org-users";

const ROLE_LABELS: Record<string, string> = {
  owner:              "Owner",
  admin:              "Admin",
  equipment_director: "Equipment Director",
  operations_manager: "Operations Manager",
  pm:                 "Project Manager",
  project_engineer:   "Project Engineer",
  superintendent:     "Superintendent",
  foreman:            "Foreman",
  mechanic:           "Mechanic",
  viewer:             "Viewer",
};

function ReadOnlyField({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="py-3 border-b border-surface-border last:border-0">
      <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted mb-0.5">{label}</p>
      <p className="text-sm text-content-primary">{value}</p>
      {hint && <p className="text-[11px] text-content-muted mt-0.5">{hint}</p>}
    </div>
  );
}

export default function ProfilePage() {
  const { currentUser, currentOrganization } = useOrg();

  const [name,    setName]    = useState(currentUser.name);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const isDirty = name.trim() !== currentUser.name;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!isDirty) return;
    setSaving(true);
    setError(null);
    const result = await serverUpdateOwnProfile({ name });
    setSaving(false);
    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <PageContainer>
      <SectionHeader title="Profile" subtitle={currentOrganization.name} />

      <div className="max-w-md space-y-4">
        <Card variant="default">
          <form onSubmit={handleSave} className="space-y-1">
            {/* Editable name */}
            <div className="py-3 border-b border-surface-border">
              <label className="text-[11px] font-bold uppercase tracking-widest text-content-muted block mb-1.5">
                Name
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-content-primary text-sm focus:outline-none focus:border-[#7c83e8] transition-colors"
              />
            </div>

            <ReadOnlyField
              label="Email"
              value={currentUser.email}
              hint="Contact support to change your email"
            />
            <ReadOnlyField
              label="Role"
              value={ROLE_LABELS[currentUser.role] ?? currentUser.role}
              hint="Managed by your organization admin"
            />

            {error && <p className="text-red-400 text-xs pt-1">{error}</p>}

            <div className="pt-3">
              <button
                type="submit"
                disabled={!isDirty || saving}
                className="w-full bg-[#2d3561] text-[#a5b4fc] border border-[#3d4a8a] px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-[#3a4575] disabled:opacity-40 transition-colors"
              >
                {saved ? "Saved" : saving ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </PageContainer>
  );
}
