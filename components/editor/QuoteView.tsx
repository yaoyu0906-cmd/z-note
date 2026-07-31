"use client";

import { useState } from "react";
import { NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { Palette } from "lucide-react";
import { IconButton } from "@/components/ui";
import { ColorPicker } from "@/components/editor/ColorPicker";

export function QuoteView({ node, updateAttributes }: NodeViewProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const color = (node.attrs.color as string) || "#2F5D50";

  return (
    <NodeViewWrapper className="relative group my-3">
      <div
        contentEditable={false}
        className="absolute -left-9 top-0 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <IconButton label="Quote accent color" onClick={() => setPickerOpen(true)}>
          <Palette size={14} style={{ color }} />
        </IconButton>
      </div>

      <blockquote
        className="not-prose border-l-4 pl-4 py-1 italic text-ink dark:text-inkDark"
        style={{ borderLeftColor: color }}
      >
        <NodeViewContent />
      </blockquote>

      <ColorPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        currentColor={color}
        onSelect={(hex) => updateAttributes({ color: hex })}
        onClear={() => updateAttributes({ color: "#2F5D50" })}
      />
    </NodeViewWrapper>
  );
}
