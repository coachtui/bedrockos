"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, MailCheck } from "lucide-react";
import type { OrgUserRow } from "@/lib/supabase/org-users";
import { serverInviteUser, serverResendInvite, serverUpdateUserRole, serverRemoveUser } from "@/lib/actions/org-users";
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
  const [inviteError, setInviteError]   = useState<string | null>(null);
  const [resendError, setResendError]   = useState<string | null>(null);
  const [resendOk,    setResendOk]      = useState<string | null>(null);
  const [inviteOpen,  setInviteOpen]  = useState(false);

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    startTransition(async () => {
      const result = await serverInviteUser({ email: inviteEmail, name: inviteName, role: inviteRole });
      if (result.error) {
        setInviteError(result.error);
      } else {
        setInviteEmail(""); setInviteName(""); setInviteRole("viewer"); setInviteOpen(false);
        router.refresh();
      }
    });
  }

  function handleRoleChange(orgUserId: string, role: string) {
    startTransition(async () => {
      await serverUpdateUserRole(orgUserId, role);
      router.refresh();
    });
  }

  function handleResendInvite(email: string) {
    setResendError(null);
    setResendOk(null);
    startTransition(async () => {
      const result = await serverResendInvite(email);
      if (result.error) {
        setResendError(result.error);
      } else {
        setResendOk(`Invite resent to ${email}`);
      }
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
              <button type="submit" disabled={isPending} className="px-4 py-2 text-xs font-semibold bg-gold text-black rounded hover:bg-gold/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {isPending ? "Sending…" : "Send Invite"}
              </button>
              <button type="button" onClick={() => setInviteOpen(false)} className="px-4 py-2 text-xs font-semibold text-content-muted hover:text-content-primary transition-colors">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {resendError && <p className="text-xs text-red-400">{resendError}</p>}
      {resendOk    && <p className="text-xs text-green-400">{resendOk}</p>}

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
              const roleKey    = user.role as UserRole;
              const badgeClass = ROLE_BADGE_COLORS[roleKey] ?? "text-content-muted border-surface-border bg-surface-overlay";
              const initials   = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";
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
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleResendInvite(user.email)}
                        disabled={isPending}
                        className="p-1 text-content-muted hover:text-gold transition-colors disabled:opacity-40"
                        title="Resend invite"
                      >
                        <MailCheck size={13} />
                      </button>
                      <button
                        onClick={() => handleRemove(user.id)}
                        disabled={isPending}
                        className="p-1 text-content-muted hover:text-red-400 transition-colors disabled:opacity-40"
                        title="Remove user"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
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
