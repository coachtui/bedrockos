"use server";

import { supabase } from "@/lib/supabase/server";

const BLOCKED_EXTENSIONS = new Set(["dwg", "dxf", "dwf"]);

function blockedExtension(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return BLOCKED_EXTENSIONS.has(ext);
}

export async function uploadProjectFile(
  formData: FormData,
): Promise<{ error?: string }> {
  const file       = formData.get("file")       as File   | null;
  const projectId  = formData.get("projectId")  as string | null;
  const orgId      = formData.get("orgId")      as string | null;
  const uploadedBy = formData.get("uploadedBy") as string | null;

  if (!file || !projectId || !orgId || !uploadedBy) {
    return { error: "Missing required fields." };
  }
  if (blockedExtension(file.name)) {
    return { error: "CAD files (DWG, DXF, DWF) are not supported." };
  }

  const uuid        = crypto.randomUUID();
  const storagePath = `${orgId}/${projectId}/${uuid}-${file.name}`;
  const bytes       = await file.arrayBuffer();

  const { error: storageError } = await supabase.storage
    .from("project-files")
    .upload(storagePath, bytes, { contentType: file.type });

  if (storageError) return { error: storageError.message };

  const { error: dbError } = await supabase.from("project_files").insert({
    org_id:       orgId,
    project_id:   projectId,
    storage_path: storagePath,
    file_name:    file.name,
    file_size:    file.size,
    mime_type:    file.type,
    uploaded_by:  uploadedBy,
  });

  if (dbError) return { error: dbError.message };
  return {};
}

export async function getSignedFileUrl(
  storagePath: string,
): Promise<{ url?: string; error?: string }> {
  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUrl(storagePath, 60);

  if (error || !data) return { error: "Could not generate file link." };
  return { url: data.signedUrl };
}

export async function deleteProjectFile(
  fileId: string,
  storagePath: string,
): Promise<{ error?: string }> {
  const { error: storageError } = await supabase.storage
    .from("project-files")
    .remove([storagePath]);

  if (storageError) return { error: storageError.message };

  const { error: dbError } = await supabase
    .from("project_files")
    .delete()
    .eq("id", fileId);

  if (dbError) return { error: dbError.message };
  return {};
}
