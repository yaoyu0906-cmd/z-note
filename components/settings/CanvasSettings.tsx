"use client";

import { useSettingsStore } from "@/lib/store/useSettingsStore";
import { ShortcutList } from "@/components/settings/ShortcutList";

export function CanvasSettings() {
  const canvasSettings = useSettingsStore((s) => s.canvasSettings);
  const setCanvasSetting = useSettingsStore((s) => s.setCanvasSetting);
  const canvasShortcuts = useSettingsStore((s) => s.canvasShortcuts);
  const setCanvasShortcut = useSettingsStore((s) => s.setCanvasShortcut);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Canvas behavior</h2>
        <p className="text-xs text-graphite dark:text-graphiteDark mb-3">
          Tune how drawing and navigation feel on the Canvas.
        </p>
        <div className="space-y-3">
          <label className="flex items-center justify-between text-sm">
            <span className="text-ink dark:text-inkDark">Change to Move after using tools</span>
            <input
              type="checkbox"
              checked={canvasSettings.switchToMoveAfterTool}
              onChange={(e) => setCanvasSetting("switchToMoveAfterTool", e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
          </label>

          <label className="flex items-center justify-between text-sm">
            <span className="text-ink dark:text-inkDark">Arrow-key pan</span>
            <input
              type="checkbox"
              checked={canvasSettings.arrowKeyPanEnabled}
              onChange={(e) => setCanvasSetting("arrowKeyPanEnabled", e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
          </label>

          <div className="flex items-center justify-between text-sm">
            <span className={canvasSettings.arrowKeyPanEnabled ? "text-ink dark:text-inkDark" : "text-graphite dark:text-graphiteDark"}>
              Pan amount (px)
            </span>
            <input
              type="number"
              min={4}
              max={400}
              disabled={!canvasSettings.arrowKeyPanEnabled}
              value={canvasSettings.panAmount}
              onChange={(e) => setCanvasSetting("panAmount", Math.max(4, Math.min(400, Number(e.target.value) || 0)))}
              className="w-20 h-7 rounded border border-line dark:border-lineDark bg-transparent px-2 text-sm text-ink dark:text-inkDark disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-ink dark:text-inkDark mb-1">Canvas keybinds</h2>
        <p className="text-xs text-graphite dark:text-graphiteDark mb-3">
          Tool and action shortcuts, active whenever a Canvas is focused.
        </p>
        <ShortcutList bindings={canvasShortcuts} onChange={setCanvasShortcut} />
      </div>
    </div>
  );
}
