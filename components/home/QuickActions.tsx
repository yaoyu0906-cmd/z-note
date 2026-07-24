"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";

export function QuickActions() {
  const router = useRouter();
  const openFolder = useWorkspaceStore((s) => s.openFolder);
  const isSupported = useWorkspaceStore((s) => s.isSupported);

  return (
    <div className="flex gap-2">
      <Button variant="primary" onClick={() => router.push("/note/new")}>
        Create New
      </Button>
      <Button
        variant="secondary"
        onClick={() => openFolder()}
        disabled={!isSupported}
        title={isSupported ? undefined : "File System Access requires Chrome or Edge"}
      >
        Load File
      </Button>
    </div>
  );
}
