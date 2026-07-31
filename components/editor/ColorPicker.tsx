"use client";

import { useState } from "react";
import { Dialog, Button } from "@/components/ui";
import { CATPPUCCIN_MOCHA_COLORS } from "@/lib/editor/catppuccinMocha";

interface ColorPickerProps {
  open: boolean;
  onClose: () => void;
  currentColor?: string | null;
  onSelect: (hex: string) => void;
  onClear: () => void;
}

export function ColorPicker({ open, onClose, currentColor, onSelect, onClear }: ColorPickerProps) {
  const [customColor, setCustomColor] = useState(currentColor || "#89b4fa");

  return (
    <Dialog open={open} onClose={onClose} placement="top">
      <div className="p-3 space-y-3">
        <div>
          <p className="text-xs font-semibold text-graphite dark:text-graphiteDark mb-2">
            Catppuccin Mocha
          </p>
          <div className="grid grid-cols-7 gap-2">
            {CATPPUCCIN_MOCHA_COLORS.map((c) => (
              <button
                key={c.hex}
                title={c.name}
                onClick={() => {
                  onSelect(c.hex);
                  onClose();
                }}
                className={`h-7 w-7 rounded-full border transition-transform hover:scale-110 ${
                  currentColor === c.hex
                    ? "border-ink dark:border-inkDark ring-2 ring-offset-2 ring-offset-white dark:ring-offset-surfaceDark ring-ink dark:ring-inkDark"
                    : "border-line dark:border-lineDark"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-line dark:border-lineDark">
          <label className="flex items-center gap-2 text-xs text-graphite dark:text-graphiteDark">
            Custom
            <input
              type="color"
              value={customColor}
              onChange={(e) => setCustomColor(e.target.value)}
              className="h-7 w-10 rounded border border-line dark:border-lineDark bg-transparent cursor-pointer"
            />
          </label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                onClear();
                onClose();
              }}
            >
              Default
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                onSelect(customColor);
                onClose();
              }}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}
