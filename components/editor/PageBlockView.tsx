"use client";

import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { PageBlock } from "@/components/editor/PageBlock";

export function PageBlockView({ node, updateAttributes, deleteNode }: NodeViewProps) {
  return (
    <NodeViewWrapper className="not-prose my-3" contentEditable={false}>
      <PageBlock
        value={(node.attrs.html as string) || ""}
        onChange={(html) => updateAttributes({ html })}
        title={(node.attrs.title as string) || ""}
        onTitleChange={(title) => updateAttributes({ title })}
        onDelete={deleteNode}
      />
    </NodeViewWrapper>
  );
}
