import { ProjectCommandCenterClient } from "./client";

type Params = Promise<{ projectId: string }>;

export const metadata = { title: "Project — Command Center" };

export default async function ProjectCommandCenterPage({ params }: { params: Params }) {
  const { projectId } = await params;
  return <ProjectCommandCenterClient projectId={projectId} />;
}
