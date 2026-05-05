export const ENABLE_MOCK_FALLBACK =
  process.env.NEXT_PUBLIC_ENABLE_MOCK_FALLBACK === "true";

export function warnMockFallback(scope: string, reason: string): void {
  if (process.env.NODE_ENV === "production") return;
  console.warn(
    `[data-source] Using mock fallback for ${scope}: ${reason}. ` +
      "Set NEXT_PUBLIC_ENABLE_MOCK_FALLBACK=false or unset it to disable this fallback.",
  );
}
