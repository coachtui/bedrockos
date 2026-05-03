# BedrockOS Platform Admin — Design Spec

**Date:** 2026-05-02  
**Status:** Approved for implementation  
**Scope:** Operator-facing dashboard for managing BedrockOS customer organizations

---

## 1. Problem & Context

BedrockOS is a product under AIGA LLC. When a new customer company signs up, the founder manually provisions their org: creates it, sets which modules they get, and invites their first admin user. Currently there is no interface for this — it would require direct database manipulation.

The platform admin dashboard gives the AIGA LLC founder (and any future ops team) a clean internal surface for this work. It is entirely separate from the tenant-facing shell that customers use.

**Out of scope for this phase:**
- AIGA LLC-level dashboard spanning multiple products (future, when 2+ products are live)
- Self-service customer signup (customers don't provision themselves yet)
- Revenue tracking and analytics (stubbed — no live data yet)
- Real authentication (superadmin check hardcoded for Phase 1–2)
- Automated invite emails (invite creation is the goal; email delivery is a backend concern)

---

## 2. Brand & Product Architecture

```
AIGA LLC (parent company)
└── BedrockOS (this product)
    ├── Tenant shell  → what customers use (/dashboard, /projects, /modules/...)
    └── Platform admin → what the operator uses (/platform/...)
```

The platform admin is branded **BedrockOS / Platform Admin** — not AIGA. A future AIGA LLC-level admin (managing all products, aggregate revenue) is a separate surface on a separate site, built when there are multiple live products to manage.

---

## 3. Route Structure

New route group added alongside the existing `(shell)`:

```
src/app/
├── (shell)/            ← unchanged, customer-facing
└── (platform)/
    ├── layout.tsx      ← platform shell layout, no OrgProvider
    ├── orgs/
    │   ├── page.tsx            ← org list
    │   ├── new/
    │   │   └── page.tsx        ← create org form
    │   └── [orgId]/
    │       └── page.tsx        ← org detail / edit
    ├── analytics/
    │   └── page.tsx            ← stub (empty state)
    └── revenue/
        └── page.tsx            ← stub (empty state)
```

Entry point: `/platform` redirects to `/platform/orgs`.

---

## 4. Access Control

Phase 1–2: a hardcoded `PLATFORM_ADMIN_EMAILS` array in the layout. If the session user's email is not in the list, redirect to `/login`. No role in the org_users table — this is operator-level access, above tenant roles.

Phase 3 (backend): replace with a `superadmin` flag on the user record.

---

## 5. Platform Shell Layout

The `(platform)/layout.tsx` has its own sidebar and nav — it does **not** wrap in `OrgProvider`. No tenant context is present.

**Sidebar contents:**
- Brand mark: BedrockOS logo / "Platform Admin" label
- Nav section "Manage":
  - Organizations (active by default, shows count badge)
  - Analytics (visible, locked with "Soon" badge)
  - Revenue (visible, locked with "Soon" badge)
- Footer: current user name + "Founder · AIGA LLC" label

Visual treatment: dark theme consistent with the tenant shell, but uses an indigo/slate accent (`#7c83e8` / `#2d3561`) instead of the tenant gold, to make it unmistakable that you are in the operator view.

---

## 6. Org List Page (`/platform/orgs`)

**Purpose:** See all companies on BedrockOS at a glance.

**Table columns:**
| Column | Notes |
|---|---|
| Company (name + slug) | slug shown as secondary line |
| Modules | colored badge per enabled module |
| Users | count of users in the org |
| Status | Active / Trial / Internal |
| Added | month + year |
| Action | "Edit →" link to org detail |

**Header actions:** "Add Company" button → navigates to `/platform/orgs/new`.

**Status values:**
- `Active` — paying, live customer
- `Trial` — evaluating, limited time
- `Internal` — demo/seed org used by AIGA LLC team

**Mock data:** 3 orgs seeded (one per status type) so the list is never empty during development.

---

## 7. Create Org Page (`/platform/orgs/new`)

Single-page form. On submit: creates the org record and queues an invite for the first admin user.

**Section 1 — Company Info:**
- Company Name (required)
- Slug (auto-generated from name, editable — lowercase, hyphens only)
- Status (dropdown: Trial / Active / Internal)

**Section 2 — Enable Modules:**
Checkbox grid, 2 columns. Each tile shows the module code and description:
- CRU — Crew & Field Ops
- FIX — Diagnostics
- MX — Maintenance
- OPS — Operations
- INSPECT — Inspections
- DATUM — Geospatial

At least one module must be selected.

**Section 3 — First Admin User:**
- Name (required)
- Email (required, valid email format)
- Helper text: "An invite email will be sent to this address when you submit."

**Submit button:** "Create Company + Send Invite"  
**Cancel:** returns to org list without saving.

**Phase 1–2 behavior:** form submits to a Server Action that writes to Supabase (`organizations` table + `org_users` row with role `owner`, status `invited`). Follows the same pattern as the existing `/admin/users` page. Actual invite email delivery is deferred — the row is created but no email is sent yet. A `// TODO: send invite email` comment marks the hook point.

---

## 8. Org Detail / Edit Page (`/platform/orgs/[orgId]`)

Same layout as the create form but pre-filled. Allows editing:
- Company name
- Status
- Enabled modules (can add or remove)

**Read-only fields:** slug (can't change post-creation), org ID, date created.

**Additional section — Users:** a read-only list of current org members (name, email, role, status). No user management from this view — that belongs in the tenant's own `/admin/users` page.

**Danger zone:** "Deactivate Org" sets status to `Inactive`. No deletion — orgs are never hard-deleted in Phase 1–2.

---

## 9. Stub Pages

`/platform/analytics` and `/platform/revenue` render an empty state:
- Icon + heading ("Analytics coming soon")
- 2-line description of what will be tracked here
- No fake charts — honest empty state only

These exist so the nav items are clickable and the routes are real, but they carry no data.

---

## 10. Mock Data

Add a `platformOrgs` array to `src/lib/mock/platform.ts`:

```ts
export const platformOrgs: PlatformOrg[] = [
  { id: 'org_acme', name: 'Acme Construction', slug: 'acme', status: 'active', modules: ['cru','fix','mx'], userCount: 8, createdAt: '2026-01' },
  { id: 'org_pacific', name: 'Pacific Grading', slug: 'pacific', status: 'trial', modules: ['fix','ops'], userCount: 3, createdAt: '2026-04' },
  { id: 'org_demo', name: 'Demo Org', slug: 'demo', status: 'internal', modules: ['cru','fix','mx','ops'], userCount: 1, createdAt: '2025-11' },
]
```

Types go in `src/types/platform.ts`.

---

## 11. Navigation Between Shells

The platform admin and tenant shell are fully separate — there is no shared nav or context. To move between them:

- From platform admin → tenant shell: a "View as tenant" link on the org detail page opens `/dashboard` in a new tab (no impersonation in Phase 1–2, just navigation).
- From tenant shell → platform admin: direct URL `/platform/orgs` (no link in the tenant nav — it's an internal tool).

---

## 12. What This Is Not

- Not a customer-facing portal
- Not a billing or subscription management system (Stripe, etc. come later)
- Not a multi-product AIGA LLC dashboard
- Not an impersonation/support tool (view-as-customer is future)
