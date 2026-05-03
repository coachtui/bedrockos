"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function ForgotPasswordPage() {
  const [email,     setEmail]     = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSubmitted(true);
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-bold text-content-primary">Reset Password</h1>
        <p className="text-sm text-content-muted mt-1">
          {submitted ? "Check your inbox" : "Enter your email to receive a reset link"}
        </p>
      </div>

      {submitted ? (
        <div className="space-y-4">
          <p className="text-sm text-content-secondary text-center leading-relaxed">
            We sent a password reset link to <span className="text-content-primary font-medium">{email}</span>.
            Check your email and follow the link to set a new password.
          </p>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-content-muted hover:text-content-primary transition-colors mt-4"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-gold hover:bg-gold/90 text-black text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Sending…" : "Send Reset Link"}
          </button>

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-content-muted hover:text-content-primary transition-colors"
          >
            <ArrowLeft size={14} />
            Back to sign in
          </Link>
        </form>
      )}
    </div>
  );
}
