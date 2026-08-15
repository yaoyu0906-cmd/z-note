"use client";

import { Cloud, HardDrive, Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui";

interface SyncDeleteDialogProps {
  open: boolean;
  name: string;
  onClose: () => void;
  onDelete: (target: "local" | "cloud" | "both") => void;
}

/** Shown instead of the normal inline "click again to delete" confirm
 *  whenever the item being deleted is synced — deleting a synced item is
 *  ambiguous (local copy, cloud copy, or both?) in a way a single click
 *  can't express. */
export function SyncDeleteDialog({ open, name, onClose, onDelete }: SyncDeleteDialogProps) {
  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-4 space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-ink dark:text-inkDark">Delete “{name}”?</h2>
          <p className="text-xs text-graphite dark:text-graphiteDark mt-1">
            This item is synced to the cloud. Choose what to delete.
          </p>
        </div>
        <div className="space-y-1.5">
          <Button
            variant="danger"
            className="w-full justify-start"
            onClick={() => onDelete("local")}
          >
            <HardDrive size={14} /> Local copy only
          </Button>
          <Button
            variant="danger"
            className="w-full justify-start"
            onClick={() => onDelete("cloud")}
          >
            <Cloud size={14} /> Cloud copy only
          </Button>
          <Button
            variant="danger"
            className="w-full justify-start"
            onClick={() => onDelete("both")}
          >
            <Trash2 size={14} /> Both
          </Button>
        </div>
        <div className="flex justify-end pt-1">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
