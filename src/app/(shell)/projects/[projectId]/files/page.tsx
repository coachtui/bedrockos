import type { Metadata } from "next";
import { fetchProjectFiles } from "@/lib/supabase/project-files";
import { ProjectFilesClient } from "./client";

type Params = Promise<{ projectId: string }>;

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId: _ } = await params;
  return { title: "Project Files" };
}

export default async function ProjectFilesPage({ params }: { params: Params }) {
  const { projectId } = await params;
  const files = await fetchProjectFiles(projectId, ORG_ID);
  return <ProjectFilesClient projectId={projectId} orgId={ORG_ID} initialFiles={files} />;
}
