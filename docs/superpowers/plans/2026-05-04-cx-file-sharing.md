# CX File Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a project-scoped file sharing feature — a sidebar card on the Command Center and a full `/projects/[id]/files` page — backed by Supabase Storage and a `project_files` metadata table.

**Architecture:** Files are uploaded from the browser via a Next.js server action that uses the service-role Supabase client to write to the `project-files` storage bucket, then inserts a row into `project_files`. Files are listed server-side in `page.tsx` and passed as `initialFiles` props to client components. Clicking a file generates a short-lived signed URL via a server action and opens it in a new tab.

**Tech Stack:** Next.js 15 App Router (server components + server actions), Supabase Storage, Supabase Postgres, TypeScript, Tailwind CSS, Lucide React icons.

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| CREATE | `supabase/migrations/20260504_project_files.sql` | DB table + index |
| MODIFY | `src/types/domain.ts` | Add `ProjectFile` type |
| CREATE | `src/lib/supabase/project-files.ts` | `fetchProjectFiles` — server-side list query |
| CREATE | `src/lib/actions/project-files.ts` | `uploadProjectFile`, `getSignedFileUrl`, `deleteProjectFile` server actions |
| CREATE | `src/components/shell/ProjectFilesCard.tsx` | Sidebar card: top-3 files, upload shortcut, link to full page |
| MODIFY | `src/app/(shell)/projects/[projectId]/page.tsx` | Fetch files server-side, pass as `initialFiles` |
| MODIFY | `src/app/(shell)/projects/[projectId]/client.tsx` | Accept + pass `initialFiles`, render `ProjectFilesCard` |
| CREATE | `src/app/(shell)/projects/[projectId]/files/page.tsx` | Server component: fetch files, render client |
| CREATE | `src/app/(shell)/projects/[projectId]/files/client.tsx` | Full file browser: sort toggle, upload, open/download |

---

## Task 1: DB Migration

**Files:**
- Create: `supabase/migrations/20260504_project_files.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- supabase/migrations/20260504_project_files.sql
create table if not exists project_files (
  id           uuid        primary key default gen_random_uuid(),
  org_id       text        not null,
  project_id   text        not null,
  storage_path text        not null,
  file_name    text        not null,
  file_size    bigint      not null,
  mime_type    text        not null,
  uploaded_by  text        not null,
  uploaded_at  timestamptz not null default now()
);

create index if not exists project_files_project_idx
  on project_files (org_id, project_id, uploaded_at desc);
```

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the `mcp__plugin_supabase_supabase__apply_migration` tool with the SQL above and migration name `create_project_files_table`.

- [ ] **Step 3: Create the storage bucket via Supabase MCP**

Use `mcp__plugin_supabase_supabase__execute_sql` to create the bucket:

```sql
insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do nothing;
```

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260504_project_files.sql
git commit -m "feat(supabase): add project_files table and storage bucket"
```

---

## Task 2: TypeScript Type

**Files:**
- Modify: `src/types/domain.ts` (append at end of file)

- [ ] **Step 1: Add `ProjectFile` type to domain.ts**

Append to the bottom of `src/types/domain.ts`:

```ts
export interface ProjectFile {
  id:          string;
  orgId:       string;
  projectId:   string;
  storagePath: string;
  fileName:    string;
  fileSize:    number;    // bytes
  mimeType:    string;
  uploadedBy:  string;   // display name
  uploadedAt:  string;   // ISO 8601 string
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd /Users/tui/bedrockos && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output (no errors).

- [ ] **Step 3: Commit**

```bash
git add src/types/domain.ts
git commit -m "feat(types): add ProjectFile type"
```

---

## Task 3: Fetch Layer

**Files:**
- Create: `src/lib/supabase/project-files.ts`

- [ ] **Step 1: Create the fetch module**

```ts
// src/lib/supabase/project-files.ts
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
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd /Users/tui/bedrockos && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/project-files.ts
git commit -m "feat(supabase): add fetchProjectFiles fetch layer"
```

---

## Task 4: Server Actions

**Files:**
- Create: `src/lib/actions/project-files.ts`

- [ ] **Step 1: Create the server actions file**

```ts
// src/lib/actions/project-files.ts
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
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd /Users/tui/bedrockos && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/project-files.ts
git commit -m "feat(actions): add project-files server actions"
```

---

## Task 5: ProjectFilesCard + Command Center Wiring

**Files:**
- Create: `src/components/shell/ProjectFilesCard.tsx`
- Modify: `src/app/(shell)/projects/[projectId]/page.tsx`
- Modify: `src/app/(shell)/projects/[projectId]/client.tsx`

- [ ] **Step 1: Create `ProjectFilesCard`**

```tsx
// src/components/shell/ProjectFilesCard.tsx
"use client";

import React, { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, FileText, Image, Sheet, FileType } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { useOrg } from "@/providers/OrgProvider";
import { uploadProjectFile } from "@/lib/actions/project-files";
import { getSignedFileUrl } from "@/lib/actions/project-files";
import type { ProjectFile } from "@/types/domain";

interface ProjectFilesCardProps {
  projectId: string;
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

export function ProjectFilesCard({ projectId, files }: ProjectFilesCardProps) {
  const { currentUser } = useOrg();
  const router          = useRouter();
  const inputRef        = useRef<HTMLInputElement>(null);
  const [error, setError]         = useState<string | null>(null);
  const [opening, setOpening]     = useState<string | null>(null); // fileId being opened
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

    const orgId      = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";
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
```

- [ ] **Step 2: Update `page.tsx` to fetch files server-side**

Current `page.tsx`:
```tsx
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
```

Replace with:
```tsx
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
  return <ProjectCommandCenterClient projectId={projectId} initialFiles={files} />;
}
```

- [ ] **Step 3: Update `client.tsx` — add import, prop, and render `ProjectFilesCard`**

At the top of `src/app/(shell)/projects/[projectId]/client.tsx`, add to the imports:

```tsx
import { ProjectFilesCard } from "@/components/shell/ProjectFilesCard";
import type { ProjectFile } from "@/types/domain";
```

Find the `ProjectCommandCenterClientProps` interface (near the top of the file, around where `projectId` is destructured) and add `initialFiles`:

```tsx
interface ProjectCommandCenterClientProps {
  projectId:    string;
  initialFiles: ProjectFile[];
}
```

Update the function signature to destructure it:
```tsx
export function ProjectCommandCenterClient({ projectId, initialFiles }: ProjectCommandCenterClientProps) {
```

In the JSX, locate the right column block (currently around line 547–550):
```tsx
{/* Right column */}
<div className="lg:col-span-2 space-y-4">

  {/* CX Summary */}
  <ProjectCXCard projectId={projectId} />
```

Add `ProjectFilesCard` directly below `ProjectCXCard`:
```tsx
{/* CX Summary */}
<ProjectCXCard projectId={projectId} />

{/* Project Files */}
<ProjectFilesCard projectId={projectId} files={initialFiles} />
```

- [ ] **Step 4: Verify no TypeScript errors**

```bash
cd /Users/tui/bedrockos && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 5: Smoke test — card visible on Command Center**

```bash
cd /Users/tui/bedrockos && npm run dev
```

Navigate to `http://localhost:3000/projects/<any-projectId>`. Confirm:
- "PROJECT FILES" card appears in the right sidebar below the CX card
- Empty state ("No files yet") shows if no files exist
- "Open →" link is present

- [ ] **Step 6: Commit**

```bash
git add src/components/shell/ProjectFilesCard.tsx \
        src/app/(shell)/projects/[projectId]/page.tsx \
        src/app/(shell)/projects/[projectId]/client.tsx
git commit -m "feat(shell): add ProjectFilesCard to Command Center sidebar"
```

---

## Task 6: Files Page

**Files:**
- Create: `src/app/(shell)/projects/[projectId]/files/page.tsx`
- Create: `src/app/(shell)/projects/[projectId]/files/client.tsx`

- [ ] **Step 1: Create the server page component**

```tsx
// src/app/(shell)/projects/[projectId]/files/page.tsx
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
```

- [ ] **Step 2: Create the client component**

```tsx
// src/app/(shell)/projects/[projectId]/files/client.tsx
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
      const result = await uploadProjectFile(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.refresh();
      }
      e.target.value = "";
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
              {initialFiles.length} file{initialFiles.length !== 1 ? "s" : ""}
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

      <input ref={inputRef} type="file" className="hidden" onChange={handleFileChange} />

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
              <button
                key={f.id}
                onClick={() => handleOpenFile(f)}
                disabled={opening === f.id}
                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-surface-hover transition-colors text-left disabled:opacity-50 group"
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
              </button>
            ))}
          </div>
        )}
      </Card>
    </PageContainer>
  );
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
cd /Users/tui/bedrockos && npx tsc --noEmit 2>&1 | head -20
```

Expected: no output.

- [ ] **Step 4: Smoke test — files page**

With `npm run dev` running, navigate to `http://localhost:3000/projects/<projectId>/files`. Confirm:
- Page loads with "Project Files" heading and file count
- "+ Upload File" button is present
- "Date ↓" and "A → Z" sort buttons are present
- Empty state shows if no files exist
- Back arrow navigates to the Command Center

- [ ] **Step 5: Smoke test — upload flow**

On the files page:
1. Click "+ Upload File" — native file picker opens
2. Select a PDF — page refreshes and the file appears in the list
3. Try uploading a `.dwg` file — inline error "CAD files are not supported" appears, no upload occurs

On the Command Center (`/projects/<id>`):
4. The sidebar card now shows the uploaded file
5. "+ Upload" on the card triggers a file picker and works the same way

- [ ] **Step 6: Smoke test — open a file**

Click a file row on the files page — a new browser tab opens with the file. Click the download icon (↓) — the file downloads.

- [ ] **Step 7: Commit**

```bash
git add src/app/(shell)/projects/[projectId]/files/
git commit -m "feat(files): add project files page with upload and sort"
```

---

## Done

All six tasks complete. The feature is fully functional:
- `ProjectFilesCard` in the Command Center sidebar shows top-3 recent files and an upload shortcut
- `/projects/[id]/files` provides a full file browser with Date/A–Z sort, upload, open, and download
- Files are stored in the private `project-files` Supabase Storage bucket
- Metadata lives in `project_files` table for rich display (uploader name, size, date)
- CAD files blocked at the client before any upload attempt
