"use client";

import { Save, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui";

interface UnsavedChangesDialogProps {
  open: boolean;
  name: string;
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}

/** Z-Note's own confirmation for closing a tab with unsaved changes —
 *  distinct from the browser's native beforeunload prompt (used for
 *  closing/reloading the whole page), which can't be customized like this. */
export function UnsavedChangesDialog({ open, name, saving, onSave, onDiscard, onCancel }: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <div className="p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-ink dark:text-inkDark">Save changes to “{name}”?</h2>
          <p className="text-xs text-graphite dark:text-graphiteDark mt-1">
            This tab has unsaved changes that will be lost if you don't save them.
          </p>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={onDiscard} disabled={saving}>
            <Trash2 size={13} /> Discard
          </Button>
          <Button variant="primary" size="sm" onClick={onSave} disabled={saving}>
            <Save size={13} /> {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
