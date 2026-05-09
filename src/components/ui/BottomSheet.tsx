"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface BottomSheetProps {
  open:     boolean;
  onClose:  () => void;
  /** Optional title rendered in the sheet header. Omit to render no header. */
  title?:   string;
  children: React.ReactNode;
  /** Tailwind max-width class applied at md+ (centered modal). Default `md:max-w-md`. */
  desktopWidthClass?: string;
}

/**
 * Native-feel modal:
 *  - Slides up from the bottom on mobile (<md) with a drag handle
 *  - Centered card on md+
 *  - Backdrop + Escape dismissal, body scroll lock, focus on first focusable
 *  - Safe-area padding for iOS home indicator
 */
export function BottomSheet({
  open,
  onClose,
  title,
  children,
  desktopWidthClass = "md:max-w-md",
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      // Defer to next frame so the enter transition runs from the closed state.
      const id = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(id);
    }
    setVisible(false);
    const t = setTimeout(() => setMounted(false), 250);
    return () => clearTimeout(t);
  }, [open]);

  // Body scroll lock
  useEffect(() => {
    if (!mounted) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [mounted]);

  // Escape to close
  useEffect(() => {
    if (!mounted) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [mounted, onClose]);

  if (!mounted) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex md:items-center md:justify-center"
    >
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Sheet */}
      <div
        className={`
          relative mt-auto w-full ${desktopWidthClass}
          bg-surface-base border-t border-surface-border md:border
          rounded-t-2xl md:rounded-[var(--radius-card)]
          shadow-2xl
          flex flex-col
          max-h-[92vh] md:max-h-[85vh]
          md:mt-0
          pb-safe
          transition-all duration-250 ease-out
          ${visible
            ? "translate-y-0 opacity-100 md:scale-100"
            : "translate-y-full opacity-0 md:translate-y-0 md:scale-95"}
        `}
      >
        {/* Drag handle (mobile only — pure visual affordance) */}
        <div className="md:hidden pt-2 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 rounded-full bg-surface-border-hover" />
        </div>

        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-5 py-3 md:py-4 border-b border-surface-border shrink-0">
            <h2 className="text-base md:text-sm font-semibold text-content-primary">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-mr-2 p-2 min-h-11 min-w-11 flex items-center justify-center text-content-muted hover:text-content-primary active:bg-surface-overlay/60 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Body — scrollable, contained overscroll so it doesn't bleed to page */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ overscrollBehavior: "contain", WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
