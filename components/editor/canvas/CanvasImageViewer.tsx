"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { ImageElement } from "@/lib/canvas/types";

interface CanvasImageViewerProps {
  element: ImageElement;
  onClose: () => void;
}

/** Fullscreen image viewer — opened from the properties panel's "View
 *  fullscreen" button or a middle-click on an image element. Closes on
 *  Escape or a click on the backdrop, matching how the rest of the app's
 *  overlays (dialogs, context menus) already dismiss. */
export function CanvasImageViewer({ element, onClose }: CanvasImageViewerProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-8"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 flex items-center justify-center h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20"
      >
        <X size={18} />
      </button>
      <img
        src={element.src}
        alt=""
        className="max-h-full max-w-full object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
