import { Fragment, createElement, type ReactNode } from "react";
import { lowlight } from "@/lib/editor/extensions/codeBlock";

// Minimal shape of the hast nodes lowlight produces — avoids pulling in
// the full `hast` type package for three fields.
interface HastNode {
  type: "element" | "text";
  tagName?: string;
  properties?: { className?: string[] };
  children?: HastNode[];
  value?: string;
}

function renderNode(node: HastNode, key: number): ReactNode {
  if (node.type === "text") return node.value;
  const className = node.properties?.className?.join(" ");
  return createElement(
    node.tagName || "span",
    { key, className },
    node.children?.map((child, i) => renderNode(child, i))
  );
}

/** Highlights `code` as `language` and returns React nodes ready to render
 *  inside a <pre><code>. Falls back to plain text if the language/content
 *  can't be highlighted (e.g. malformed markup mid-edit). */
export function highlightToReact(code: string, language: string): ReactNode {
  try {
    const tree = lowlight.highlight(language, code) as unknown as { children: HastNode[] };
    return createElement(Fragment, null, tree.children.map((child, i) => renderNode(child, i)));
  } catch {
    return code;
  }
}
