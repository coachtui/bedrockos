import "server-only";

type SupabaseMaybeError = {
  message?: string;
  code?: string;
  details?: string;
  hint?: string;
};

export function describeSupabaseError(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === "object") {
    const candidate = error as SupabaseMaybeError;
    return [
      candidate.message,
      candidate.code ? `code=${candidate.code}` : undefined,
      candidate.details ? `details=${candidate.details}` : undefined,
      candidate.hint ? `hint=${candidate.hint}` : undefined,
    ]
      .filter(Boolean)
      .join(" ");
  }
  return String(error);
}

export function logSupabaseReadFailure(operation: string, error: unknown): void {
  console.error(`[supabase:read] ${operation} failed: ${describeSupabaseError(error)}`);
}

export function throwSupabaseWriteFailure(operation: string, error: unknown): never {
  throw new Error(`[supabase:write] ${operation} failed: ${describeSupabaseError(error)}`);
}
