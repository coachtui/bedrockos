"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type Step = "loading" | "set-password" | "error" | "done";

export default function AcceptInvitePage() {
  const [step, setStep]         = useState<Step>("loading");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    // Supabase PKCE flow: code comes in as a query param
    const code = new URLSearchParams(window.location.search).get("code");
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) {
          setError(error.message);
          setStep("error");
        } else {
          setStep("set-password");
        }
      });
      return;
    }

    // Implicit flow fallback: tokens in hash fragment
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const accessToken  = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (accessToken && refreshToken) {
      supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).then(({ error }) => {
        if (error) {
          setError(error.message);
          setStep("error");
        } else {
          setStep("set-password");
        }
      });
      return;
    }

    setError("Invalid or expired invite link.");
    setStep("error");
  }, []);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setStep("done");
      setTimeout(() => router.push("/dashboard"), 1500);
    }
  }

  const inputClass = "w-full bg-surface-overlay border border-surface-border rounded px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-gold/50";
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-content-muted mb-1";

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-bold text-content-primary">BedrockOS</h1>
        <p className="text-sm text-content-muted mt-1">Set up your account</p>
      </div>

      {step === "loading" && (
        <p className="text-sm text-content-muted text-center">Verifying invite…</p>
      )}

      {step === "error" && (
        <div className="text-center space-y-3">
          <p className="text-sm text-red-400">{error}</p>
          <a href="/login" className="text-xs text-gold hover:underline">Back to sign in</a>
        </div>
      )}

      {step === "done" && (
        <p className="text-sm text-content-muted text-center">Password set! Redirecting…</p>
      )}

      {step === "set-password" && (
        <form onSubmit={handleSetPassword} className="space-y-4">
          <div>
            <label className={labelClass}>New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className={labelClass}>Confirm Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gold hover:bg-gold/90 text-black text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Setting password…" : "Set Password"}
          </button>
        </form>
      )}
    </div>
  );
}
