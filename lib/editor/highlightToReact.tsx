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

/** Textareas render an extra empty visual line when their value ends with
 *  "\n" (so there's somewhere to keep typing) — a <pre> with the exact
 *  same text content doesn't reliably do the same, even with identical
 *  CSS. That's a real, measurable height difference (one line-height),
 *  and it's what let the pre's scrollable range fall short of the
 *  textarea's, clamping short and drifting everything below it once
 *  scrolled near the bottom. A trailing zero-width space forces the pre
 *  to allocate that same trailing line box. */
export function trailingLineFiller(code: string): string {
  return code.endsWith("\n") ? "\u200B" : "";
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
