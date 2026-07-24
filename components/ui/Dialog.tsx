"use client";

import { useEffect, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Position near the top like a command palette, vs. centered like a normal modal. */
  placement?: "top" | "center";
}

export function Dialog({ open, onClose, children, placement = "center" }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/20 ${
        placement === "top" ? "items-start pt-24" : "items-center"
      }`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-lg border border-line bg-white shadow-lg"
      >
        {children}
      </div>
    </div>
  );
}
