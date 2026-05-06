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
  { id: "safety",  label: "Safety"           },
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
    try {
      const result = await serverUpdateOrg({ id: org.id, name, status, enabledModules });
      if (result.error) { setError(result.error); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeactivate() {
    if (!confirm(`Deactivate ${org.name}? This sets status to inactive.`)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await serverUpdateOrg({
        id: org.id, name, status: "inactive", enabledModules,
      });
      if (result.error) { setError(result.error); return; }
      router.push("/platform/orgs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
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
