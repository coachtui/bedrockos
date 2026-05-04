"use client";

import React, { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Image, Sheet, FileType } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useOrg } from "@/providers/OrgProvider";
import { uploadProjectFile, getSignedFileUrl } from "@/lib/actions/project-files";
import type { ProjectFile } from "@/types/domain";

interface ProjectFilesCardProps {
  projectId: string;
  orgId:     string;
  files: ProjectFile[];
}

function fileIcon(mimeType: string) {
  if (mimeType.startsWith("image/"))       return <Image    size={13} className="text-gold shrink-0" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("csv"))
                                           return <Sheet    size={13} className="text-gold shrink-0" />;
  if (mimeType.includes("pdf"))            return <FileText size={13} className="text-gold shrink-0" />;
  return                                          <FileType size={13} className="text-gold shrink-0" />;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ProjectFilesCard({ projectId, orgId, files }: ProjectFilesCardProps) {
  const { currentUser } = useOrg();
  const router          = useRouter();
  const inputRef        = useRef<HTMLInputElement>(null);
  const [error, setError]         = useState<string | null>(null);
  const [opening, setOpening]     = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const recent = files.slice(0, 3);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (["dwg", "dxf", "dwf"].includes(ext)) {
      setError("CAD files are not supported.");
      e.target.value = "";
      return;
    }

    const uploadedBy = currentUser?.name ?? "Unknown";

    const formData = new FormData();
    formData.append("file",       file);
    formData.append("projectId",  projectId);
    formData.append("orgId",      orgId);
    formData.append("uploadedBy", uploadedBy);

    startTransition(async () => {
      const result = await uploadProjectFile(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
      e.target.value = "";
    });
  }

  async function handleOpenFile(file: ProjectFile) {
    setOpening(file.id);
    const result = await getSignedFileUrl(file.storagePath);
    setOpening(null);
    if (result.error || !result.url) {
      setError("Could not open file.");
      return;
    }
    window.open(result.url, "_blank");
  }

  return (
    <Card variant="default" className="!p-0">
      <div className="p-5 pb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-content-muted">
          Project Files
        </p>
        <Link
          href={`/projects/${projectId}/files`}
          className="text-xs text-content-muted hover:text-gold transition-colors flex items-center gap-1"
        >
          Open <ChevronRight size={11} />
        </Link>
      </div>

      <div className="px-5 pb-5 space-y-2">
        {recent.length === 0 ? (
          <div className="border border-dashed border-surface-border rounded-md py-4 text-center">
            <p className="text-xs text-content-muted">No files yet</p>
          </div>
        ) : (
          recent.map((f) => (
            <button
              key={f.id}
              onClick={() => handleOpenFile(f)}
              disabled={opening === f.id}
              className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-surface-hover transition-colors text-left disabled:opacity-50"
            >
              {fileIcon(f.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-content-primary truncate">{f.fileName}</p>
                <p className="text-[11px] text-content-muted">
                  {formatDate(f.uploadedAt)} · {f.uploadedBy}
                </p>
              </div>
            </button>
          ))
        )}

        {error && (
          <p className="text-xs text-red-400 mt-1">{error}</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-surface-border">
          <span className="text-[11px] text-content-muted">
            {files.length} file{files.length !== 1 ? "s" : ""}
          </span>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
            className="text-xs text-gold hover:opacity-80 transition-opacity disabled:opacity-40"
          >
            {isPending ? "Uploading…" : "+ Upload"}
          </button>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </Card>
  );
}
