import type { Metadata } from "next";
import { ProjectSettingsClient } from "./client";

type Params = Promise<{ projectId: string }>;

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Project Settings" };
}

export default async function ProjectSettingsPage({ params }: { params: Params }) {
  const { projectId } = await params;
  return <ProjectSettingsClient projectId={projectId} />;
}
