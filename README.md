<div align="center">

# Z-Note

A modern, local-first note-taking workspace for the web.

*Fast · Simple · Private*

</div>

---

## Overview

Z-Note is an open-source note-taking application designed around a local-first workflow with optional cloud synchronization. It aims to provide a clean writing experience while supporting advanced workflows such as rich documents, Markdown, drawing, AI assistance, and real-time collaboration.

The project focuses on long-term maintainability, modular architecture, and a responsive user experience rather than feature overload.

---

## Features

### Document Types

- **Markdown** (`.md`)
- **Rich Notes** (`.note`)
- **Canvas** (`.canvas`)

### Rich Notes

Rich Notes support multiple content blocks, including:

- Rich text
- Markdown
- Checklists
- Tables
- Code blocks
- Images
- Drawings
- AI blocks
- Interactive Page blocks

### Workspace

- Folder-based workspace
- Favorites
- Recent notes
- Tags
- Multiple tabs
- Split editor

### AI

Supports multiple providers through user-supplied API keys.

Current design includes support for:

- OpenAI
- Anthropic Claude
- Google Gemini
- Future providers

AI capabilities are individually configurable and completely optional.

### Synchronization

- Local-first storage
- Optional Supabase synchronization
- Offline support (PWA)
- Planned real-time collaboration

---

## Project Goals

- Fast startup and navigation
- Minimal interface
- Modular architecture
- Offline-first workflow
- Optional cloud synchronization
- Extensible editor
- Cross-device compatibility

---

## Technology Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS

### Backend

- Python
- FastAPI *(planned)*

### Database & Services

- Supabase
- PostgreSQL
- Realtime
- Storage

---

## Project Structure

```text
app/
components/
hooks/
lib/
types/
styles/
public/
```

Additional directories will be introduced as the project expands.

---

## Roadmap

### User Interface

- [ ] Application shell
- [ ] Workspace tree
- [ ] Theme system
- [ ] Settings
- [ ] Command palette

### Editor

- [ ] Markdown editor
- [ ] Rich Note editor
- [ ] Canvas editor
- [ ] Page blocks

### AI

- [ ] AI chat
- [ ] Inline assistance
- [ ] Prompt actions
- [ ] Provider management

### Collaboration

- [ ] Real-time editing
- [ ] Real-time drawing
- [ ] Shared workspaces

### Platform

- [ ] Progressive Web App
- [ ] Offline mode
- [ ] Synchronization
- [ ] Keyboard shortcuts

---

## Development

Clone the repository.

```bash
git clone https://github.com/<username>/z-note.git
cd z-note
```

Install dependencies.

```bash
npm install
```

Run the development server.

```bash
npm run dev
```

---

## Contributing

Contributions, discussions, feature proposals, and bug reports are welcome.

Please open an issue before beginning work on major changes so implementation details can be discussed.

---

## License

This project is licensed under the MIT License.

---

<div align="center">

Z-Note is under active development.

</div>
