# Implementation Plan — Reviewer–Paper Matching App

**Companion to:** [`SPEC.md`](SPEC.md)
**Status:** Draft v0.1 · 2026-07-29

Builds **everything** in the spec. Sequenced so that **after every stage the tool is runnable and visibly demonstrates its current functionality**, and **tests ship with each stage** (never a separate "testing phase").

---

## Guiding principles

1. **Vertical slices, not horizontal layers.** Each stage delivers a thin end-to-end thread a human can click through, then later stages deepen it. There is always a working app.
2. **Deploy every stage.** Each stage ends with a green CI build published to GitHub Pages, so "see it working" is a live URL, not a local-only claim. This also de-risks the zero-install hosting story from day one.
3. **Riskiest-first.** The matching engine (correctness-critical, and verifiable against the Python outputs in this repo) is built and tested before any UI depends on it.
4. **Interfaces defer heavy pieces.** `SimilarityProvider`, `Storage`, and `EmbeddingModel` are seams. A stub similarity lets the full app thread run before real in-browser embeddings exist; swapping the real one in is a later stage, not a rewrite.
5. **Tests as acceptance criteria.** Every stage's "Done" includes its tests passing. Test type is matched to the work (unit for logic, component for UI, e2e for flows).

---

## Tooling & test strategy

- **Stack:** Vite + React + TypeScript (per SPEC §9). `dnd-kit`, Recharts/visx, `transformers.js`, `seedrandom`, a CSV/XLSX parser (`papaparse` + `xlsx`).
- **Unit/integration:** Vitest.
- **Component:** React Testing Library.
- **End-to-end:** Playwright (drives the real built app; used for the "click-through" demo assertions and offline/PWA checks).
- **CI:** GitHub Actions — typecheck + lint + unit + component + e2e on push; deploy to GitHub Pages on green.

### Golden fixtures from this repo (high-value)
The repo already contains real inputs and the Python engine's outputs. We turn them into test fixtures:
- Inputs: `Other reviewer assignments/20250812_papers_FINAL.csv`, `…_ReviewersAll.csv`, role lists.
- Outputs: `…results_students_testing_2_cap6.csv` (+ cap4/cap8) and the human-curated `…- Checks.csv`.

**Honest caveat on the engine test:** Python's `random.shuffle` order and set-iteration differ from JS, so we do **not** assert byte-exact reproduction of the Python match. Instead we assert **invariants** (stability, capacities/loads respected, conflicts excluded, reproducibility under a fixed seed) and **quality parity** (e.g., match overlap with the Python result above a threshold, and mean preference-rank no worse). This is the correct target for a stable-marriage port.

---

## Stages

Each stage lists: **Spec refs** · **Build** · **Demo (what a human can now see/do)** · **Tests** · **Done when**.

### Stage 0 — Skeleton, CI, live deploy
- **Spec:** §9
- **Build:** Vite+TS+React scaffold; ESLint/Prettier; Vitest + RTL + Playwright wired; GitHub Actions → Pages. App shell with the happy-path nav (Upload · Settings · Match · Dashboard) as empty routed screens.
- **Demo:** a live GitHub Pages URL showing the app shell — proves zero-install hosting works.
- **Tests:** one smoke unit test; one Playwright test that loads the deployed shell and sees the nav.
- **Done when:** CI green and the URL is public.

### Stage 1 — Matching engine (pure TS, headless)
- **Spec:** §4.2–4.4, §7
- **Build:** port `stableMarriage`/`Suitor`/`Suited` from `paper_matcher.py` to typed pure functions in a Web Worker-ready module. Seeded PRNG. Inputs = preference lists + capacities/loads + conflicts; output = assignments + per-side chosen ranks + non-selection reasons (feeds §5.7 later). A dev-only `/debug/engine` route runs it on the fixture data and prints results.
- **Demo:** open `/debug/engine`, see a real match computed from the repo's sample preferences.
- **Tests:** invariants (stability, capacity/load respected, self-authorship excluded, empty-pref entities dropped, reproducibility under fixed seed); golden **quality-parity** vs the Python `cap6` result.
- **Done when:** invariant + parity tests pass.

### Stage 2 — Walking skeleton: upload → run → results → export
- **Spec:** §5.1–5.2 (basic), §5.4, §6 (CSV export)
- **Build:** minimal CSV upload (assume clean columns for now); a **stub `SimilarityProvider`** (keyword/token overlap — no model yet) behind the interface; run the Stage-1 engine; render a results table (papers × assigned reviewers); export results CSV in the `results_*.csv` shape.
- **Demo:** upload the repo CSVs, click Run, see assignments, download a CSV. First fully end-to-end thread.
- **Tests:** CSV parse→domain mapping unit tests; Playwright e2e of the whole upload→run→export flow; export-format snapshot.
- **Done when:** e2e passes on the deployed build.

### Stage 3 — Real in-browser embeddings + Web Worker
- **Spec:** §4.1, §9
- **Build:** implement the embeddings `SimilarityProvider` with `transformers.js` (`all-MiniLM-L6-v2`); run embedding + match in a Web Worker with a progress UI; cache the model (Cache API/IndexedDB) + first-load "Downloading model…" state. Swap it in for the stub.
- **Demo:** same flow as Stage 2 but with genuinely semantic matches and a visible one-time download.
- **Tests:** provider unit tests (deterministic vectors on fixed text, cache hit skips re-embed); worker message-protocol test; e2e mocks the model to keep CI fast, plus one non-blocking real-model smoke test.
- **Done when:** semantic match runs end-to-end; model cached on second load.

### Stage 4 — Robust import (mapping, XLSX, messy data, validation)
- **Spec:** §5.1–5.2 (full)
- **Build:** column-mapping step with remembered mappings; XLSX support; tolerate BOM, embedded newlines, quoted/inconsistent columns (the real files here have all of these); preview table with row-level warnings; optional id↔name and role-list uploads.
- **Demo:** import the raw messy repo files directly (no pre-cleaning) and see a clean preview with warnings.
- **Tests:** parser tests run against the **actual messy repo files** as fixtures; mapping-persistence test; validation-warning cases (missing id, empty criteria).
- **Done when:** the untouched repo CSV/XLSX import cleanly.

### Stage 5 — Matching settings screen
- **Spec:** §4.3, §5.3
- **Build:** paper capacity (default 2, configurable, per-paper override); per-role reviewer loads (+ per-reviewer override); blended-pool role filter for loads; self-authorship conflict wiring; **proposing-side toggle with the teaching UI** (advantage lines, "why does this matter?" help, dynamic effect line); seed; live feasibility indicator (Σcapacity vs Σload).
- **Demo:** change capacity/loads/proposing side and re-run; watch assignments change; flip proposing side and see the advantage move.
- **Tests:** settings→engine wiring; proposing-side flip changes results as expected; feasibility math; per-item overrides beat defaults.
- **Done when:** all §4.3 settings drive the engine and persist to a run.

### Stage 6 — Drag-and-drop editing
- **Spec:** §5.5, §7
- **Build:** `dnd-kit` board (papers as columns ↔ toggle); drag between papers / to unassigned tray; **live validation** — hard-block self-authorship (with reasoned override), **allow** capacity/load breaches with a persistent warning badge; undo/redo; timestamped audit log; auto-vs-manual visual distinction; per-card pairing rank shown.
- **Demo:** hand-tune a computed match; see over-cap warnings and undo work.
- **Tests:** board-state reducer; validation outcomes (block vs warn); undo/redo; audit entries recorded.
- **Done when:** edits are validated, reversible, and logged.

### Stage 7 — Preference detail view
- **Spec:** §5.7, §4.4
- **Build:** per-paper and per-reviewer ranked lists — similarity score, conflicted?, chosen?, where the *other* side ranked this one, and non-selection reason; chosen-pair callout linking both sides.
- **Demo:** open any paper/reviewer and read exactly why each pairing was or wasn't made.
- **Tests:** reason-derivation logic (conflict / at-capacity / rejected-for-better / not-in-list); symmetry of the two views.
- **Done when:** every reason string is backed by engine output, not guessed.

### Stage 8 — Quality dashboard
- **Spec:** §5.6
- **Build:** load-distribution histograms; preference-rank satisfaction (e.g., % matched to top-3, mean/median, "got #1"); best/worst pairings; unfilled papers / idle reviewers; conflicts-overridden and over-cap counts; auto-vs-edited and cross-run comparison (cap4/cap6/cap8 style).
- **Demo:** a stats view that makes match quality legible at a glance.
- **Tests:** each statistic computed from a known fixture equals a hand-verified value; comparison view diffs two runs correctly.
- **Done when:** stats match hand-calculated fixtures.

### Stage 9 — Persistence & round-trip files
- **Spec:** §5.8, §6
- **Build:** IndexedDB working-state persistence (survives reload); **`.matchproj` lossless export/import** (reviewers, papers, settings, both preference lists, assignments, audit log, embeddings by content hash) restoring full state with no re-run; **best-effort results-CSV import** (§5.8.B) with the name→entity resolution report; per-paper report CSV export; schema versioning.
- **Demo:** export a `.matchproj`, reload/clear, re-import, and land back exactly where you were; also re-import a hand-edited results CSV.
- **Tests:** **round-trip fidelity** (export→import deep-equals prior state, no re-embed); best-effort resolution (exact/fuzzy/unresolved) cases; schema-version mismatch handling; reload-persistence e2e.
- **Done when:** round-trip is provably lossless.

### Stage 10 — PWA, offline, and non-technical-user polish
- **Spec:** §8, §9 guardrails
- **Build:** service worker (app shell + model cached) → installable, offline after first visit; humanized errors everywhere; visible privacy/"data stays on your device" messaging; first-load and empty states; accessibility pass (keyboard dnd alternative, labels).
- **Demo:** install to the OS, go offline, run a full match; friendly errors on bad input.
- **Tests:** Playwright offline run; PWA/installability + Lighthouse budget check; a11y checks (axe); error-copy snapshots.
- **Done when:** installs, runs offline, and passes a11y/PWA checks.

---

## Cross-cutting (maintained every stage, not a stage)
- **Accessibility & humanized errors** grow with each screen rather than being bolted on at Stage 10 (Stage 10 is the final audit, not the first attempt).
- **Performance:** keep the ~100×100 target instant; Web Worker from Stage 3 onward; watch model-download and embedding time.
- **Reproducibility:** seeded PRNG everywhere randomness enters; every run stores its seed + settings snapshot.
- **Docs:** a short README with the live URL and "how to use" grows alongside the app.

## Sequence rationale (one line each)
- Engine before UI → validate the hard part against known outputs early.
- Stub similarity before real embeddings → full thread works before the heavy model lands.
- Settings/editing/detail/dashboard after the thread exists → each deepens a working app.
- Persistence and PWA last → they harden and package a tool that already works.
