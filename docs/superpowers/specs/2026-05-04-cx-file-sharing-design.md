# CX File Sharing — Design Spec

**Date:** 2026-05-04  
**Status:** Approved  

---

## Overview

A project-scoped file sharing feature for the AIGA construction platform. All members of a project can upload and view shared files (plans, specs, submittals, photos, spreadsheets). The feature lives as a compact sidebar card on the Project Command Center and a dedicated full-page file browser.

---

## Layout

**Option chosen:** Sidebar card + dedicated page (Option C from brainstorm).

- `ProjectFilesCard` — compact card in the right sidebar of the Command Center (`/projects/[id]`), alongside `ProjectCXCard`. Shows the 3 most recent files and a total count. Clicking "Open" navigates to the files page. Clicking a file opens it.
- `/projects/[id]/files` — full file browser page with upload, sort controls, and the complete file list.

---

## Storage

**Supabase Storage bucket:** `project-files`  
**Path convention:** `{orgId}/{projectId}/{uuid}-{originalFilename}`

Using a UUID prefix ensures uniqueness even when two users upload files with the same name.

---

## Database

**Table: `project_files`**

```sql
id            uuid PRIMARY KEY DEFAULT gen_random_uuid()
org_id        text NOT NULL
project_id    text NOT NULL
storage_path  text NOT NULL        -- bucket path
file_name     text NOT NULL        -- original display name
file_size     bigint NOT NULL      -- bytes
mime_type     text NOT NULL
uploaded_by   text NOT NULL        -- display name of uploader
uploaded_at   timestamptz NOT NULL DEFAULT now()
```

Index on `(org_id, project_id, uploaded_at DESC)` for efficient listing.

---

## Server Actions

All actions in `src/lib/actions/project-files.ts`, scoped to `org_id + project_id`.

| Action | Signature | Behaviour |
|---|---|---|
| `uploadProjectFile` | `(orgId, projectId, storagePath, fileName, fileSize, mimeType, uploadedBy)` | Inserts a row into `project_files`. Called after successful storage upload. |
| `listProjectFiles` | `(orgId, projectId)` | Returns all rows ordered by `uploaded_at DESC`. |
| `deleteProjectFile` | `(orgId, projectId, fileId, storagePath)` | Deletes the DB row and removes the file from storage. |

---

## Fetch Layer

`src/lib/supabase/project-files.ts`

```ts
fetchProjectFiles(projectId: string, orgId: string): Promise<ProjectFile[]>
```

Returns rows from `project_files` ordered by `uploaded_at DESC`. Used server-side in the files page and card.

---

## Types

`src/types/domain.ts` additions:

```ts
export type ProjectFile = {
  id: string;
  orgId: string;
  projectId: string;
  storagePath: string;
  fileName: string;
  fileSize: number;     // bytes
  mimeType: string;
  uploadedBy: string;   // display name
  uploadedAt: string;   // ISO string
};
```

---

## Components

### `ProjectFilesCard` (`src/components/shell/ProjectFilesCard.tsx`)

- Header: "PROJECT FILES" label + "Open →" link to `/projects/[id]/files`
- Body: list of 3 most recent files — icon, file name (truncated), date + uploader
- Footer: total file count + "+ Upload" shortcut (opens upload picker inline)
- Empty state: "No files yet" placeholder
- Each file row: click opens a signed Supabase Storage URL in a new tab

### Files Page (`src/app/(shell)/projects/[id]/files/`)

- `page.tsx` — fetches `ProjectFile[]` server-side, renders `ProjectFilesClient`
- `client.tsx` — client component with sort toggle state and upload handler

**Client features:**
- "+ Upload File" button — opens native file picker, uploads to Supabase Storage, calls `uploadProjectFile` action, refreshes list
- Sort toggle: "Date ↓" (default, by `uploaded_at`) ↔ "A → Z" (alphabetical by `file_name`). Client-side re-sort, no extra fetch.
- File rows: icon, name, size, upload date, uploader. Click → signed URL opens in new tab. ↓ icon → download.
- Empty state: "No files uploaded yet. Upload plans, specs, and documents for everyone on this project to access."

---

## File Type Handling

**Allowed:** All common types — PDF, images (jpg, png, gif, webp), spreadsheets (xlsx, csv), Word docs (docx), text files.  
**Blocked:** DWG, DXF, and other CAD formats — validated client-side before upload by checking file extension and MIME type.

Blocked MIME types / extensions: `application/acad`, `image/vnd.dwg`, `image/vnd.dxf`, `.dwg`, `.dxf`, `.dwf`.

---

## Data Flow

### Upload
1. User selects file via native picker
2. Client validates file type — blocks CAD, shows inline error if rejected
3. Client uploads directly to Supabase Storage → receives `storage_path`
4. Client calls `uploadProjectFile` server action with metadata
5. Server action inserts row into `project_files`
6. File list refreshes via `router.refresh()`

### List
- `fetchProjectFiles` called server-side at page load
- Card shows top 3; page shows all
- Sort toggle re-sorts the in-memory list client-side

### Open / Download
- On file row click: client calls Supabase Storage `createSignedUrl` (60s TTL) → opens in new tab
- Download button: same signed URL with `download` attribute

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Blocked file type | Inline error before any network call |
| Storage upload fails | Toast error; DB insert does not fire |
| DB insert fails | Toast error; file remains in storage (acceptable orphan; can be cleaned up later) |
| Signed URL fails | Toast error; file row stays in list |
| Empty list | Empty state UI in both card and page |

---

## Integration Points

- `ProjectFilesCard` added to `src/app/(shell)/projects/[projectId]/client.tsx` right column, below `ProjectCXCard`
- New route: `src/app/(shell)/projects/[projectId]/files/page.tsx` + `client.tsx`
- New Supabase migration: `create_project_files_table`
- Supabase Storage bucket `project-files` must be created as a **private bucket** — all file access via signed URLs

---

## Out of Scope

- Row Level Security (can be added in a follow-up)
- File versioning / replace existing file
- Folder/category organisation
- In-app PDF preview (opens in new tab instead)
- Delete UI (backend action exists; UI can be added later)
