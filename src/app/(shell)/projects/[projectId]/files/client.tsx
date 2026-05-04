"use client";

import React, { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Image, Sheet, FileType, Download } from "lucide-react";
import Link from "next/link";
import { PageContainer } from "@/components/ui/PageContainer";
import { Card } from "@/components/ui/Card";
import { useOrg } from "@/providers/OrgProvider";
import { uploadProjectFile, getSignedFileUrl } from "@/lib/actions/project-files";
import type { ProjectFile } from "@/types/domain";

interface ProjectFilesClientProps {
  projectId:    string;
  orgId:        string;
  initialFiles: ProjectFile[];
}

type SortOrder = "date" | "alpha";

function fileIcon(mimeType: string, size = 14) {
  if (mimeType.startsWith("image/"))       return <Image    size={size} className="text-gold shrink-0" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv"))
                                           return <Sheet    size={size} className="text-gold shrink-0" />;
  if (mimeType.includes("pdf"))            return <FileText size={size} className="text-gold shrink-0" />;
  return                                          <FileType size={size} className="text-gold shrink-0" />;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024)              return `${bytes} B`;
  if (bytes < 1024 * 1024)       return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function sortFiles(files: ProjectFile[], order: SortOrder): ProjectFile[] {
  if (order === "alpha") {
    return [...files].sort((a, b) => a.fileName.localeCompare(b.fileName));
  }
  return [...files].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
  );
}

export function ProjectFilesClient({ projectId, orgId, initialFiles }: ProjectFilesClientProps) {
  const { currentUser }   = useOrg();
  const router            = useRouter();
  const inputRef          = useRef<HTMLInputElement>(null);
  const [sort, setSort]   = useState<SortOrder>("date");
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const sorted = sortFiles(initialFiles, sort);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (["dwg", "dxf", "dwf"].includes(ext)) {
      setError("CAD files (DWG, DXF, DWF) are not supported.");
      e.target.value = "";
      return;
    }

    const uploadedBy = currentUser?.name ?? "Unknown";
    const formData   = new FormData();
    formData.append("file",       file);
    formData.append("projectId",  projectId);
    formData.append("orgId",      orgId);
    formData.append("uploadedBy", uploadedBy);

    startTransition(async () => {
      try {
        const result = await uploadProjectFile(formData);
        if (result?.error) {
          setError(result.error);
        } else {
          router.refresh();
        }
      } finally {
        e.target.value = "";
      }
    });
  }

  async function handleOpenFile(f: ProjectFile) {
    setOpening(f.id);
    const result = await getSignedFileUrl(f.storagePath);
    setOpening(null);
    if (result.error || !result.url) {
      setError("Could not open file.");
      return;
    }
    window.open(result.url, "_blank");
  }

  async function handleDownloadFile(e: React.MouseEvent, f: ProjectFile) {
    e.stopPropagation();
    setOpening(f.id);
    const result = await getSignedFileUrl(f.storagePath);
    setOpening(null);
    if (result.error || !result.url) {
      setError("Could not download file.");
      return;
    }
    const a = document.createElement("a");
    a.href     = result.url;
    a.download = f.fileName;
    a.click();
  }

  return (
    <PageContainer>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}`}
            className="text-content-muted hover:text-content-primary transition-colors"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-semibold text-content-primary">Project Files</h1>
            <p className="text-xs text-content-muted mt-0.5">
              {sorted.length} file{sorted.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={isPending}
          className="text-sm font-semibold bg-gold text-black px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {isPending ? "Uploading…" : "+ Upload File"}
        </button>
      </div>

      <input ref={inputRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.xls,.csv,.doc,.docx,.txt" onChange={handleFileChange} />

      {error && (
        <p className="text-sm text-red-400 mb-4">{error}</p>
      )}

      <Card variant="default" className="!p-0">
        {/* Sort controls */}
        <div className="px-5 py-3 flex gap-2 border-b border-surface-border">
          <button
            onClick={() => setSort("date")}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
              sort === "date"
                ? "bg-gold/15 text-gold border border-gold/30"
                : "text-content-muted hover:text-content-primary border border-transparent"
            }`}
          >
            Date ↓
          </button>
          <button
            onClick={() => setSort("alpha")}
            className={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${
              sort === "alpha"
                ? "bg-gold/15 text-gold border border-gold/30"
                : "text-content-muted hover:text-content-primary border border-transparent"
            }`}
          >
            A → Z
          </button>
        </div>

        {/* File list */}
        {sorted.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-content-muted mb-1">No files uploaded yet</p>
            <p className="text-xs text-content-muted opacity-60">
              Upload plans, specs, and documents for everyone on this project to access.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-surface-border">
            {sorted.map((f) => (
              <div
                key={f.id}
                role="button"
                tabIndex={0}
                onClick={() => handleOpenFile(f)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleOpenFile(f); }}
                aria-disabled={opening === f.id}
                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-surface-hover transition-colors cursor-pointer group ${opening === f.id ? "opacity-50 pointer-events-none" : ""}`}
              >
                {fileIcon(f.mimeType)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content-primary truncate">{f.fileName}</p>
                  <p className="text-xs text-content-muted mt-0.5">
                    {formatFileSize(f.fileSize)} · Uploaded {formatDate(f.uploadedAt)} by {f.uploadedBy}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDownloadFile(e, f)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-surface-active text-content-muted"
                  aria-label={`Download ${f.fileName}`}
                >
                  <Download size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
