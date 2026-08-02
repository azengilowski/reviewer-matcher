# Peerfect Match

A client-side web app that matches academic reviewers to papers/proposals using a
stable-marriage (deferred-acceptance) algorithm, then lets you inspect, understand,
and hand-tune the result with a drag-and-drop board.

**Everything runs in your browser.** Reviewer and paper data never leave your device —
the only network request is a one-time download of the embedding model, which is then
cached for offline use.

## Features

- **Import** reviewers and papers from CSV or Excel, with column mapping, an editable
  preview, and duplicate-id detection — or add, edit, and remove individual entries
  right in the app.
- **Match** with in-browser semantic embeddings (`all-MiniLM-L6-v2` via transformers.js)
  and a many-to-many deferred-acceptance engine, with configurable capacities, per-role
  loads, proposing side, and conflict rules (self-authorship and, optionally,
  same-institution).
- **Tune** via a drag-and-drop board: add/remove/move reviewers (mouse, touch, or
  keyboard), lock finalized papers, search, sort, and filter — with live constraint
  checks, undo/redo (incl. Cmd/Ctrl+Z), and an audit log.
- **Understand**: a match-quality dashboard with an actionable "Needs attention" panel,
  a per-reviewer workload view, and per-paper / per-reviewer ranked preference lists
  with the reason each pairing was or wasn't chosen. A configurable weak-match
  threshold controls what gets flagged.
- **Save/restore** a self-contained `.matchproj` project file (drag-and-drop supported);
  export results and per-paper report CSVs.
- Installable **PWA** — works offline after first load, and asks before applying updates.

## Run locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit/component tests
npm run build    # production build to dist/
```

## Data & privacy

This repository contains **only synthetic sample data** (`public/sample/`) used by the
"Load sample data" button. No real reviewer, paper, or match data is included, and none is
sent anywhere at runtime.

## Deploy

Builds to static assets with a relative base path, so it works from any subpath on GitHub
Pages. The included GitHub Actions workflow (`.github/workflows/deploy.yml`) builds and
deploys to Pages on push to `main` (set the repository's Pages source to "GitHub Actions").

## Tech

Vite · React · TypeScript · transformers.js · dnd-kit · Vitest · vite-plugin-pwa.

## License

[MIT](LICENSE) © azengilowski
