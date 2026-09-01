"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/Button";
import type { ButtonVariant } from "@/components/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for destructive actions (deactivate, etc.) — anything
   *  else uses the neutral primary treatment. */
  variant?: Extract<ButtonVariant, "danger" | "primary">;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Controlled, async replacement for window.confirm(). The caller
 * owns the `open` state and supplies onConfirm/onCancel — this
 * component only renders the dialog and handles its own keyboard/
 * focus behavior. Call sites that used to do
 * `if (!window.confirm(...)) return;` now open this dialog and move
 * the guarded logic into onConfirm instead — see the two migrated
 * call sites (instructor deactivation, class completion) for the
 * exact adaptation.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Capture whatever triggered the dialog so focus can return there
  // on close, and move focus into the dialog itself.
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => {
      openerRef.current?.focus();
    };
  }, [open]);

  // Escape cancels; Tab is trapped within the dialog while open —
  // same shape as AdminShell's mobile drawer.
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>("button");
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button aria-label="Cancel" onClick={onCancel} className="absolute inset-0 bg-ink-950/40 motion-reduce:transition-none" />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-description" : undefined}
        className="relative w-full max-w-sm rounded-xl2 border border-ink-900/10 bg-white p-5 shadow-xl motion-reduce:transition-none"
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-ink-900">
          {title}
        </h2>
        {description && (
          <p id="confirm-dialog-description" className="mt-2 text-sm text-ink-700">
            {description}
          </p>
        )}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={variant} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
