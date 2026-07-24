# Z-Note

Local-first markdown & rich-text notes editor. Zero-dollar infra, bring-your-own-key AI.

## Stack

- **Frontend:** Next.js 14 (App Router) + Tailwind → deploy to Vercel free tier
- **Auth + encrypted key storage + sync metadata:** Supabase free tier (Postgres + Auth)
- **Sync microservice:** Render free tier (not yet scaffolded — stub this once the core editor works; expect cold starts on the free plan)
- **Local files:** browser File System Access API (Chromium only: Chrome, Edge, Arc)
- **AI:** direct browser → OpenAI / Anthropic / Gemini, using the user's own decrypted key

## Setup

```bash
npm install
cp .env.example .env.local   # fill in Supabase URL + anon key
```

In the Supabase SQL editor, run `supabase/schema.sql` to create the `vaults`,
`api_keys`, and `notes_sync` tables with row-level security enabled (each
user can only ever touch their own rows).

```bash
npm run dev
```

## Security model (read this before shipping)

API keys are BYOK and are encrypted **in the browser** before they ever
reach Supabase:

1. Each user sets a **vault passphrase** — separate from their login
   password, never transmitted anywhere, never persisted outside memory.
2. `lib/crypto.ts` derives an AES-256-GCM key from that passphrase via
   PBKDF2 (250k iterations) + a random per-user salt (the salt itself is
   *not* secret and is stored in Supabase — that's normal for PBKDF2).
3. Provider keys (OpenAI/Anthropic/Gemini) are encrypted client-side and
   stored as ciphertext in the `api_keys` table.
4. On unlock, the passphrase re-derives the same AES key in-browser,
   decrypts the keys, and calls the AI provider **directly from the
   client** — the decrypted key never touches your backend.

This means a Supabase data breach alone does not expose plaintext keys —
the attacker would also need the user's vault passphrase, which your
servers never see. It does *not* protect against an XSS vulnerability in
your own frontend (a compromised page can read the key while it's live in
memory) — so keep third-party script surface area minimal, use a strict
CSP, and audit any dependency that touches the DOM near the editor.

**Anthropic's API blocks direct browser requests by default (CORS).**
`lib/ai/providers.ts` sends the `anthropic-dangerous-direct-browser-access`
header to get around this for now — the header name is a signal from
Anthropic that this pattern is meant for local/dev use. Before relying on
this in production, check Anthropic's current guidance; if they tighten
CORS enforcement you may need a thin proxy for Anthropic calls only
(OpenAI and Gemini currently allow browser calls without this workaround).

## Architecture v2: workspace shell, routing, and state

Everything below was added on top of the original BYOK scaffold without
touching its crypto/vault/AI-provider code — it just gives that code a
real app shell to live in, per `plan01.md`.

**Routing** — `app/(workspace)/` holds the whole app: `page.tsx` (Home),
`note/[id]/page.tsx`, `canvas/[id]/page.tsx`, `settings/page.tsx`, all
wrapped by `layout.tsx` which mounts `AppShell`. Each route resolves its
note from `useWorkspaceStore` (falling back to a draft note for `new`/
unknown ids) and syncs it into `useTabsStore` on mount.

**State (`lib/store/`, Zustand)** — four stores, each owning one concern:
`useWorkspaceStore` (notes, favorites, recent, folder access, quick
notes), `useTabsStore` (open tabs + split-pane state), `useSettingsStore`
(theme, AI feature flags, provider/model choice, shortcuts),
`useUIStore` (command palette / quick note popup / sidebar visibility).
Kept deliberately separate rather than one big store so each can grow
independently as features are added.

**Design system (`components/ui/`)** — `Button`, `IconButton`, `Input`,
`Kbd`, `Separator`, `Dialog`. The app shell, settings screens, and
overlays are all built from these rather than one-off Tailwind classes,
so a future visual pass only has to touch this folder.

**Split editor** — the primary pane is route-driven (so URLs/back-forward
work); the secondary pane reads directly from `useTabsStore` instead,
since two panes can't both own the URL with file-based routing. See the
comment in `components/layout/SplitPane.tsx` for the tradeoff and the
likely fix (a `?secondary=<id>` query param) if deep-linkable split views
become a requirement.

**`.note` rich-text and `.canvas`** — both are structural placeholders:
`components/editor/RichNoteEditor.tsx` renders the existing
`NoteDocument`/`NoteBlock` JSON schema with `contentEditable` blocks (no
real rich-text engine yet — swap in Lexical/TipTap here), and
`components/editor/CanvasEditor.tsx` fakes pan/zoom with CSS transforms
(no drawing engine yet). `components/editor/PageBlock.tsx` is further
along — it's a working Preview/Code/Split iframe sandbox for embedded
HTML/CSS/JS, wired to `Ctrl+\``.

**Not yet done:** real-time collaboration (offline-first merge is in the
vision doc but has no implementation here), drawing/pen input, the AI
chat panel's actual model call (the UI exists in `components/ai/`, it's
just not calling `lib/ai/providers.ts` yet), and Supabase Auth (still
`DEMO_USER_ID` in `lib/constants.ts`).

## What's scaffolded vs. what's not

**Done:**
- Encrypted BYOK key vault (`lib/crypto.ts`, `lib/apiKeys.ts`, `supabase/schema.sql`)
- Direct-to-provider AI client for all three providers (`lib/ai/providers.ts`)
- Debounced + cached ghost-text hook so keystroke-triggered suggestions don't burn through rate limits (`lib/ai/useGhostText.ts`)
- File System Access wrapper for `.md` / `.txt` / `.note` (`lib/fs/fileSystemAccess.ts`)
- Minimal dual-mode editor with ghost text + selection rewrite/expand/summarize (`components/Editor/MarkdownEditor.tsx`)
- Settings UI for vault unlock + key entry + model selection (`components/Settings/ApiKeySettings.tsx`)

**Not yet done (next steps):**
- Supabase Auth wiring (page.tsx uses a hardcoded `DEMO_USER_ID` — swap in `supabase.auth.getUser()`)
- Real markdown rendering in preview mode (swap the `<pre>` stub for `react-markdown` or similar)
- The Lexical/TipTap rich-text engine for `.note` files (the JSON schema is defined in `fileSystemAccess.ts` — `NoteDocument`/`NoteBlock` — but there's no editor UI for it yet)
- Cloud sync via the Render microservice (`notes_sync` table exists in the schema; no backend service yet)
- Contextual research assistant (background directory-context reader)
- A real markdown parser/linker for "suggest links between notes"

## On the monetization angle

If this becomes a paid product later, note that the current architecture
(BYOK, $0 AI infra cost) doesn't naturally support a subscription on AI
usage — you'd be charging for the editor/sync/UX, not for tokens. Worth
deciding early whether the business model is "free forever, BYOK" with a
paid tier for cloud sync/storage/collab, versus introducing an optional
hosted-key tier later (which would reintroduce real inference costs and
change the security model above). Flagging this now since it affects
which parts of this scaffold are worth hardening first.
