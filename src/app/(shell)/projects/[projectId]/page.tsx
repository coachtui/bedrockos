import type { Metadata } from "next";
import { ProjectCommandCenterClient } from "./client";

type Params = Promise<{ projectId: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { projectId: _ } = await params;
  return { title: "Project — Command Center" };
}

export default async function ProjectCommandCenterPage({ params }: { params: Params }) {
  const { projectId } = await params;
  return <ProjectCommandCenterClient projectId={projectId} />;
}
