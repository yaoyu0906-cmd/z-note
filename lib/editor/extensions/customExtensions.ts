import { Extension, Mark, mergeAttributes } from "@tiptap/core";

/**
 * Inline font-size mark. Unlike the H1/H2/H3 heading buttons (which are
 * block-level and always affect the whole paragraph), this only ever
 * touches the current selection — the correct behavior for a "change
 * text size" control.
 */
export interface FontSizeOptions {
  types: string[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType;
      unsetFontSize: () => ReturnType;
    };
  }
}

export const FontSize = Mark.create<FontSizeOptions>({
  name: "fontSize",

  addOptions() {
    return { types: ["textStyle"] };
  },

  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => {
          if (!attributes.fontSize) return {};
          return { style: `font-size: ${attributes.fontSize}` };
        },
      },
    };
  },

  parseHTML() {
    return [{ style: "font-size" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setFontSize:
        (size: string) =>
        ({ chain }) =>
          chain().setMark(this.name, { fontSize: size }).run(),
      unsetFontSize:
        () =>
        ({ chain }) =>
          chain().unsetMark(this.name).run(),
    };
  },
});

/** Tab inserts 4 spaces instead of moving focus out of the editor. */
export const TabIndent = Extension.create({
  name: "tabIndent",

  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        editor.commands.insertContent("    ");
        return true;
      },
      "Shift-Tab": ({ editor }) => {
        const { $from } = editor.state.selection;
        const textBefore = $from.nodeBefore?.text ?? "";
        const trailingSpaces = textBefore.match(/ {1,4}$/)?.[0].length ?? 0;
        if (trailingSpaces > 0) {
          editor.commands.deleteRange({ from: $from.pos - trailingSpaces, to: $from.pos });
        }
        return true;
      },
    };
  },
});
