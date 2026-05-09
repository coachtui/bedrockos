import { redirect } from "next/navigation";
import { fetchOrgUsers, fetchOrgUser } from "@/lib/supabase/org-users";
import { getSessionUser } from "@/lib/supabase/ssr";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { UsersAdminPanel } from "@/components/admin/UsersAdminPanel";
import { getEnvOrgId } from "@/lib/config/org";

const ORG_ID = getEnvOrgId();

export const metadata = { title: "Users & Roles" };

export default async function UsersPage() {
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    const orgUser = await fetchOrgUser(ORG_ID, sessionUser.id);
    if (!orgUser || (orgUser.role !== "owner" && orgUser.role !== "admin" && orgUser.role !== "equipment_director" && orgUser.role !== "operations_manager")) {
      redirect("/dashboard");
    }
  }

  const users = await fetchOrgUsers(ORG_ID);

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Users & Roles"
        subtitle={`${users.length} member${users.length !== 1 ? "s" : ""} in your organization`}
      />
      <UsersAdminPanel users={users} />
    </PageContainer>
  );
}
