"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MailCheck, Trash2 } from "lucide-react";
import { InspectorPanel } from "@/components/ui/InspectorPanel";
import type { OrgUserRow } from "@/lib/supabase/org-users";
import {
  serverUpdateUser,
  serverResendInvite,
  serverRemoveUser,
} from "@/lib/actions/org-users";
import { ROLE_LABELS, ROLE_BADGE_COLORS } from "@/lib/constants/roles";
import type { UserRole } from "@/types/org";

const ALL_ROLES: UserRole[] = [
  "owner", "admin", "equipment_director", "operations_manager",
  "pm", "project_engineer", "superintendent", "foreman", "mechanic", "viewer",
];

interface UserInspectorPanelProps {
  user:    OrgUserRow | null;
  onClose: () => void;
}

export function UserInspectorPanel({ user, onClose }: UserInspectorPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editDetails, setEditDetails] = useState(false);
  const [editName,    setEditName]    = useState("");
  const [editRole,    setEditRole]    = useState<UserRole>("viewer");
  const [error,       setError]       = useState<string | null>(null);
  const [resendOk,    setResendOk]    = useState<string | null>(null);

  useEffect(() => {
    setEditDetails(false);
    setEditName(user?.name ?? "");
    setEditRole((user?.role ?? "viewer") as UserRole);
    setError(null);
    setResendOk(null);
  }, [user?.id, user?.name, user?.role]);

  if (!user) return null;

  const badgeClass =
    ROLE_BADGE_COLORS[user.role as UserRole] ??
    "text-content-muted border-surface-border bg-surface-overlay";

  const initials =
    user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase() || "?";

  function handleSave() {
    if (!user) return;
    setError(null);
    const trimmed = editName.trim();
    if (!trimmed) {
      setError("Name cannot be empty.");
      return;
    }
    startTransition(async () => {
      const result = await serverUpdateUser(user.id, {
        name: trimmed,
        role: editRole,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setEditDetails(false);
      router.refresh();
    });
  }

  function handleResend() {
    if (!user) return;
    setError(null);
    setResendOk(null);
    startTransition(async () => {
      const result = await serverResendInvite(user.email);
      if (result.error) {
        setError(result.error);
      } else {
        setResendOk(`Invite resent to ${user.email}`);
      }
    });
  }

  function handleRemove() {
    if (!user) return;
    if (!confirm(`Remove ${user.name || user.email} from the organization?`)) return;
    startTransition(async () => {
      const result = await serverRemoveUser(user.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      router.refresh();
    });
  }

  return (
    <InspectorPanel
      open={!!user}
      onClose={onClose}
      title={user.name || user.email}
      subtitle={`User · ${ROLE_LABELS[user.role as UserRole] ?? user.role}`}
      badge={
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeClass}`}>
          {ROLE_LABELS[user.role as UserRole] ?? user.role}
        </span>
      }
    >
      <div className="px-5 py-4 space-y-5">
        {/* ── Identity ─────────────────────────────────────────────────── */}
        <section className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gold/20 border border-gold/30 flex items-center justify-center shrink-0">
            <span className="text-gold text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-content-primary truncate">
              {user.name || "—"}
            </p>
            <p className="text-xs text-content-muted truncate">{user.email}</p>
          </div>
        </section>

        {/* ── Details ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted">
              Details
            </h3>
            {!editDetails && (
              <button
                onClick={() => setEditDetails(true)}
                className="text-[10px] font-semibold text-content-muted hover:text-teal transition-colors"
              >
                Edit
              </button>
            )}
          </div>

          {!editDetails ? (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-content-muted">Name</span>
                <span className="font-semibold text-content-primary">{user.name || "—"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-content-muted">Email</span>
                <span className="font-semibold text-content-primary">{user.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-content-muted">Role</span>
                <span className="font-semibold text-content-primary">
                  {ROLE_LABELS[user.role as UserRole] ?? user.role}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:border-teal"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={user.email}
                  disabled
                  className="w-full text-xs bg-surface-overlay/50 border border-surface-border rounded-lg px-2.5 py-1.5 text-content-muted cursor-not-allowed"
                />
                <p className="mt-1 text-[10px] text-content-muted">
                  Email is tied to the auth account and can't be changed here.
                </p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1.5">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full text-xs bg-surface-overlay border border-surface-border rounded-lg px-2.5 py-1.5 text-content-primary focus:outline-none focus:border-teal"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="px-3 py-1 text-[10px] font-semibold bg-teal text-white rounded hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditDetails(false);
                    setEditName(user.name);
                    setEditRole(user.role as UserRole);
                    setError(null);
                  }}
                  className="text-[10px] text-content-muted hover:text-content-primary transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {error    && <p className="mt-2 text-xs text-red-400">{error}</p>}
          {resendOk && <p className="mt-2 text-xs text-green-400">{resendOk}</p>}
        </section>

        {/* ── Actions ──────────────────────────────────────────────────── */}
        <section>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-content-muted mb-3">
            Actions
          </h3>
          <div className="flex flex-col gap-2">
            <button
              onClick={handleResend}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold border border-surface-border rounded-lg text-content-primary hover:border-gold/50 hover:text-gold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <MailCheck size={13} /> Resend invite
            </button>
            <button
              onClick={handleRemove}
              disabled={isPending}
              className="flex items-center gap-2 px-3 py-2 text-xs font-semibold border border-surface-border rounded-lg text-content-primary hover:border-red-400/50 hover:text-red-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Trash2 size={13} /> Remove from organization
            </button>
          </div>
        </section>
      </div>
    </InspectorPanel>
  );
}
