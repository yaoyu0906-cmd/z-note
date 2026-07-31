"use client";

import { useWorkspaceStore } from "@/lib/store/useWorkspaceStore";
import { flattenFolderPaths } from "@/lib/fs/fileSystemAccess";

interface MoveDestinationListProps {
  /** Excludes this workspace's own path (and anything nested under it) from
   *  the list — used when moving a folder, so it can't be dropped into
   *  itself or one of its own descendants. */
  excludeWorkspaceId?: string;
  excludePath?: string;
  onSelect: (workspaceId: string, folderPath: string) => void;
}

export function MoveDestinationList({ excludeWorkspaceId, excludePath, onSelect }: MoveDestinationListProps) {
  const workspaces = useWorkspaceStore((s) => s.workspaces);

  return (
    <div className="max-h-52 overflow-y-auto">
      {workspaces.map((ws) => {
        const paths = ws.folderTree ? flattenFolderPaths(ws.folderTree) : [""];
        const visible = paths.filter(
          (p) => !(excludeWorkspaceId === ws.id && (p === excludePath || p.startsWith(`${excludePath}/`)))
        );
        if (visible.length === 0) return null;
        return (
          <div key={ws.id}>
            <p className="px-3 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wide text-graphite dark:text-graphiteDark truncate">
              {ws.name}
            </p>
            {visible.map((p) => (
              <button
                key={p || "__root__"}
                onClick={() => onSelect(ws.id, p)}
                className="w-full text-left px-3 py-1 text-xs text-ink dark:text-inkDark hover:bg-accentSoft dark:hover:bg-accentSoftDark truncate"
              >
                {p || "(root)"}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
