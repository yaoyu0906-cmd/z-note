"use client";

import { useEffect, useState } from "react";
import { Dialog, Input, Button } from "@/components/ui";

interface LinkDialogProps {
  open: boolean;
  onClose: () => void;
  initialHref?: string;
  initialText?: string;
  onSubmit: (values: { href: string; text: string }) => void;
  onRemove: () => void;
  isEditingExisting: boolean;
}

export function LinkDialog({
  open,
  onClose,
  initialHref = "",
  initialText = "",
  onSubmit,
  onRemove,
  isEditingExisting,
}: LinkDialogProps) {
  const [href, setHref] = useState(initialHref);
  const [text, setText] = useState(initialText);

  // Re-sync whenever the dialog is (re)opened for a different link/selection.
  useEffect(() => {
    if (open) {
      setHref(initialHref);
      setText(initialText);
    }
  }, [open, initialHref, initialText]);

  function submit() {
    if (!href.trim()) return;
    onSubmit({ href: href.trim(), text: text.trim() });
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} placement="top">
      <div className="p-3 space-y-2.5">
        <div>
          <label className="text-xs text-graphite dark:text-graphiteDark">Link text</label>
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Text to display"
          />
        </div>
        <div>
          <label className="text-xs text-graphite dark:text-graphiteDark">URL</label>
          <Input
            value={href}
            onChange={(e) => setHref(e.target.value)}
            placeholder="https://example.com"
            onKeyDown={(e) => e.key === "Enter" && submit()}
            autoFocus
          />
        </div>
        <div className="flex justify-between pt-1">
          {isEditingExisting ? (
            <Button size="sm" variant="danger" onClick={() => (onRemove(), onClose())}>
              Remove link
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" variant="primary" onClick={submit}>
            {isEditingExisting ? "Update" : "Add link"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
