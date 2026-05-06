import type { Metadata } from "next";
import { ProjectCommandCenterClient } from "./client";
import { fetchProjectFiles } from "@/lib/supabase/project-files";

type Params = Promise<{ projectId: string }>;

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId: _ } = await params;
  return { title: "Project — Command Center" };
}

export default async function ProjectCommandCenterPage({ params }: { params: Params }) {
  const { projectId } = await params;
  const files = await fetchProjectFiles(projectId, ORG_ID);
  return <ProjectCommandCenterClient projectId={projectId} orgId={ORG_ID} initialFiles={files} />;
}
