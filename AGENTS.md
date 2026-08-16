# AGENTS.md - Meeting Assistant Prototype

This file is for any AI agent (or human) working in this repository. Read it before making changes. Read `HANDOFF.md` for the latest state of work.

## Project Overview

Meeting Assistant ("AI Project Follow-ups") is a single-tenant, no-auth workspace for project managers:

- Capture meeting transcripts/notes, generate four structured PM outputs (Meeting Minutes, Action Items, RAID Log, Stakeholder Status Report) via a **deterministic keyword-extraction engine** (not an LLM)
- Review/refine outputs per meeting, save the report, and track all follow-up items in a unified repository
- Dashboard KPIs, Quick Notes module, Meetings history

**This is a prototype: persistence is browser `localStorage` by default, with an optional Supabase remote mode.** When `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` are present in `.env`, `src/lib/client.ts` uses the real `@supabase/supabase-js` client; otherwise it falls back to the localStorage facade. The schema lives in `supabase/schema.sql` (run it in the Supabase SQL Editor; tables + RLS policies per spec section 9). The data layer is a Supabase-style facade so both modes share one code path.

**Optional Gemini AI summaries** (`src/lib/gemini.ts` + `supabase/functions/summarize/`): an Edge Function proxies Google's Gemini API (`gemini-3.5-flash-lite` by default; override with the `GEMINI_MODEL` function secret). The API key lives ONLY in the function's `GEMINI_API_KEY` secret - never in `.env` or the client bundle. The deterministic engine remains the default; AI is an additive "Summarize with AI" / "AI-refine" feature shown only in remote mode.

## Authoritative Spec

The source of truth is `Product Specification Document - Meeting Assistant.docx` in the repo root. If code and spec conflict, code must follow the spec; record any intentional deviation in `HANDOFF.md`.

## Stack & Commands

- React 18 + TypeScript + Vite
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin), brand palette `brand-*` (primary `#1d5cf5`)
- lucide-react icons (use only well-known, stable icon exports)
- Custom history-based router in `src/lib/router.ts` (no react-router); base-aware via `import.meta.env.BASE_URL` so it works under a subpath (GitHub Pages)

```bash
npm install     # install dependencies
npm run dev     # dev server
npm run build   # typecheck (tsc) + production build - MUST pass before a task is complete
npx tsx scripts/smoke.ts   # headless data-layer + generator smoke test (no browser needed)
npx tsx scripts/verify-remote.ts  # remote-mode CRUD check against Supabase (needs .env)
```

## Architecture Map

```
src/
  App.tsx                 # Layout shell; renders pages for the current route
  main.tsx                # Entry: seeds (local or remote) then renders app
  index.css               # Tailwind theme, component classes (.btn-*, .card, .input, .tab-*), animations
  lib/
    types.ts              # Central TS types for all 7 entities (only source of entity types)
    db.ts                 # localStorage persistence (load/save) + DB shape
    client.ts             # supabase-like chainable facade (from().select().eq().order().limit()...) + asArray()/asSingle() helpers; real @supabase/supabase-js when .env has VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
    router.ts             # parsePath()/navigate()/routeKey() - history-based routing (no react-router); base-aware via import.meta.env.BASE_URL
    generator.ts          # Deterministic output generation engine + generateAndPersist() + save*ToRepository()
    gemini.ts             # aiSummarize(text, kind) - calls the summarize Edge Function (remote mode only)
    utils.ts              # formatDate, isToday, isThisWeek, effective status, urgency, badges, etc.
    seed.ts               # Demo data, generated via the engine on first run (local or remote); skipped when VITE_SEED_DISABLED=true
  components/
    Sidebar.tsx TopBar.tsx ui.tsx Modal.tsx ConfirmationDialog.tsx
    RepositoryItemModal.tsx ViewItemModal.tsx DateRangePicker.tsx Toast.tsx
    tabs/                 # MinutesTab (AI-refine), ActionItemsTab, RaidTab, StatusReportTab
  pages/
    Dashboard.tsx NewMeeting.tsx Meetings.tsx OutputSelection.tsx
    OutputReview.tsx Repository.tsx QuickNotes.tsx
public/
  404.html                # GitHub Pages SPA fallback (redirects unknown paths to /?p=<path>)
supabase/
  schema.sql              # CREATE TABLE + RLS SQL for all 7 tables (paste into Supabase SQL Editor)
  functions/summarize/    # Edge Function: proxies Gemini API (key only in GEMINI_API_KEY secret)
scripts/
  smoke.ts                # Headless seed + generation smoke test (tsx)
  verify-remote.ts        # Remote CRUD check against Supabase (needs .env)
.github/workflows/
  deploy-pages.yml        # Build + deploy to GitHub Pages on push to main/master

## Supabase setup (optional)

- Copy `.env.example` to `.env` and fill in `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (Dashboard -> Project Settings -> API). `.env` is gitignored; never commit it.
- Run `supabase/schema.sql` once in the Supabase SQL Editor (creates tables, indexes, RLS policies - single-tenant, open anon policies).
- With env vars set, the app uses the real client; without them it silently falls back to localStorage. `useRemoteDb` in `src/lib/client.ts` is the mode flag.
- Seeding in remote mode runs only when the `meetings` table is empty; in local mode it uses the `meeting-assistant-db-v1` localStorage key as guard. Set `VITE_SEED_DISABLED=true` in production builds to never seed.
- **AI summaries (optional):** deploy `supabase/functions/summarize/index.ts` as an Edge Function named `summarize` (Dashboard -> Edge Functions -> Deploy, or `supabase functions deploy summarize`), then add the `GEMINI_API_KEY` secret (AI Studio key) in the function's secrets. Optional `GEMINI_MODEL` secret overrides the default `gemini-3.5-flash-lite`.

## Deploying to GitHub Pages

- The workflow `.github/workflows/deploy-pages.yml` builds and deploys on every push to `main`/`master`.
- One-time repo settings: Settings -> Pages -> Source "GitHub Actions"; Settings -> Secrets and variables -> Actions -> add `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (both public-safe).
- The build sets `GH_BASE=/<repo>/` (Vite base), `VITE_SEED_DISABLED=true`, and the SPA fallback is `public/404.html` + the path-restore script in `index.html` (deep links/refresh work on any route).
- Local builds default to base `/` (no `GH_BASE`); the router prepends `import.meta.env.BASE_URL` automatically.
```

## Conventions (follow these)

- **Data access only via `src/lib/client.ts`** (the `supabase` facade). Never touch `localStorage` or `db` directly from components/pages.
- All entity types are defined once in `src/lib/types.ts`; import them everywhere.
- `follow_ups.type` uses display values `Action | Follow-up | RAID` (capitalized) - NOT snake_case. Filtering depends on this.
- `action_items.status` / `raid_items.status` use `open | in_progress | done | blocked`; `follow_ups.status` uses `to_do | in_progress | pending | completed`. "overdue" is computed, never stored.
- Business rules (generation engine keywords, auto-push dedup via `source_ref_id`, meeting lifecycle draft->reviewed, cascade vs SET NULL semantics) are implemented in `src/lib/generator.ts` and page components - keep them consistent with the spec's sections 8 and 11.
- Shared CSS classes (`.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`, `.card`, `.input`, `.label`, `.badge`, `.tab-active/.tab-inactive`, `.animate-*`) are defined in `src/index.css`. Reuse them instead of inline Tailwind for repeated patterns.
- Pagination constants: `ITEMS_PER_PAGE = 5` for meetings and repository.
- No code comments unless explicitly asked. No new dependencies without justification (log it in HANDOFF.md).
- Match existing patterns and naming when extending.

## Routing

Routes: `/dashboard` (default from `/`), `/meetings/new`, `/meetings` (+`?week=current`), `/quick-notes`, `/outputs/select/:meetingId`, `/outputs/review/:meetingId`, `/repository` (+`?type=`, `?status=`, `?statusNot=`).

- `navigate(path)` uses `history.pushState` + dispatches `popstate`; `App.tsx` listens and re-renders. Router helpers live in `src/lib/router.ts`. Router is base-aware: it strips/prepends `import.meta.env.BASE_URL` so the same code works at `/` (local) and `/meeting_assistant/` (GitHub Pages).
- Output Selection/Review with an empty `meetingId` loads the most recent meeting.

## Verification

- `npm run build` must pass (tsc strict, `noUnusedLocals`, `noUnusedParameters`).
- `npx tsx scripts/smoke.ts` runs a headless seed + generation smoke test (localStorage stubbed) - all checks must PASS.
- `npx tsx scripts/verify-remote.ts` runs a remote CRUD round-trip against Supabase (needs `.env`) - all checks must PASS.
- Manual smoke test: seed data loads on first run -> Dashboard KPIs -> create meeting with transcript -> generate -> verify all 4 tabs + auto-pushed repository items -> edit/toggle/delete -> quick note -> add to repository -> reload persists.

## Handoff Protocol (required)

At the END of every task, update `HANDOFF.md`:

1. Replace the "Latest State" section (current task, status, what the incoming agent should do first).
2. Append a row to the "Task Log" table (date, task, files touched, decisions/deviations, how verified).
3. Update "Open Questions / Known Limitations" if anything changed.

An incoming agent must read `HANDOFF.md` first, then this file, then the spec for the area being changed.