"use server";

import { supabase } from "@/lib/supabase/server";

const BLOCKED_EXTENSIONS = new Set(["dwg", "dxf", "dwf"]);

function blockedExtension(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return BLOCKED_EXTENSIONS.has(ext);
}

// Step 1: get a signed upload URL — file goes directly from browser to Supabase Storage,
// never through Next.js, avoiding all middleware body size limits.
export async function createUploadUrl(
  orgId: string,
  projectId: string,
  fileName: string,
): Promise<{ uploadUrl?: string; storagePath?: string; error?: string }> {
  if (blockedExtension(fileName)) {
    return { error: "CAD files (DWG, DXF, DWF) are not supported." };
  }

  const uuid        = crypto.randomUUID();
  const storagePath = `${orgId}/${projectId}/${uuid}-${fileName}`;

  const { data, error } = await supabase.storage
    .from("project-files")
    .createSignedUploadUrl(storagePath);

  if (error || !data) return { error: error?.message ?? "Could not create upload URL." };
  return { uploadUrl: data.signedUrl, storagePath };
}

// Step 2: save metadata to DB after the browser has finished the direct upload.
export async function saveFileMetadata(
  orgId: string,
  projectId: string,
  storagePath: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  uploadedBy: string,
): Promise<{ error?: string }> {
  const { error } = await supabase.from("project_files").insert({
    org_id:       orgId,
    project_id:   projectId,
    storage_path: storagePath,
    file_name:    fileName,
    file_size:    fileSize,
    mime_type:    mimeType,
    uploaded_by:  uploadedBy,
  });

  if (error) return { error: error.message };
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
  orgId: string,
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
    .eq("id", fileId)
    .eq("org_id", orgId);

  if (dbError) return { error: dbError.message };
  return {};
}

export async function renameProjectFile(
  orgId: string,
  fileId: string,
  newName: string,
): Promise<{ error?: string }> {
  const trimmed = newName.trim();
  if (!trimmed) return { error: "File name cannot be empty." };

  const { error } = await supabase
    .from("project_files")
    .update({ file_name: trimmed })
    .eq("id", fileId)
    .eq("org_id", orgId);

  if (error) return { error: error.message };
  return {};
}
