import type { Metadata } from "next";
import { ProjectCommandCenterClient } from "./client";
import { fetchProjectFiles } from "@/lib/supabase/project-files";
import { getEnvOrgId } from "@/lib/config/org";

type Params = Promise<{ projectId: string }>;

const ORG_ID = getEnvOrgId();

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId: _ } = await params;
  return { title: "Project — Command Center" };
}

export default async function ProjectCommandCenterPage({ params }: { params: Params }) {
  const { projectId } = await params;
  const files = await fetchProjectFiles(projectId, ORG_ID);
  return <ProjectCommandCenterClient projectId={projectId} orgId={ORG_ID} initialFiles={files} />;
}
