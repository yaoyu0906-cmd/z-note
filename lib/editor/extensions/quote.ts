import { Node, mergeAttributes } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { ReactNodeViewRenderer } from "@tiptap/react";
import { QuoteView } from "@/components/editor/QuoteView";

export const DEFAULT_QUOTE_COLOR = "#2F5D50"; // matches the app's `accent` token

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    quote: {
      toggleQuote: () => ReturnType;
      setQuoteColor: (color: string) => ReturnType;
    };
  }
}

/** Speaker/attribution line — always the (optional) last child of a quote. */
export const QuoteSpeaker = Node.create({
  name: "speaker",
  content: "inline*",
  selectable: false,

  parseHTML() {
    return [{ tag: "footer.quote-speaker" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["footer", mergeAttributes(HTMLAttributes, { class: "quote-speaker" }), 0];
  },
});

export const Quote = Node.create({
  name: "quote",
  group: "block",
  content: "paragraph speaker?",
  defining: true,

  addAttributes() {
    return {
      color: { default: DEFAULT_QUOTE_COLOR },
    };
  },

  parseHTML() {
    return [{ tag: "blockquote" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      "blockquote",
      mergeAttributes(HTMLAttributes, { style: `border-left-color: ${node.attrs.color}` }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(QuoteView);
  },

  addCommands() {
    return {
      toggleQuote:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
      setQuoteColor:
        (color: string) =>
        ({ commands }) =>
          commands.updateAttributes(this.name, { color }),
    };
  },

  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const { editor } = this;
        const { state, view } = editor;
        const { $from } = state.selection;

        let quoteDepth = -1;
        for (let d = $from.depth; d > 0; d--) {
          if ($from.node(d).type.name === this.name) {
            quoteDepth = d;
            break;
          }
        }
        if (quoteDepth === -1) return false;

        const quoteNode = $from.node(quoteDepth);
        const currentNode = $from.node($from.depth);

        if (currentNode.type.name === "paragraph") {
          const hasSpeaker = quoteNode.childCount > 1;
          if (hasSpeaker) {
            // Move into the existing speaker field instead of adding another.
            const paragraphEnd = $from.after($from.depth);
            const tr = state.tr.setSelection(TextSelection.create(state.doc, paragraphEnd + 1));
            view.dispatch(tr);
            return true;
          }

          const insertPos = $from.after($from.depth);
          const speakerType = editor.schema.nodes.speaker;
          const tr = state.tr.insert(insertPos, speakerType.create());
          tr.setSelection(TextSelection.create(tr.doc, insertPos + 1));
          view.dispatch(tr);
          return true;
        }

        if (currentNode.type.name === "speaker") {
          const quoteEnd = $from.after(quoteDepth);
          const paragraphType = editor.schema.nodes.paragraph;
          const tr = state.tr.insert(quoteEnd, paragraphType.create());
          tr.setSelection(TextSelection.create(tr.doc, quoteEnd + 1));
          view.dispatch(tr);
          return true;
        }

        return false;
      },
    };
  },
});
