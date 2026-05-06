# Auth + User Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Supabase Auth sign-in, protect all shell routes behind a login page, wire the signed-in user's role into OrgProvider, and replace the mock-data admin users page with real invite/manage functionality.

**Architecture:** `@supabase/ssr` handles session cookies via middleware + server components. The shell layout reads the session and fetches the user's `org_users` row (role, name) to seed OrgProvider — replacing the hardcoded mock persona. The existing service-role Supabase client is renamed to `server.ts` to avoid confusion with the new browser client.

**Tech Stack:** Next.js 16 App Router, `@supabase/ssr` (new — needs install), `@supabase/supabase-js` v2 (existing), Supabase Auth (email/password + invite flow), TypeScript

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/lib/supabase/client.ts` | Rename → `server.ts` | Clarify it is service-role only |
| `src/lib/supabase/workers.ts` | Modify | Update import path |
| `src/lib/supabase/projects.ts` | Modify | Update import path |
| `src/lib/supabase/crews.ts` | Modify | Update import path |
| `src/lib/actions/projects.ts` | Modify | Update import path |
| `src/lib/actions/crews.ts` | Modify | Update import path |
| `src/lib/supabase/ssr.ts` | Create | SSR Supabase client + `getSessionUser()` |
| `src/lib/supabase/browser.ts` | Create | Browser Supabase client for sign-in/out |
| `src/lib/supabase/org-users.ts` | Create | `fetchOrgUsers`, `fetchOrgUser` via service role |
| `src/lib/actions/auth.ts` | Create | `serverSignOut()` Server Action |
| `src/lib/actions/org-users.ts` | Create | `serverInviteUser`, `serverUpdateUserRole`, `serverRemoveUser` |
| `src/middleware.ts` | Create | Protect shell routes, redirect to /login |
| `src/app/(auth)/layout.tsx` | Create | Minimal layout for login page (no shell) |
| `src/app/(auth)/login/page.tsx` | Create | Email/password sign-in form |
| `src/app/(shell)/layout.tsx` | Modify | Read session + fetch org user, pass to ShellClientRoot |
| `src/app/(shell)/shell-client.tsx` | Modify | Accept `initialUser?` prop |
| `src/providers/OrgProvider.tsx` | Modify | Use session user when provided, fall back to mock |
| `src/components/layout/Topbar.tsx` | Modify | Add sign-out button next to avatar |
| `src/app/(shell)/admin/users/page.tsx` | Rewrite | Real `org_users` data, invite form, role edit, remove |

---

### Task 1: Install `@supabase/ssr`, rename service client, create SSR + browser clients

**Files:**
- Rename: `src/lib/supabase/client.ts` → `src/lib/supabase/server.ts`
- Modify: `src/lib/supabase/workers.ts`, `projects.ts`, `crews.ts` (import path)
- Modify: `src/lib/actions/projects.ts`, `crews.ts` (import path)
- Create: `src/lib/supabase/ssr.ts`
- Create: `src/lib/supabase/browser.ts`
- Modify: `.env.local` (add `NEXT_PUBLIC_SUPABASE_ANON_KEY`)

- [ ] **Step 1: Install `@supabase/ssr`**

```bash
cd /Users/tui/bedrockos
npm install @supabase/ssr
```

Expected: `@supabase/ssr` added to `package.json` dependencies.

- [ ] **Step 2: Rename `client.ts` to `server.ts`**

```bash
mv src/lib/supabase/client.ts src/lib/supabase/server.ts
```

- [ ] **Step 3: Update the 5 import sites from `./client` / `supabase/client` to the new path**

In `src/lib/supabase/workers.ts`, `projects.ts`, `crews.ts` — change:
```ts
import { supabase } from "./client";
```
to:
```ts
import { supabase } from "./server";
```

In `src/lib/actions/projects.ts` and `src/lib/actions/crews.ts` — change:
```ts
import { supabase } from "@/lib/supabase/client";
```
to:
```ts
import { supabase } from "@/lib/supabase/server";
```

- [ ] **Step 4: Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` to `.env.local`**

Get the anon key from: Supabase dashboard → BedrockOS project → Settings → API → `anon` `public` key.

Add to `.env.local`:
```
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key-here>
```

- [ ] **Step 5: Create `src/lib/supabase/ssr.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies — middleware handles session refresh
          }
        },
      },
    },
  );
}

export async function getSessionUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
```

- [ ] **Step 6: Create `src/lib/supabase/browser.ts`**

```ts
import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 7: Verify build is clean**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat(auth): install @supabase/ssr, rename service client, add SSR + browser clients"
```

---

### Task 2: `org_users` table + fetch functions

**Files:**
- DB: Run SQL in Supabase dashboard
- Create: `src/lib/supabase/org-users.ts`

- [ ] **Step 1: Run migration in Supabase dashboard**

Go to: BedrockOS Supabase project → SQL Editor → New query. Run:

```sql
create table if not exists org_users (
  id         uuid primary key default gen_random_uuid(),
  org_id     text not null,
  auth_id    uuid not null references auth.users(id) on delete cascade,
  email      text not null,
  name       text not null default '',
  role       text not null default 'viewer',
  created_at timestamptz not null default now(),
  unique(org_id, auth_id)
);

-- Restrict to service-role only — no public read/write
alter table org_users enable row level security;
```

- [ ] **Step 2: Create `src/lib/supabase/org-users.ts`**

```ts
import "server-only";
import { supabase } from "./server";

export interface OrgUserRow {
  id:      string;
  auth_id: string;
  email:   string;
  name:    string;
  role:    string;
}

export async function fetchOrgUsers(orgId: string): Promise<OrgUserRow[]> {
  try {
    const { data, error } = await supabase
      .from("org_users")
      .select("id, auth_id, email, name, role")
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });
    if (error || !data) return [];
    return data as OrgUserRow[];
  } catch {
    return [];
  }
}

export async function fetchOrgUser(
  orgId: string,
  authId: string,
): Promise<OrgUserRow | null> {
  try {
    const { data, error } = await supabase
      .from("org_users")
      .select("id, auth_id, email, name, role")
      .eq("org_id", orgId)
      .eq("auth_id", authId)
      .single();
    if (error || !data) return null;
    return data as OrgUserRow;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add src/lib/supabase/org-users.ts
git commit -m "feat(auth): add org_users fetch functions"
```

---

### Task 3: Sign-in page + auth layout

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Create `src/app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/(auth)/login/page.tsx`**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const router = useRouter();

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-bold text-content-primary">BedrockOS</h1>
        <p className="text-sm text-content-muted mt-1">Sign in to your organization</p>
      </div>

      <form onSubmit={handleSignIn} className="space-y-4">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-surface-overlay border border-surface-border rounded px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold/50"
            placeholder="you@company.com"
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface-overlay border border-surface-border rounded px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold/50"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="text-xs text-red-400">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-gold hover:bg-gold/90 text-black text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`. Navigate to `http://localhost:3000/login` and confirm the form renders.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/
git commit -m "feat(auth): add sign-in page"
```

---

### Task 4: `serverSignOut` + Topbar sign-out button

**Files:**
- Create: `src/lib/actions/auth.ts`
- Modify: `src/components/layout/Topbar.tsx`

- [ ] **Step 1: Create `src/lib/actions/auth.ts`**

```ts
"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function serverSignOut(): Promise<never> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        },
      },
    },
  );
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 2: Add sign-out button to `src/components/layout/Topbar.tsx`**

Add `LogOut` to the existing lucide import line:
```ts
import { ..., LogOut } from "lucide-react";
```

Add `serverSignOut` import near the top of the file:
```ts
import { serverSignOut } from "@/lib/actions/auth";
```

Replace the user avatar block (the `{/* User avatar */}` section) with:
```tsx
{/* User avatar + sign-out */}
<div className="flex items-center gap-2 pl-1">
  <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center">
    <span className="text-gold text-[11px] font-bold">{initials}</span>
  </div>
  <div className="hidden lg:flex flex-col items-start">
    <span className="text-xs font-semibold text-content-primary leading-none">{currentUser.name.split(" ")[0]}</span>
    <span className="text-[10px] text-content-muted">{roleLabel}</span>
  </div>
  <form action={serverSignOut}>
    <button
      type="submit"
      title="Sign out"
      className="p-1.5 text-content-muted hover:text-content-primary transition-colors rounded hover:bg-surface-overlay"
    >
      <LogOut size={13} />
    </button>
  </form>
</div>
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 4: Commit**

```bash
git add src/lib/actions/auth.ts src/components/layout/Topbar.tsx
git commit -m "feat(auth): add serverSignOut action and sign-out button in Topbar"
```

---

### Task 5: Middleware — protect shell routes

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create `src/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isLoginPage = request.nextUrl.pathname === "/login";

  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (user && isLoginPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
```

- [ ] **Step 2: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 3: Smoke test middleware locally**

```bash
npm run dev
```

Navigate to `http://localhost:3000/dashboard` — should redirect to `/login`.
Sign in with a Supabase Auth user (create one manually in the Supabase dashboard: Authentication → Users → Add user, if none exist yet).
After sign-in, should land on `/dashboard`.

- [ ] **Step 4: Commit**

```bash
git add src/middleware.ts
git commit -m "feat(auth): add middleware to protect shell routes"
```

---

### Task 6: Shell layout + OrgProvider session wiring

**Files:**
- Modify: `src/app/(shell)/layout.tsx`
- Modify: `src/app/(shell)/shell-client.tsx`
- Modify: `src/providers/OrgProvider.tsx`

- [ ] **Step 1: Update `src/app/(shell)/layout.tsx`**

```ts
import { fetchOrgWorkers }  from "@/lib/supabase/workers";
import { fetchOrgProjects } from "@/lib/supabase/projects";
import { fetchOrgCrews }    from "@/lib/supabase/crews";
import { fetchOrgUser }     from "@/lib/supabase/org-users";
import { getSessionUser }   from "@/lib/supabase/ssr";
import { ShellClientRoot }  from "./shell-client";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export default async function ShellRootLayout({ children }: { children: React.ReactNode }) {
  const sessionUser = await getSessionUser();

  const [workers, projects, crews] = await Promise.all([
    fetchOrgWorkers(ORG_ID),
    fetchOrgProjects(ORG_ID),
    fetchOrgCrews(ORG_ID),
  ]);

  const orgUser = sessionUser
    ? await fetchOrgUser(ORG_ID, sessionUser.id)
    : null;

  return (
    <ShellClientRoot
      initialWorkers={workers}
      initialProjects={projects}
      initialCrews={crews}
      initialUser={orgUser ?? undefined}
    >
      {children}
    </ShellClientRoot>
  );
}
```

- [ ] **Step 2: Update `src/app/(shell)/shell-client.tsx`**

Add `OrgUserRow` to imports:
```ts
import type { OrgUserRow } from "@/lib/supabase/org-users";
```

Add `initialUser?` to the `ShellClientRoot` props interface:
```ts
export function ShellClientRoot({
  children,
  initialWorkers,
  initialProjects,
  initialCrews,
  initialUser,
}: {
  children:        React.ReactNode;
  initialWorkers:  OrgWorker[];
  initialProjects: Project[];
  initialCrews:    OrgCrew[];
  initialUser?:    OrgUserRow;
}) {
```

Pass `initialUser` down to `<OrgProvider>`:
```tsx
<OrgProvider
  initialWorkers={initialWorkers}
  initialProjects={initialProjects}
  initialCrews={initialCrews}
  initialUser={initialUser}
>
```

- [ ] **Step 3: Update `src/providers/OrgProvider.tsx`**

Add `OrgUserRow` import:
```ts
import type { OrgUserRow } from "@/lib/supabase/org-users";
```

Add `initialUser?` to the OrgProvider props interface (near `initialWorkers?`, `initialProjects?`, `initialCrews?`):
```ts
initialUser?: OrgUserRow;
```

Update the `useState` config initializer to use the session user when provided:

Find the line:
```ts
const [config, setConfig] = useState<OrgConfig>(getOrgConfig);
```

Replace with:
```ts
const [config, setConfig] = useState<OrgConfig>(() => {
  const base = getOrgConfig();
  if (initialUser) {
    return {
      ...base,
      currentUser: {
        id:     initialUser.auth_id,
        name:   initialUser.name,
        email:  initialUser.email,
        role:   initialUser.role as UserRole,
        avatar: null,
      },
    };
  }
  return base;
});
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Smoke test**

Sign in via `/login`. The Topbar should display the signed-in user's first name and role (pulled from `org_users` table, not mock data). If `org_users` has no row for this user yet, it falls back to the mock persona — that is expected until Task 7 populates the table.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(shell\)/layout.tsx src/app/\(shell\)/shell-client.tsx src/providers/OrgProvider.tsx
git commit -m "feat(auth): wire session user from org_users into OrgProvider"
```

---

### Task 7: Admin users page — real data, invite, role edit, remove

**Files:**
- Create: `src/lib/actions/org-users.ts`
- Rewrite: `src/app/(shell)/admin/users/page.tsx`

- [ ] **Step 1: Create `src/lib/actions/org-users.ts`**

```ts
"use server";

import { supabase } from "@/lib/supabase/server";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export async function serverInviteUser(input: {
  email: string;
  name:  string;
  role:  string;
}): Promise<{ error?: string }> {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(input.email);
  if (error || !data.user) {
    return { error: error?.message ?? "Invite failed" };
  }
  await supabase.from("org_users").insert({
    org_id:  ORG_ID,
    auth_id: data.user.id,
    email:   input.email,
    name:    input.name,
    role:    input.role,
  });
  return {};
}

export async function serverUpdateUserRole(
  orgUserId: string,
  role: string,
): Promise<void> {
  await supabase.from("org_users").update({ role }).eq("id", orgUserId);
}

export async function serverRemoveUser(orgUserId: string): Promise<void> {
  await supabase.from("org_users").delete().eq("id", orgUserId);
}
```

- [ ] **Step 2: Rewrite `src/app/(shell)/admin/users/page.tsx`**

```tsx
import { fetchOrgUsers } from "@/lib/supabase/org-users";
import { PageContainer } from "@/components/ui/PageContainer";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { UsersAdminPanel } from "@/components/admin/UsersAdminPanel";

const ORG_ID = process.env.NEXT_PUBLIC_CRU_ORG_ID ?? "org_aiga_001";

export const metadata = { title: "Users & Roles" };

export default async function UsersPage() {
  const users = await fetchOrgUsers(ORG_ID);

  return (
    <PageContainer maxWidth="wide">
      <SectionHeader
        title="Users & Roles"
        subtitle={`${users.length} member${users.length !== 1 ? "s" : ""} in your organization`}
      />
      <UsersAdminPanel users={users} />
    </PageContainer>
  );
}
```

- [ ] **Step 3: Create `src/components/admin/UsersAdminPanel.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import type { OrgUserRow } from "@/lib/supabase/org-users";
import { serverInviteUser, serverUpdateUserRole, serverRemoveUser } from "@/lib/actions/org-users";
import { ROLE_LABELS, ROLE_BADGE_COLORS } from "@/lib/constants/roles";
import type { UserRole } from "@/types/org";

const ALL_ROLES: UserRole[] = [
  "owner", "admin", "pm", "project_engineer", "superintendent", "foreman", "mechanic", "viewer",
];

const fieldClass = "bg-surface-overlay border border-surface-border rounded px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold/50";
const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1";

export function UsersAdminPanel({ users }: { users: OrgUserRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName,  setInviteName]  = useState("");
  const [inviteRole,  setInviteRole]  = useState<UserRole>("viewer");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteOpen,  setInviteOpen]  = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    const result = await serverInviteUser({ email: inviteEmail, name: inviteName, role: inviteRole });
    if (result.error) {
      setInviteError(result.error);
    } else {
      setInviteEmail(""); setInviteName(""); setInviteRole("viewer"); setInviteOpen(false);
      router.refresh();
    }
  }

  function handleRoleChange(orgUserId: string, role: string) {
    startTransition(async () => {
      await serverUpdateUserRole(orgUserId, role);
      router.refresh();
    });
  }

  function handleRemove(orgUserId: string) {
    if (!confirm("Remove this user from the organization?")) return;
    startTransition(async () => {
      await serverRemoveUser(orgUserId);
      router.refresh();
    });
  }

  return (
    <div className="mt-4 space-y-4">
      {/* Invite button */}
      <div>
        <button
          onClick={() => setInviteOpen((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors"
        >
          <Plus size={13} /> Invite User
        </button>

        {inviteOpen && (
          <form onSubmit={handleInvite} className="mt-3 p-4 border border-surface-border rounded-xl bg-surface-raised space-y-3 max-w-md">
            <div>
              <label className={labelClass}>Name</label>
              <input
                required
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="Full name"
                className={`w-full ${fieldClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@company.com"
                className={`w-full ${fieldClass}`}
              />
            </div>
            <div>
              <label className={labelClass}>Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className={`w-full ${fieldClass}`}
              >
                {ALL_ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                ))}
              </select>
            </div>
            {inviteError && <p className="text-xs text-red-400">{inviteError}</p>}
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 transition-colors">
                Send Invite
              </button>
              <button type="button" onClick={() => setInviteOpen(false)} className="px-4 py-2 text-xs font-semibold text-content-muted hover:text-content-primary transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Users table */}
      <div className="rounded-[var(--radius-card)] border border-surface-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-overlay">
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Name</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted hidden md:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-content-muted">Role</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-sm text-content-muted text-center">
                  No users yet. Invite someone to get started.
                </td>
              </tr>
            )}
            {users.map((user) => {
              const roleKey   = user.role as UserRole;
              const badgeClass = ROLE_BADGE_COLORS[roleKey] ?? "text-content-muted border-surface-border bg-surface-overlay";
              const initials  = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
              return (
                <tr key={user.id} className="border-b border-surface-border last:border-0 hover:bg-surface-overlay/50 transition-colors">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0">
                        <span className="text-gold text-[10px] font-bold">{initials}</span>
                      </div>
                      <span className="font-medium text-content-primary">{user.name || "—"}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-content-muted hidden md:table-cell">{user.email}</td>
                  <td className="px-4 py-3.5">
                    <select
                      value={user.role}
                      disabled={isPending}
                      onChange={(e) => handleRoleChange(user.id, e.target.value)}
                      className={`text-xs font-semibold px-2 py-1 rounded border ${badgeClass} bg-transparent focus:outline-none focus:border-gold/50`}
                    >
                      {ALL_ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <button
                      onClick={() => handleRemove(user.id)}
                      disabled={isPending}
                      className="p-1 text-content-muted hover:text-red-400 transition-colors disabled:opacity-40"
                      title="Remove user"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | grep -E "error|Error|✓"
```

Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/org-users.ts src/app/\(shell\)/admin/users/page.tsx src/components/admin/UsersAdminPanel.tsx
git commit -m "feat(auth): real org_users admin page with invite, role edit, and remove"
```

---

## Self-Review

**Spec coverage:**
1. ✅ Supabase Auth sign-in — Task 3 (login page) + Task 5 (middleware)
2. ✅ Session-to-role wiring — Task 6 (shell layout → OrgProvider)
3. ✅ Invite new user (admin/supe) — Task 7 (`serverInviteUser` + invite form)
4. ✅ Change role — Task 7 (`serverUpdateUserRole` + role dropdown)
5. ✅ Remove user — Task 7 (`serverRemoveUser` + trash button)
6. ✅ Sign-out — Task 4 (`serverSignOut` + Topbar button)
7. ✅ Route protection — Task 5 (middleware redirects unauthenticated requests to /login)
8. ✅ Fall back to mock in dev if no session — Task 6 (OrgProvider uses mock when `initialUser` is undefined)

**Placeholder scan:** None — all code blocks are complete.

**Type consistency:**
- `OrgUserRow` defined in Task 2, imported in Tasks 6 and 7 ✅
- `serverInviteUser`, `serverUpdateUserRole`, `serverRemoveUser` defined in Task 7 Step 1, used in Step 3 ✅
- `ALL_ROLES: UserRole[]` uses `UserRole` from `@/types/org` which includes all 8 roles ✅
- `ROLE_LABELS` and `ROLE_BADGE_COLORS` already exist at `@/lib/constants/roles` ✅

**Edge cases handled:**
- `fetchOrgUser` returns `null` if no row → OrgProvider falls back to mock config (safe for dev without DB)
- `serverInviteUser` returns `{ error }` if Supabase invite fails (duplicate email, etc.)
- Empty `org_users` table shows friendly "No users yet" row in admin table
