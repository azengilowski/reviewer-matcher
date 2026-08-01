# Reviewer–Paper Matching Web App — Specification

**Status:** Draft v0.1
**Owner:** Tyler
**Last updated:** 2026-07-29

A web app that matches academic reviewers to papers/proposals using a stable-marriage
(deferred-acceptance) algorithm, then lets an administrator inspect, understand, and hand-tune
the result through a drag-and-drop UI. It productizes the workflow originally run by hand via a
Python script (`paper_matcher.py`, since removed) plus a spreadsheet pass.

---

## 1. Goals & Non-Goals

### Goals
- Turn a one-off Python script + manual spreadsheet cleanup into a repeatable, self-serve tool.
- Produce a high-quality **initial** automated match honoring capacity and conflict constraints.
- Make the match **legible**: for every paper and every reviewer, show the ranked preference list and *why* the chosen pairing was made.
- Let an admin **override** any assignment via drag-and-drop, with live constraint validation.
- Report on **match quality** (load distribution, preference-rank satisfaction, outliers).

### Non-Goals (v1)
- **Single-user tool** — one operator provides inputs, runs matching, edits, and exports. No accounts, no auth, no collaboration or concurrent editing.
- No reviewer-facing login / bidding portal (admin drives everything).
- No email/notification delivery of assignments (export only).
- No multi-track or multi-conference management in one workspace (one match set at a time).
- No re-training of the embedding model; we use a fixed pretrained sentence encoder.

---

## 2. Reference Workload (design target)

Grounded in the AERA Div C 2b dataset in this repo:

| Quantity | Value |
|---|---|
| Papers / proposals | ~106 |
| Reviewers total | ~107 (50 grad students, 57 non-students) |
| Reviewers per paper (capacity) | 2–3 (configurable) |
| Papers per reviewer (load) | differs by role — e.g. 6 for grad students, higher/lower for professors |

The app must feel instant at this scale (~100×100). Since all compute is in-browser (§9),
very large sets (~1,000×1,000, ≈1M pairs) will be slower — embedding is the bottleneck — but
run in a Web Worker with progress so the UI stays responsive; optimizing beyond the ~100×100
target is out of scope for MVP.

---

## 3. Core Concepts & Terminology

- **Reviewer** — a person who reviews papers. Has an `id`, `name`, a **role** (grad student / professor / other), free-text **matching criteria** (specialties, methods, prior publications), and a **load** (max papers they can take).
- **Paper** — an item needing review. Has an `id`, `title`, **matching text** (abstract, keywords, method), **authors** (for conflict detection), and a **capacity** (number of reviewers it needs).
- **Preference list** — an ordered ranking of the other side, computed from text similarity. Papers rank reviewers; reviewers rank papers.
- **Conflict** — a (paper, reviewer) pair that must never be matched (e.g., reviewer is an author, or same institution — configurable).
- **Match / assignment** — a (paper ↔ reviewer) pairing in the final set.
- **Capacity** (paper side) vs **Load** (reviewer side) — the two hard constraints of the many-to-many match.

---

## 4. Matching Algorithm (port of `paper_matcher.py`)

The engine reproduces the existing script's behavior, generalized and made configurable.

### 4.1 Preference generation
1. **Build a text blob** per entity:
   - Paper: `title + abstract + keywords + method`.
   - Reviewer: `specialties + methods + prior publications`.
2. **Clean**: strip non-alphabetic characters, collapse whitespace, lowercase (mirrors `create_cleaned_row_string`).
3. **Embed** each blob with a sentence encoder — `all-MiniLM-L6-v2`, run **in the browser** via `transformers.js` (same model as the current script; see §9). Runs once per entity and is cached.
4. **Score**: cosine similarity between every paper embedding and every reviewer embedding.
5. **Rank**: for each paper, sort reviewers by descending similarity → paper's preference list. Symmetrically for each reviewer → reviewer's preference list.
6. **Apply conflicts**: remove conflicted reviewers from a paper's list before matching (current script filters a paper's own authors via `paper_author_map`).

> The similarity matrix is symmetric, but the two ranked lists are **not** — each side ranks the other independently. Both are needed for the stable match and for the explanation view.

### 4.2 The match (deferred acceptance, many-to-many)
A generalized Gale–Shapley / Hospital–Residents match (the script's `stableMarriage`):
- Each **reviewer (suitor)** proposes down their preference list until they reach their **load** or exhaust their list.
- Each **paper (suited)** provisionally holds its best proposers up to its **capacity**, rejecting the rest when a more-preferred proposer arrives (`Suited.reject`).
- Iterate rounds until no reviewer is unassigned-and-still-proposing.
- **Randomize** proposal order each round for fairness, seeded for reproducibility (`random.seed(42)`).
- A reviewer/paper with an empty preference list is dropped from the match.

**Result:** a stable assignment where no (paper, reviewer) pair both prefer each other over one of their current partners.

> **Who has the advantage — the proposing side.** Deferred acceptance is asymmetric: the side that *proposes* is **proposer-optimal** (each proposer gets the best partner it could have in *any* stable matching), and the side that *receives* is **receiver-pessimal** (each receiver gets its worst stable partner). Proposers walk down their own list from the top and settle only when rejected; receivers merely trade up as better proposers arrive. So the "Which side proposes" setting (§4.3, §5.3) is not cosmetic — it decides whether papers or reviewers get their top choices. Default is **paper-proposing** (papers advantaged). Note the current `paper_matcher.py` is the opposite: reviewers are the `Suitor`s, so it is reviewer-optimal today.

### 4.3 Configurable constraints (the "matching settings" screen)
- **Paper capacity** — global default = **2**, configurable on this page; overridable per paper.
- **Reviewer load by role** — e.g. grad student = 6, professor = 4 (or any per-role values); overridable per reviewer.
- **Single blended pool** — all reviewers (grad students and professors) are matched in **one** run, distinguished only by their per-role load. This replaces the script's separate student / non-student passes. Role remains a filter for reporting and for setting loads, not for splitting the match.
- **Conflict rules** — **self-authorship only** (a paper excludes its own authors, as the script does today via `paper_author_map`). Same-institution and uploaded-conflict-list exclusions are explicitly out of scope for v1.
- **Which side proposes** — a setting with two options, paper-proposing vs reviewer-proposing (determines who gets their top choices). Default: **paper-proposing** (papers are the scarce resource we most want well-served). Note this flips the current script, which is reviewer-proposing (reviewers are the `Suitor`s); the engine must support both directions.
- **Random seed** — exposed so a run is reproducible / re-runnable.

### 4.4 Outputs the engine must return (for the UI)
For every paper and every reviewer:
- Their full ranked preference list (with similarity score and rank index).
- Which candidates were **chosen**, and at what rank on *each* side ("you were this reviewer's #3; this reviewer was your #1").
- Why a higher-ranked candidate was **not** chosen (conflict / at-capacity / rejected in favor of a better proposer / not in the other side's list) — this powers the explanation panel and mirrors the columns in `report()`.

---

## 5. App Flow & Screens

### 5.1 Upload Reviewers
- Accept CSV / XLSX upload.
- **Column mapping step**: user maps uploaded columns → required fields (`id`, `name`, `role`, `criteria/specialties`, optional `institution`, optional `load override`). Remember mappings.
- Support the current data's shape: a criteria column may contain newline-separated specialties, methods, and publication text (see `20250812_ReviewersAll.csv`).
- Validate: unique ids, non-empty name, role recognized. Show a preview table with row-level warnings (e.g., "no criteria text → will get an empty preference list and be excluded").
- Optional secondary upload: an **id↔name** map and **role lists** (matching `ReviewersAllNameID.csv`, `ReviewersStudent.csv`).

### 5.2 Upload Papers
- Same uploader/mapping UX.
- Required: `id`, `title`; matching fields: `abstract`, `keywords`, `method`; conflict field: `authors` (name; institution parsed if present).
- Support the current paper CSV shape (`id, title, abstract, keywords, method, authors`).
- Validate uniqueness and flag papers with no matching text.

### 5.3 Matching Settings
- Set all constraints from §4.3 (paper capacity, per-role loads, eligible pools, conflict rules, proposing side, seed).
- Choose the embedding model (default `all-MiniLM-L6-v2`; pluggable).
- Live "feasibility" indicator: `Σ paper capacity` vs `Σ reviewer load` — warn if demand can't be met.

**Proposing-side control (surface the tradeoff, don't bury it).** The "Which side proposes" setting is a labeled two-option toggle whose UI teaches the consequence at the point of choice:
- Two options, each with a **plain-language advantage line**, not just a mechanism label:
  - **Papers propose** *(default)* → "Papers get their most-preferred reviewers; reviewers may get lower picks."
  - **Reviewers propose** → "Reviewers get their most-preferred papers; papers may get lower picks."
- An inline **help affordance** (info tooltip / expandable "Why does this matter?") gives the one-sentence explanation: *deferred acceptance advantages the proposing side — proposers get their best stable match, receivers their worst.*
- A **dynamic effect line** that restates the current choice in context, e.g. "With papers proposing, each paper is filled with the best reviewers it can stably get."
- Because it materially changes results, changing this after a match has run prompts a **re-run** (it can't be applied by editing; §5.4).
- _Follow-up (deferred):_ a dashboard comparison showing each side's mean preference-rank so the admin can *see* the advantage shift between the two settings. Add only if the toggle's plain-language guidance proves insufficient.

### 5.4 Run Initial Match
- Kick off the engine as a **background job** (embedding + similarity + deferred acceptance). Show progress; results stream in.
- Persist the run (settings snapshot + preferences + assignments) so it's re-openable and comparable across re-runs.

### 5.5 Drag-and-Drop Editing
- Board view: papers as columns (or reviewers as columns — toggle), assigned people as cards.
- Drag a reviewer card between papers, or onto/off the unassigned tray.
- **Live constraint validation** on every drop:
  - **Capacity / load breaches are allowed** — a drop that pushes a paper over capacity or a reviewer over their load goes through, but the affected card/column shows a persistent **warning indicator** (e.g., a badge like "7/6 — over load") that stays until resolved. Over-capacity/over-load counts also surface in the §5.6 dashboard.
  - Hard-block conflicts (self-authorship), with an override-with-reason escape hatch.
- Every manual change is recorded (who/what/when) and is **undoable**; auto-computed vs manually-overridden pairings are visually distinct.
- Show, on each card, the preference rank of that pairing so the admin sees the quality cost of a manual move.

### 5.6 Match Quality Dashboard
Statistics over the current assignment:
- **Load distribution**: papers-per-reviewer histogram; reviewers-per-paper histogram; under-/over-loaded and unfilled counts.
- **Preference satisfaction**: distribution of the rank at which each side got its match (e.g., "% of reviewers matched to a top-3 paper"); mean/median rank; count of "got #1".
- **Best / worst matches**: highest- and lowest-similarity pairings; unmatched papers and idle reviewers.
- **Coverage**: papers below required capacity; conflicts overridden.
- Compare **auto vs current (edited)** and compare across runs (e.g., load cap 4 vs 6, mirroring `results...cap4/cap6/cap8`).

### 5.7 Preference Detail View (per paper & per reviewer)
- For a **paper**: its ranked reviewer list, each row showing similarity score, whether conflicted, whether chosen, where *that reviewer* ranked this paper, and (if not chosen) the reason. This is the human-readable version of the `report()` output.
- For a **reviewer**: the symmetric view over papers.
- Clicking a chosen pairing highlights it on both sides ("chosen pair" callout).

### 5.8 Import / Resume an Existing Match
The app must be able to **re-open a match it previously produced** so an admin can keep editing across sessions or hand a file to a collaborator. Two import modes:

**A. Project file (lossless round-trip) — primary.**
- Import a single self-contained file (`.matchproj`, a JSON or zipped bundle) that the app also exports (see §6). It carries reviewers, papers, settings snapshot, both preference lists, all assignments, and the manual-override/audit log.
- On import the app is **fully restored**: drag-and-drop board, quality dashboard, and preference detail views all work immediately with **no re-run and no re-embedding** (embeddings are included, keyed by content hash so they can be reused or recomputed if inputs changed).
- This is the format the Export action produces by default, guaranteeing what you export is exactly what you can re-import.

**B. Assignments CSV (best-effort) — interop.**
- Import the human-friendly results CSV (papers as columns, reviewer names as rows — the `20250812results_*.csv` shape), including one that was hand-edited in a spreadsheet (mirrors the `...- Checks.csv` workflow).
- Because that file has only names, it is **matched back** to reviewers/papers by id-or-name against the currently loaded reviewer & paper sets. So this mode **requires the corresponding reviewer and paper uploads to be present** (re-upload if starting fresh).
- Resolution report before commit: exact matches, fuzzy/ambiguous name matches (admin confirms), and unresolvable rows (flagged, not silently dropped).
- Assignments load as **manual/authoritative**; preference ranks and detail views are rehydrated by recomputing preferences from the loaded reviewers/papers + settings. Capacity/load/conflict validation runs on import and flags any imported pairing that violates current constraints (e.g., a hand-edited file that over-loaded a reviewer) without auto-deleting it.

**Versioning:** the project file embeds a schema version; import validates it and migrates or warns on mismatch.

---

## 6. Data Model (sketch)

```
Reviewer(id, name, role, institution?, criteria_text, load_override?, embedding)
Paper(id, title, abstract, keywords, method, authors[], capacity_override?, embedding)
Conflict(paper_id, reviewer_id, reason)                 # derived + uploaded
Preference(subject_type, subject_id, target_id, rank, score)   # both directions
MatchRun(id, settings_json, seed, created_at, status)
Assignment(run_id, paper_id, reviewer_id, source[auto|manual], paper_rank, reviewer_rank, overridden_reason?)
```

- Persist embeddings and the preference table per run so the detail/dashboard views are instant and re-runs are comparable. Storage is **browser-local (IndexedDB)**; the `.matchproj` file is the portable save (no server DB — see §9).

### Import / Export formats
The Export and Import actions are **symmetric** — the primary export format is fully re-importable (§5.8).

- **Project file** (`.matchproj`, primary) — self-contained JSON/zip bundle: `{ schema_version, reviewers[], papers[], conflicts[], settings, seed, preferences[both directions], assignments[], audit_log[], embeddings(keyed by content hash) }`. Export writes it; Import restores the full app state with no re-run. This is the round-trip contract.
- **Assignments CSV** (interop) — the human-friendly `20250812results_*.csv` shape (papers as columns, reviewer names as rows). Exportable for spreadsheets/sharing and importable in best-effort mode (§5.8.B). Lossy: names only, no ranks/settings.
- **Per-paper report CSV** — the `report()`-style explanation export (export only).

---

## 7. Constraints & Edge Cases

- **Empty preference list** → entity excluded from matching; surfaced as a warning (mirrors script behavior).
- **Infeasible totals** (`Σ capacity` ≠ `Σ load`) → some papers under-filled or reviewers idle; dashboard must make this visible, not silent.
- **Manual over-assignment** → drag-drop may intentionally breach a paper's capacity or a reviewer's load; such pairings persist but carry a warning indicator (§5.5) and are counted on the dashboard. The auto-match never breaches; only manual edits can.
- **Ties** in similarity → stable, deterministic tiebreak (e.g., by id) so runs are reproducible.
- **Conflicts (self-authorship)** → never auto-assigned; manual override requires a reason and is flagged in exports.
- **Role loads** → the defining new constraint vs the script; must be first-class (per-role default + per-reviewer override). All roles compete in one blended match, so a professor and a grad student can be ranked against each other for the same paper.
- **Re-run after edits** → warn that a fresh auto-run discards manual overrides (or offer "re-run only unfilled slots").

---

## 8. Non-Functional Requirements

- **Performance:** interactive at ~100×100; match run for that size completes in seconds. Background job + progress for larger sets.
- **Reproducibility:** same inputs + seed → same match.
- **Persistence:** runs, edits, and mappings survive reload; nothing lives only in browser state.
- **Auditability:** every manual override recorded (timestamped) and reversible.
- **Privacy:** all computation is client-side; **no paper text or reviewer PII ever leaves the browser.** The only network request is the one-time model download (static asset). This is a selling point to state plainly in the UI for non-technical users handling unpublished submissions.
- **Zero-install:** the entire "setup" is opening a URL; no runtime, package manager, server, or account. Works offline after first load.

---

## 9. Architecture & Tech Stack

**Hard constraint: zero-install for a non-technical user, hostable on GitHub.** This rules out any server/backend. The app is a **fully client-side, static single-page app** — all computation runs in the browser; there is no backend to deploy, no database to run, nothing to install.

- **Distribution:** static build deployed to **GitHub Pages**, shipped as an **installable PWA**. The user's entire "setup" is opening a URL; they may optionally "install" it. A service worker caches the app shell + model so it **works offline after the first visit** and can be launched like a local app. (No air-gapped/desktop build in scope — first visit needs internet to fetch the app and model once.)
- **Frontend:** React + TypeScript; drag-and-drop via `dnd-kit`; charts via a lightweight lib (Recharts/visx). Built to static assets (Vite).
- **Matching engine:** the deferred-acceptance algorithm from `paper_matcher.py` **ported to TypeScript** and run in a Web Worker (keeps the UI responsive). Seeded PRNG (e.g. `seedrandom`) replaces Python's `random.seed(42)` for reproducibility.
- **Embeddings (in browser):** `transformers.js` running the same `all-MiniLM-L6-v2` model as ONNX/WASM. Model (~23 MB quantized) downloads once on first use with a visible progress bar, then is cached (IndexedDB/Cache API) and works offline. No text ever leaves the device.
- **Storage & persistence:** browser-local — **IndexedDB** for the working match set + cached model + embeddings; the `.matchproj` file (§6) is the portable save/backup and the way to move a match between machines. No server database.
- **Jobs:** the match run and embedding are just async work in a Web Worker with a progress UI — no task queue, no server.

**Non-technical-user guardrails (MVP-critical):**
- Forgiving CSV/XLSX import: tolerate BOMs, newline-embedded cells, quoted fields, and inconsistent columns (the real data in this repo has all of these); always show a preview + plain-language warnings before committing (§5.1–5.2).
- Every failure state is a human sentence, not a stack trace ("Row 14 has no id — it will be skipped").
- One clear primary action per screen; the happy path is Upload → Upload → Run → (tweak) → Export.
- A visible, one-time "Downloading matching model…" state so first load never looks broken.

---

## 9a. MVP Scope

**In (first shippable slice):**
- Upload reviewers + papers (CSV/XLSX) with column mapping, preview, forgiving parse.
- Matching settings: paper capacity (default 2), per-role reviewer loads, proposing side, seed.
- Run match in-browser (transformers.js embeddings + ported deferred acceptance) with progress.
- Drag-and-drop editing with live constraint validation and over-cap warning indicators.
- Preference detail view per paper & per reviewer (ranked list + chosen pair + reason).
- Basic quality dashboard: load distribution, preference-rank satisfaction, unfilled/idle, best/worst.
- Export + import the `.matchproj` round-trip file; export the results CSV.
- PWA install + offline-after-first-visit; browser-local persistence.

**Deferred (post-MVP):**
- Best-effort import of hand-edited results CSV (§5.8.B) — the `.matchproj` round-trip covers the core need first.
- Per-paper capacity overrides and per-reviewer load overrides (start with global + per-role only).
- Dashboard proposing-side comparison view (§5.3 follow-up).
- Pluggable/alternate embedding models; run comparison across runs (cap4/cap6/cap8 style).
- Same-institution or uploaded conflict lists.

## 10. Decisions & Open Questions

### Decided
- **Reviewer pools** — ✅ **One blended pool.** All roles matched in a single run, differentiated only by per-role load (§4.3).
- **Conflict scope** — ✅ **Self-authorship only** for v1; same-institution / uploaded lists are out of scope (§4.3, §7).
- **User model** — ✅ **Single user, single writer.** One person provides inputs, runs matching, edits, and exports. No auth, no collaboration, no concurrent editing in scope. Concurrency handling is an explicit non-goal (§1). The audit log still stamps a timestamp per change so history is intact if accounts are ever added.
- **Architecture** — ✅ **Fully client-side static app, no backend.** Deployed to **GitHub Pages** as an **installable PWA** (offline after first visit). Zero-install for non-technical users (§9).
- **Match engine** — ✅ **In-browser embeddings via `transformers.js`** (`all-MiniLM-L6-v2`), preserving the current script's match quality; deferred-acceptance ported to TypeScript in a Web Worker (§9).
- **Paper capacity** — ✅ default **2**, configurable on the match settings page, overridable per paper (§4.3, §5.3).
- **Proposing side** — ✅ default **paper-proposing**, with a setting to switch to reviewer-proposing; engine supports both (§4.3).
- **Manual override vs load cap** — ✅ overrides **may breach** capacity/load and go through, with a persistent **warning indicator** on the affected card + a dashboard count (§5.5, §7).
- **Deliverable** — ✅ **Markdown** (`SPEC.md`) is the source of truth.

### Still open
_None — all major product decisions resolved. Remaining work is implementation._
