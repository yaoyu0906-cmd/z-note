import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { PageBlockView } from "@/components/editor/PageBlockView";

export const PageBlockNode = Node.create({
  name: "pageBlock",
  group: "block",
  atom: true, // treated as a single unit for cursor movement / selection
  selectable: true,

  addAttributes() {
    return {
      html: { default: "" },
      title: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="page-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "page-block" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageBlockView);
  },
});
