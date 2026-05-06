# BedrockOS Platform Admin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the BedrockOS platform admin shell at `/platform` — a separate operator surface for provisioning customer orgs, enabling modules, and inviting first admin users.

**Architecture:** A new `(platform)` Next.js route group with its own layout and sidebar. No `OrgProvider` — this shell has no tenant context. Reads/writes go directly to Supabase via the service-role client, gated by a hardcoded platform admin email list. The tenant `(shell)` route group is completely untouched.

**Tech Stack:** Next.js 16 App Router, Supabase (service-role admin client), TypeScript, Tailwind CSS with existing design tokens (`bg-surface-raised`, `border-surface-border`, `text-content-primary`, `text-content-muted`).

> **Note on testing:** No test framework is installed in this project. Every task ends with a manual browser verification step instead of automated tests.

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `src/types/platform.ts` | `PlatformOrg`, `PlatformOrgStatus`, `CreateOrgInput`, `UpdateOrgInput` types |
| `src/lib/mock/platform.ts` | 3-org mock dataset used as fallback during dev |
| `src/lib/supabase/platform-orgs.ts` | Supabase queries: fetch list, fetch one, insert, update |
| `src/lib/actions/platform.ts` | Server Actions: `serverCreateOrg`, `serverUpdateOrg` |
| `src/app/(platform)/layout.tsx` | Server component: auth gate + renders `PlatformShell` |
| `src/app/(platform)/PlatformShell.tsx` | Client component: sidebar nav + main area |
| `src/app/(platform)/page.tsx` | Redirect `/platform` → `/platform/orgs` |
| `src/app/(platform)/orgs/page.tsx` | Server component: fetches orgs, renders `OrgTable` |
| `src/app/(platform)/orgs/OrgTable.tsx` | Client component: org list table |
| `src/app/(platform)/orgs/new/page.tsx` | Server component: renders `CreateOrgForm` |
| `src/app/(platform)/orgs/new/CreateOrgForm.tsx` | Client form: create org + invite first admin |
| `src/app/(platform)/orgs/[orgId]/page.tsx` | Server component: fetches org + users, renders `EditOrgForm` |
| `src/app/(platform)/orgs/[orgId]/EditOrgForm.tsx` | Client form: edit org, read-only user list, deactivate |
| `src/app/(platform)/analytics/page.tsx` | Stub empty state |
| `src/app/(platform)/revenue/page.tsx` | Stub empty state |

### Supabase migration (run manually in Supabase SQL editor)
```sql
create table if not exists organizations (
  id              text        primary key,
  name            text        not null,
  slug            text        not null unique,
  status          text        not null default 'trial'
                              check (status in ('active', 'trial', 'internal', 'inactive')),
  enabled_modules text[]      not null default '{}',
  created_at      timestamptz not null default now()
);
```

---

## Task 1: Types and mock data

**Files:**
- Create: `src/types/platform.ts`
- Create: `src/lib/mock/platform.ts`

- [ ] **Step 1: Create platform types**

```ts
// src/types/platform.ts
import type { ModuleId } from "./org";

export type PlatformOrgStatus = "active" | "trial" | "internal" | "inactive";

export interface PlatformOrg {
  id:             string;
  name:           string;
  slug:           string;
  status:         PlatformOrgStatus;
  enabledModules: ModuleId[];
  userCount:      number;
  createdAt:      string; // "YYYY-MM"
}

export interface CreateOrgInput {
  name:           string;
  slug:           string;
  status:         PlatformOrgStatus;
  enabledModules: ModuleId[];
  adminName:      string;
  adminEmail:     string;
}

export interface UpdateOrgInput {
  id:             string;
  name:           string;
  status:         PlatformOrgStatus;
  enabledModules: ModuleId[];
}
```

- [ ] **Step 2: Create mock org data**

```ts
// src/lib/mock/platform.ts
import type { PlatformOrg } from "@/types/platform";

export const mockPlatformOrgs: PlatformOrg[] = [
  {
    id:             "org_acme",
    name:           "Acme Construction",
    slug:           "acme",
    status:         "active",
    enabledModules: ["cru", "fix", "mx"],
    userCount:      8,
    createdAt:      "2026-01",
  },
  {
    id:             "org_pacific",
    name:           "Pacific Grading",
    slug:           "pacific",
    status:         "trial",
    enabledModules: ["fix", "ops"],
    userCount:      3,
    createdAt:      "2026-04",
  },
  {
    id:             "org_demo",
    name:           "Demo Org",
    slug:           "demo",
    status:         "internal",
    enabledModules: ["cru", "fix", "mx", "ops"],
    userCount:      1,
    createdAt:      "2025-11",
  },
];
```

- [ ] **Step 3: Verify TypeScript**

Run: `npx tsc --noEmit`  
Expected: no errors related to the new files.

- [ ] **Step 4: Commit**

```bash
git add src/types/platform.ts src/lib/mock/platform.ts
git commit -m "feat(platform): add PlatformOrg types and mock data"
```

---

## Task 2: Supabase queries

**Files:**
- Create: `src/lib/supabase/platform-orgs.ts`

Before this task, run the SQL migration from the File Map section in the Supabase SQL editor.

- [ ] **Step 1: Create the Supabase query file**

```ts
// src/lib/supabase/platform-orgs.ts
import "server-only";
import { supabase } from "./server";
import type { PlatformOrg, PlatformOrgStatus, UpdateOrgInput } from "@/types/platform";
import type { ModuleId } from "@/types/org";

function toPlatformOrg(row: Record<string, unknown>): PlatformOrg {
  return {
    id:             String(row.id   ?? ""),
    name:           String(row.name ?? ""),
    slug:           String(row.slug ?? ""),
    status:         String(row.status ?? "trial") as PlatformOrgStatus,
    enabledModules: Array.isArray(row.enabled_modules)
      ? (row.enabled_modules as string[]) as ModuleId[]
      : [],
    userCount:      0, // TODO: join org_users count when needed
    createdAt:      String(row.created_at ?? "").slice(0, 7),
  };
}

export async function fetchPlatformOrgs(): Promise<PlatformOrg[]> {
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug, status, enabled_modules, created_at")
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return (data as Record<string, unknown>[]).map(toPlatformOrg);
  } catch {
    return [];
  }
}

export async function fetchPlatformOrg(orgId: string): Promise<PlatformOrg | null> {
  try {
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name, slug, status, enabled_modules, created_at")
      .eq("id", orgId)
      .single();
    if (error || !data) return null;
    return toPlatformOrg(data as Record<string, unknown>);
  } catch {
    return null;
  }
}

export async function insertOrg(input: {
  id:             string;
  name:           string;
  slug:           string;
  status:         PlatformOrgStatus;
  enabledModules: ModuleId[];
}): Promise<{ error?: string }> {
  const { error } = await supabase.from("organizations").insert({
    id:              input.id,
    name:            input.name,
    slug:            input.slug,
    status:          input.status,
    enabled_modules: input.enabledModules,
  });
  if (error) return { error: error.message };
  return {};
}

export async function updateOrg(input: UpdateOrgInput): Promise<{ error?: string }> {
  const { error } = await supabase
    .from("organizations")
    .update({
      name:            input.name,
      status:          input.status,
      enabled_modules: input.enabledModules,
    })
    .eq("id", input.id);
  if (error) return { error: error.message };
  return {};
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`  
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/supabase/platform-orgs.ts
git commit -m "feat(platform): add Supabase queries for organizations table"
```

---

## Task 3: Server Actions

**Files:**
- Create: `src/lib/actions/platform.ts`

- [ ] **Step 1: Create the Server Actions file**

```ts
// src/lib/actions/platform.ts
"use server";

import { supabase }       from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/ssr";
import { insertOrg, updateOrg } from "@/lib/supabase/platform-orgs";
import type { CreateOrgInput, UpdateOrgInput } from "@/types/platform";

async function assertPlatformAdmin(): Promise<{ error?: string }> {
  const user    = await getSessionUser();
  const allowed = (process.env.PLATFORM_ADMIN_EMAILS ?? "tui@tuialailima.com")
    .split(",")
    .map(s => s.trim());
  if (!user || !allowed.includes(user.email ?? "")) {
    return { error: "Forbidden" };
  }
  return {};
}

export async function serverCreateOrg(
  input: CreateOrgInput,
): Promise<{ error?: string }> {
  const auth = await assertPlatformAdmin();
  if (auth.error) return auth;

  const orgId = `org_${input.slug}_${Date.now()}`;

  const orgResult = await insertOrg({
    id:             orgId,
    name:           input.name,
    slug:           input.slug,
    status:         input.status,
    enabledModules: input.enabledModules,
  });
  if (orgResult.error) return orgResult;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const { data: inviteData, error: inviteError } =
    await supabase.auth.admin.inviteUserByEmail(input.adminEmail, {
      redirectTo: `${siteUrl}/accept-invite`,
    });
  if (inviteError || !inviteData.user) {
    return { error: inviteError?.message ?? "Invite failed" };
  }

  const { error: userError } = await supabase.from("org_users").insert({
    org_id:  orgId,
    auth_id: inviteData.user.id,
    email:   input.adminEmail,
    name:    input.adminName,
    role:    "owner",
  });
  if (userError) return { error: userError.message };

  // TODO: trigger invite email once email service is connected

  return {};
}

export async function serverUpdateOrg(
  input: UpdateOrgInput,
): Promise<{ error?: string }> {
  const auth = await assertPlatformAdmin();
  if (auth.error) return auth;

  return updateOrg(input);
}
```

- [ ] **Step 2: Verify TypeScript**

Run: `npx tsc --noEmit`  
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/actions/platform.ts
git commit -m "feat(platform): add serverCreateOrg and serverUpdateOrg actions"
```

---

## Task 4: Platform shell layout

**Files:**
- Create: `src/app/(platform)/layout.tsx`
- Create: `src/app/(platform)/PlatformShell.tsx`
- Create: `src/app/(platform)/page.tsx`

- [ ] **Step 1: Create the server layout with auth gate**

```tsx
// src/app/(platform)/layout.tsx
import { redirect }       from "next/navigation";
import { getSessionUser } from "@/lib/supabase/ssr";
import { PlatformShell }  from "./PlatformShell";

const PLATFORM_ADMIN_EMAILS = (
  process.env.PLATFORM_ADMIN_EMAILS ?? "tui@tuialailima.com"
)
  .split(",")
  .map(s => s.trim());

export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user || !PLATFORM_ADMIN_EMAILS.includes(user.email ?? "")) {
    redirect("/login");
  }

  const userName =
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    "Admin";

  return <PlatformShell userName={userName}>{children}</PlatformShell>;
}
```

- [ ] **Step 2: Create the client sidebar shell**

```tsx
// src/app/(platform)/PlatformShell.tsx
"use client";

import Link        from "next/link";
import { usePathname } from "next/navigation";
import { Building2, BarChart2, DollarSign } from "lucide-react";

const NAV = [
  { href: "/platform/orgs",      label: "Organizations", icon: Building2, available: true  },
  { href: "/platform/analytics", label: "Analytics",     icon: BarChart2,  available: false },
  { href: "/platform/revenue",   label: "Revenue",       icon: DollarSign, available: false },
];

export function PlatformShell({
  children,
  userName,
}: {
  children:  React.ReactNode;
  userName:  string;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-surface-raised border-r border-surface-border shrink-0 fixed top-0 bottom-0 left-0 z-30">
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-surface-border">
          <div className="w-6 h-6 rounded bg-[#1a1f35] border border-[#2d3561] flex items-center justify-center shrink-0">
            <span className="text-[#7c83e8] text-[10px] font-black">B</span>
          </div>
          <div>
            <p className="text-content-primary text-[12px] font-bold leading-none">BedrockOS</p>
            <p className="text-content-muted text-[9px] uppercase tracking-widest leading-tight mt-0.5">
              Platform Admin
            </p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3">
          <p className="text-content-muted text-[9px] font-bold uppercase tracking-widest px-2 mb-3">
            Manage
          </p>
          <div className="space-y-0.5">
            {NAV.map(({ href, label, icon: Icon, available }) => {
              const active = pathname.startsWith(href);
              if (!available) {
                return (
                  <div
                    key={href}
                    className="flex items-center gap-2.5 px-2 py-2 rounded-md opacity-40 cursor-default"
                  >
                    <Icon size={14} className="text-content-muted shrink-0" />
                    <span className="text-content-muted text-[12px]">{label}</span>
                    <span className="ml-auto text-[9px] text-content-muted border border-surface-border px-1.5 py-0.5 rounded">
                      Soon
                    </span>
                  </div>
                );
              }
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2.5 px-2 py-2 rounded-md transition-colors ${
                    active
                      ? "bg-[#1a1f35] text-[#a5b4fc]"
                      : "text-content-muted hover:text-content-primary hover:bg-white/5"
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  <span className="text-[12px] font-medium">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-border">
          <p className="text-content-primary text-[11px] font-semibold truncate">{userName}</p>
          <p className="text-content-muted text-[9px]">Founder · AIGA LLC</p>
        </div>
      </aside>

      {/* Main — offset by sidebar width */}
      <main className="flex-1 md:pl-56 overflow-auto">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: Create root redirect**

```tsx
// src/app/(platform)/page.tsx
import { redirect } from "next/navigation";

export default function PlatformRootPage() {
  redirect("/platform/orgs");
}
```

- [ ] **Step 4: Start dev server and verify**

Run: `npm run dev`

Open `http://localhost:3000/platform` in your browser.

Expected:
- Redirects to `/platform/orgs` (which 404s — that's fine, that page doesn't exist yet)
- If not logged in, redirects to `/login` ✓
- If logged in as the platform admin email, the sidebar renders with "BedrockOS / Platform Admin" branding ✓
- Nav shows Organizations (clickable), Analytics and Revenue (greyed out with "Soon") ✓

- [ ] **Step 5: Commit**

```bash
git add src/app/\(platform\)/layout.tsx src/app/\(platform\)/PlatformShell.tsx src/app/\(platform\)/page.tsx
git commit -m "feat(platform): add platform shell layout and sidebar"
```

---

## Task 5: Org list page

**Files:**
- Create: `src/app/(platform)/orgs/page.tsx`
- Create: `src/app/(platform)/orgs/OrgTable.tsx`

- [ ] **Step 1: Create the org list server page**

```tsx
// src/app/(platform)/orgs/page.tsx
import Link                  from "next/link";
import { fetchPlatformOrgs } from "@/lib/supabase/platform-orgs";
import { mockPlatformOrgs }  from "@/lib/mock/platform";
import { PageContainer }     from "@/components/ui/PageContainer";
import { SectionHeader }     from "@/components/ui/SectionHeader";
import { OrgTable }          from "./OrgTable";

export const metadata = { title: "Organizations — BedrockOS Admin" };

export default async function PlatformOrgsPage() {
  const fetched = await fetchPlatformOrgs();
  const orgs    = fetched.length > 0 ? fetched : mockPlatformOrgs;

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Organizations"
        subtitle={`${orgs.length} ${orgs.length === 1 ? "company" : "companies"} on BedrockOS`}
        action={
          <Link
            href="/platform/orgs/new"
            className="bg-[#2d3561] text-[#a5b4fc] border border-[#3d4a8a] px-3 py-2 rounded-md text-xs font-semibold hover:bg-[#3a4575] transition-colors"
          >
            + Add Company
          </Link>
        }
      />
      <OrgTable orgs={orgs} />
    </PageContainer>
  );
}
```

- [ ] **Step 2: Create the org table client component**

```tsx
// src/app/(platform)/orgs/OrgTable.tsx
"use client";

import Link from "next/link";
import type { PlatformOrg } from "@/types/platform";

const STATUS_STYLES: Record<string, string> = {
  active:   "bg-emerald-950 text-emerald-400",
  trial:    "bg-amber-950 text-amber-400",
  internal: "text-content-muted border border-surface-border",
  inactive: "text-content-muted border border-surface-border",
};

export function OrgTable({ orgs }: { orgs: PlatformOrg[] }) {
  if (orgs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-content-primary font-semibold mb-1">No companies yet</p>
        <p className="text-content-muted text-sm">Add your first company to get started.</p>
      </div>
    );
  }

  return (
    <div className="border border-surface-border rounded-lg overflow-hidden mt-2">
      <table className="w-full">
        <thead>
          <tr className="border-b border-surface-border bg-surface-raised">
            {["Company", "Modules", "Status", "Added", ""].map(h => (
              <th
                key={h}
                className="text-left text-[9px] font-bold uppercase tracking-widest text-content-muted px-4 py-3"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orgs.map(org => (
            <tr
              key={org.id}
              className="border-b border-surface-border last:border-0 hover:bg-white/5 transition-colors"
            >
              <td className="px-4 py-4">
                <p className="text-content-primary text-sm font-semibold">{org.name}</p>
                <p className="text-content-muted text-[10px] font-mono">{org.slug}</p>
              </td>
              <td className="px-4 py-4">
                <div className="flex gap-1 flex-wrap">
                  {org.enabledModules.map(m => (
                    <span
                      key={m}
                      className="bg-[#1a1f35] text-[#7c83e8] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </td>
              <td className="px-4 py-4">
                <span
                  className={`text-[10px] font-semibold px-2 py-1 rounded capitalize ${STATUS_STYLES[org.status] ?? STATUS_STYLES.inactive}`}
                >
                  {org.status}
                </span>
              </td>
              <td className="px-4 py-4 text-content-muted text-[11px]">{org.createdAt}</td>
              <td className="px-4 py-4 text-right">
                <Link
                  href={`/platform/orgs/${org.id}`}
                  className="text-[#7c83e8] text-[11px] font-semibold hover:text-[#a5b4fc] transition-colors"
                >
                  Edit →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/platform/orgs`.

Expected:
- Sidebar renders, "Organizations" nav item is active ✓
- Table shows 3 mock orgs (Acme, Pacific Grading, Demo Org) ✓
- Module badges render in indigo ✓
- Status badges: green for Active, amber for Trial, muted for Internal ✓
- "Edit →" links render (will 404 until Task 7) ✓
- "+ Add Company" button in header renders (will 404 until Task 6) ✓

- [ ] **Step 4: Commit**

```bash
git add src/app/\(platform\)/orgs/page.tsx src/app/\(platform\)/orgs/OrgTable.tsx
git commit -m "feat(platform): add org list page"
```

---

## Task 6: Create org form

**Files:**
- Create: `src/app/(platform)/orgs/new/page.tsx`
- Create: `src/app/(platform)/orgs/new/CreateOrgForm.tsx`

- [ ] **Step 1: Create the server page**

```tsx
// src/app/(platform)/orgs/new/page.tsx
import { PageContainer }  from "@/components/ui/PageContainer";
import { SectionHeader }  from "@/components/ui/SectionHeader";
import { CreateOrgForm }  from "./CreateOrgForm";

export const metadata = { title: "Add Company — BedrockOS Admin" };

export default function NewOrgPage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Add Company"
        subtitle="Creates the org, enables modules, and queues the first admin invite."
      />
      <CreateOrgForm />
    </PageContainer>
  );
}
```

- [ ] **Step 2: Create the form client component**

```tsx
// src/app/(platform)/orgs/new/CreateOrgForm.tsx
"use client";

import { useState }          from "react";
import { useRouter }         from "next/navigation";
import { serverCreateOrg }   from "@/lib/actions/platform";
import type { ModuleId }     from "@/types/org";
import type { PlatformOrgStatus } from "@/types/platform";

const ALL_MODULES: { id: ModuleId; label: string }[] = [
  { id: "cru",     label: "Crew & Field Ops" },
  { id: "fix",     label: "Diagnostics"      },
  { id: "mx",      label: "Maintenance"      },
  { id: "ops",     label: "Operations"       },
  { id: "inspect", label: "Inspections"      },
  { id: "datum",   label: "Geospatial"       },
];

function toSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function CreateOrgForm() {
  const router = useRouter();
  const [name,           setName]           = useState("");
  const [slug,           setSlug]           = useState("");
  const [status,         setStatus]         = useState<PlatformOrgStatus>("trial");
  const [enabledModules, setEnabledModules] = useState<ModuleId[]>([]);
  const [adminName,      setAdminName]      = useState("");
  const [adminEmail,     setAdminEmail]     = useState("");
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  function handleNameChange(value: string) {
    setName(value);
    setSlug(toSlug(value));
  }

  function toggleModule(id: ModuleId) {
    setEnabledModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enabledModules.length === 0) {
      setError("Select at least one module.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await serverCreateOrg({
      name, slug, status, enabledModules, adminName, adminEmail,
    });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    router.push("/platform/orgs");
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mt-6 space-y-8">
      {/* Company info */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
          Company Info
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] text-content-muted mb-1">Company Name</label>
            <input
              className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-content-primary text-sm focus:outline-none focus:border-[#7c83e8]"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-[11px] text-content-muted mb-1">
                Slug <span className="opacity-60">(auto-generated)</span>
              </label>
              <input
                className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-[#7c83e8] text-sm font-mono focus:outline-none focus:border-[#7c83e8]"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                required
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] text-content-muted mb-1">Status</label>
              <select
                className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-content-primary text-sm focus:outline-none focus:border-[#7c83e8]"
                value={status}
                onChange={e => setStatus(e.target.value as PlatformOrgStatus)}
              >
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="internal">Internal</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
          Enable Modules
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {ALL_MODULES.map(({ id, label }) => {
            const on = enabledModules.includes(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleModule(id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md border text-left transition-colors ${
                  on
                    ? "bg-[#1a1f35] border-[#2d3561]"
                    : "bg-surface-raised border-surface-border opacity-60 hover:opacity-100"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                    on ? "bg-[#2d3561]" : "bg-white/5"
                  }`}
                >
                  {on && <span className="text-[#7c83e8] text-[10px]">✓</span>}
                </div>
                <div>
                  <p className={`text-xs font-bold uppercase ${on ? "text-content-primary" : "text-content-muted"}`}>
                    {id}
                  </p>
                  <p className="text-[10px] text-content-muted">{label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* First admin user */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
          First Admin User
        </h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-[11px] text-content-muted mb-1">Name</label>
            <input
              className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-content-primary text-sm focus:outline-none focus:border-[#7c83e8]"
              value={adminName}
              onChange={e => setAdminName(e.target.value)}
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-[11px] text-content-muted mb-1">Email</label>
            <input
              type="email"
              className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-content-primary text-sm focus:outline-none focus:border-[#7c83e8]"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              required
            />
          </div>
        </div>
        <p className="text-[10px] text-content-muted mt-2">
          An invite will be queued for this address on submit.
        </p>
      </section>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-[#2d3561] text-[#a5b4fc] border border-[#3d4a8a] px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-[#3a4575] disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating..." : "Create Company + Send Invite"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/platform/orgs")}
          className="px-4 py-2.5 border border-surface-border text-content-muted text-sm rounded-md hover:bg-white/5 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/platform/orgs/new`.

Expected:
- Form renders with three sections: Company Info, Enable Modules, First Admin User ✓
- Typing a company name auto-fills the slug ✓
- Module tiles toggle between enabled (indigo) and disabled (muted) ✓
- Status dropdown shows Trial / Active / Internal ✓
- Submitting with 0 modules shows "Select at least one module." ✓
- Cancel navigates back to org list ✓

- [ ] **Step 4: Commit**

```bash
git add src/app/\(platform\)/orgs/new/
git commit -m "feat(platform): add create org form"
```

---

## Task 7: Edit org page

**Files:**
- Create: `src/app/(platform)/orgs/[orgId]/page.tsx`
- Create: `src/app/(platform)/orgs/[orgId]/EditOrgForm.tsx`

- [ ] **Step 1: Create the server page**

```tsx
// src/app/(platform)/orgs/[orgId]/page.tsx
import Link                   from "next/link";
import { notFound }           from "next/navigation";
import { fetchPlatformOrg }   from "@/lib/supabase/platform-orgs";
import { fetchOrgUsers }      from "@/lib/supabase/org-users";
import { mockPlatformOrgs }   from "@/lib/mock/platform";
import { PageContainer }      from "@/components/ui/PageContainer";
import { SectionHeader }      from "@/components/ui/SectionHeader";
import { EditOrgForm }        from "./EditOrgForm";

type Params = Promise<{ orgId: string }>;

export default async function OrgDetailPage({ params }: { params: Params }) {
  const { orgId } = await params;

  const org =
    (await fetchPlatformOrg(orgId)) ??
    mockPlatformOrgs.find(o => o.id === orgId) ??
    null;

  if (!org) notFound();

  const users = await fetchOrgUsers(org.id);

  return (
    <PageContainer>
      <SectionHeader
        title={org.name}
        subtitle={`${org.id} · created ${org.createdAt}`}
        action={
          <Link
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#7c83e8] border border-[#2d3561] px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#1a1f35] transition-colors"
          >
            View as tenant ↗
          </Link>
        }
      />
      <EditOrgForm org={org} users={users} />
    </PageContainer>
  );
}
```

- [ ] **Step 2: Create the edit form client component**

```tsx
// src/app/(platform)/orgs/[orgId]/EditOrgForm.tsx
"use client";

import { useState }           from "react";
import { useRouter }          from "next/navigation";
import { serverUpdateOrg }    from "@/lib/actions/platform";
import type { ModuleId }      from "@/types/org";
import type { PlatformOrg, PlatformOrgStatus } from "@/types/platform";
import type { OrgUserRow }    from "@/lib/supabase/org-users";

const ALL_MODULES: { id: ModuleId; label: string }[] = [
  { id: "cru",     label: "Crew & Field Ops" },
  { id: "fix",     label: "Diagnostics"      },
  { id: "mx",      label: "Maintenance"      },
  { id: "ops",     label: "Operations"       },
  { id: "inspect", label: "Inspections"      },
  { id: "datum",   label: "Geospatial"       },
];

export function EditOrgForm({
  org,
  users,
}: {
  org:   PlatformOrg;
  users: OrgUserRow[];
}) {
  const router = useRouter();
  const [name,           setName]           = useState(org.name);
  const [status,         setStatus]         = useState<PlatformOrgStatus>(org.status);
  const [enabledModules, setEnabledModules] = useState<ModuleId[]>(org.enabledModules);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [saved,          setSaved]          = useState(false);

  function toggleModule(id: ModuleId) {
    setEnabledModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (enabledModules.length === 0) { setError("Select at least one module."); return; }
    setLoading(true);
    setError(null);
    const result = await serverUpdateOrg({ id: org.id, name, status, enabledModules });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${org.name}? This sets status to inactive.`)) return;
    setLoading(true);
    const result = await serverUpdateOrg({
      id: org.id, name, status: "inactive", enabledModules,
    });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    router.push("/platform/orgs");
  }

  return (
    <div className="max-w-xl mt-6 space-y-8">
      {/* Edit form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Company info */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
            Company Info
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-content-muted mb-1">Company Name</label>
              <input
                className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-content-primary text-sm focus:outline-none focus:border-[#7c83e8]"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[11px] text-content-muted mb-1">
                  Slug <span className="opacity-60">(read-only)</span>
                </label>
                <div className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-[#7c83e8] text-sm font-mono opacity-60">
                  {org.slug}
                </div>
              </div>
              <div className="flex-1">
                <label className="block text-[11px] text-content-muted mb-1">Status</label>
                <select
                  className="w-full bg-surface-raised border border-surface-border rounded-md px-3 py-2 text-content-primary text-sm focus:outline-none focus:border-[#7c83e8]"
                  value={status}
                  onChange={e => setStatus(e.target.value as PlatformOrgStatus)}
                >
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="internal">Internal</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Modules */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
            Enabled Modules
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {ALL_MODULES.map(({ id, label }) => {
              const on = enabledModules.includes(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleModule(id)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-md border text-left transition-colors ${
                    on
                      ? "bg-[#1a1f35] border-[#2d3561]"
                      : "bg-surface-raised border-surface-border opacity-60 hover:opacity-100"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${
                      on ? "bg-[#2d3561]" : "bg-white/5"
                    }`}
                  >
                    {on && <span className="text-[#7c83e8] text-[10px]">✓</span>}
                  </div>
                  <div>
                    <p className={`text-xs font-bold uppercase ${on ? "text-content-primary" : "text-content-muted"}`}>
                      {id}
                    </p>
                    <p className="text-[10px] text-content-muted">{label}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#2d3561] text-[#a5b4fc] border border-[#3d4a8a] px-4 py-2.5 rounded-md text-sm font-semibold hover:bg-[#3a4575] disabled:opacity-50 transition-colors"
          >
            {saved ? "Saved!" : loading ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/platform/orgs")}
            className="px-4 py-2.5 border border-surface-border text-content-muted text-sm rounded-md hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Users (read-only) */}
      {users.length > 0 && (
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
            Users ({users.length})
          </h3>
          <div className="border border-surface-border rounded-lg overflow-hidden">
            {users.map(user => (
              <div
                key={user.id}
                className="flex items-center justify-between px-4 py-3 border-b border-surface-border last:border-0"
              >
                <div>
                  <p className="text-content-primary text-sm font-medium">{user.name}</p>
                  <p className="text-content-muted text-[10px]">{user.email}</p>
                </div>
                <span className="text-content-muted text-[10px] capitalize border border-surface-border px-2 py-0.5 rounded">
                  {user.role}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Danger zone */}
      <section>
        <h3 className="text-[10px] font-bold uppercase tracking-widest text-red-500/70 mb-3">
          Danger Zone
        </h3>
        <div className="border border-red-900/50 rounded-lg px-4 py-3 flex items-center justify-between gap-4">
          <div>
            <p className="text-content-primary text-sm font-medium">Deactivate Organization</p>
            <p className="text-content-muted text-[10px]">
              Sets status to inactive. Does not delete data.
            </p>
          </div>
          <button
            type="button"
            onClick={handleDeactivate}
            disabled={loading || org.status === "inactive"}
            className="text-red-400 border border-red-900/50 px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-950/50 disabled:opacity-40 transition-colors shrink-0"
          >
            Deactivate
          </button>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify in browser**

Navigate to `http://localhost:3000/platform/orgs/org_acme` (one of the mock org IDs).

Expected:
- Page renders with org name as title ✓
- Fields pre-filled: name, slug (read-only, indigo mono), status dropdown, modules pre-checked ✓
- Save Changes button works (submits to server action) ✓
- Danger zone renders; Deactivate button is present ✓
- If `users` is empty, the Users section is hidden ✓

Navigate back to org list and click "Edit →" on any row — should land on that org's detail page ✓

- [ ] **Step 4: Commit**

```bash
git add src/app/\(platform\)/orgs/\[orgId\]/
git commit -m "feat(platform): add edit org page with users list and deactivate"
```

---

## Task 8: Stub pages

**Files:**
- Create: `src/app/(platform)/analytics/page.tsx`
- Create: `src/app/(platform)/revenue/page.tsx`

- [ ] **Step 1: Create analytics stub**

```tsx
// src/app/(platform)/analytics/page.tsx
import { BarChart2 }      from "lucide-react";
import { PageContainer }  from "@/components/ui/PageContainer";
import { SectionHeader }  from "@/components/ui/SectionHeader";

export const metadata = { title: "Analytics — BedrockOS Admin" };

export default function AnalyticsPage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Analytics"
        subtitle="Module usage, active companies, and platform health."
      />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <BarChart2 size={32} className="text-content-muted mb-4" />
        <p className="text-content-primary font-semibold mb-2">Analytics coming soon</p>
        <p className="text-content-muted text-sm max-w-sm">
          Once companies are live, you'll see module adoption rates, active users per org,
          and platform-wide health metrics here.
        </p>
      </div>
    </PageContainer>
  );
}
```

- [ ] **Step 2: Create revenue stub**

```tsx
// src/app/(platform)/revenue/page.tsx
import { DollarSign }     from "lucide-react";
import { PageContainer }  from "@/components/ui/PageContainer";
import { SectionHeader }  from "@/components/ui/SectionHeader";

export const metadata = { title: "Revenue — BedrockOS Admin" };

export default function RevenuePage() {
  return (
    <PageContainer>
      <SectionHeader
        title="Revenue"
        subtitle="MRR, churn, and billing overview."
      />
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <DollarSign size={32} className="text-content-muted mb-4" />
        <p className="text-content-primary font-semibold mb-2">Revenue tracking coming soon</p>
        <p className="text-content-muted text-sm max-w-sm">
          Revenue metrics will appear here once billing is connected. This is where you'll
          track MRR, trial conversions, and churn.
        </p>
      </div>
    </PageContainer>
  );
}
```

- [ ] **Step 3: Verify in browser**

Click "Analytics" and "Revenue" in the sidebar (they render but were greyed out — clicking them should now work).

Expected:
- Both pages render with the empty-state icon, heading, and description ✓
- Sidebar nav items for Analytics and Revenue still show "Soon" badge (they remain `available: false` in `PlatformShell.tsx` — the routes just load gracefully if someone navigates directly) ✓

- [ ] **Step 4: Commit**

```bash
git add src/app/\(platform\)/analytics/ src/app/\(platform\)/revenue/
git commit -m "feat(platform): add analytics and revenue stub pages"
```

---

## Done

Full platform admin is live at `/platform/orgs`. The shell is fully isolated from the tenant `(shell)` — no `OrgProvider`, no shared nav. Future work:
- Wire Analytics once companies are active (module usage from `activity` table)
- Wire Revenue once billing is connected (Stripe webhook → `revenue` table)
- Promote platform admin email list to a `superadmin` DB flag in Phase 3
