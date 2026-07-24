import { FileTree } from "@/components/workspace/FileTree";
import { TagList } from "@/components/workspace/TagList";

export function WorkspaceSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Local folder</h2>
        <p className="text-xs text-graphite dark:text-graphiteDark mb-3">
          Notes live on disk in the folder you grant access to — Z-Note never
          uploads file contents unless you enable Supabase sync.
        </p>
        <FileTree />
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Tags</h2>
        <TagList />
      </div>
    </div>
  );
}
