import { fetchWorkerCountsByProject } from "@/lib/supabase/workers";
import { getEnvOrgId } from "@/lib/config/org";
import { ProjectsClient } from "./client";

const ORG_ID = getEnvOrgId();

export const metadata = { title: "Projects" };

export default async function ProjectsPage() {
  const workerCountsByProject = await fetchWorkerCountsByProject(ORG_ID);
  return <ProjectsClient workerCountsByProject={workerCountsByProject} />;
}
