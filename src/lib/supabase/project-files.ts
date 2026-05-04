import "server-only";
import { supabase } from "./server";
import type { ProjectFile } from "@/types/domain";

export async function fetchProjectFiles(
  projectId: string,
  orgId: string,
): Promise<ProjectFile[]> {
  try {
    const { data, error } = await supabase
      .from("project_files")
      .select("id, org_id, project_id, storage_path, file_name, file_size, mime_type, uploaded_by, uploaded_at")
      .eq("org_id", orgId)
      .eq("project_id", projectId)
      .order("uploaded_at", { ascending: false });

    if (error || !data) return [];

    return data.map((row) => ({
      id:          row.id,
      orgId:       row.org_id,
      projectId:   row.project_id,
      storagePath: row.storage_path,
      fileName:    row.file_name,
      fileSize:    row.file_size,
      mimeType:    row.mime_type,
      uploadedBy:  row.uploaded_by,
      uploadedAt:  row.uploaded_at,
    }));
  } catch {
    return [];
  }
}
