# AGENTS.md - Meeting Assistant Prototype

This file is for any AI agent (or human) working in this repository. Read it before making changes. Read `HANDOFF.md` for the latest state of work.

## Project Overview

Meeting Assistant ("AI Project Follow-ups") is a single-tenant, no-auth workspace for project managers:

- Capture meeting transcripts/notes, generate four structured PM outputs (Meeting Minutes, Action Items, RAID Log, Stakeholder Status Report) via a **deterministic keyword-extraction engine** (not an LLM)
- Review/refine outputs per meeting, save the report, and track all follow-up items in a unified repository
- Dashboard KPIs, Quick Notes module, Meetings history

**This is a prototype: all persistence is browser `localStorage`. There is no backend, no auth, no Supabase.** The data layer is a Supabase-style facade so it can be swapped for the real Supabase client later with minimal changes.

## Authoritative Spec

The source of truth is `Product Specification Document - Meeting Assistant.docx` in the repo root. If code and spec conflict, code must follow the spec; record any intentional deviation in `HANDOFF.md`.

## Stack & Commands

- React 18 + TypeScript + Vite
- Tailwind CSS v4 (via `@tailwindcss/vite` plugin), brand palette `brand-*` (primary `#1d5cf5`)
- lucide-react icons (use only well-known, stable icon exports)
- Custom history-based router in `src/App.tsx` (no react-router)

```bash
npm install     # install dependencies
npm run dev     # dev server
npm run build   # typecheck (tsc) + production build - MUST pass before a task is complete
npx tsx scripts/smoke.ts   # headless data-layer + generator smoke test (no browser needed)
```

## Architecture Map

```
src/
  App.tsx                 # Layout shell; renders pages for the current route
  main.tsx                # Entry: seeds localStorage, renders app
  index.css               # Tailwind theme, component classes (.btn-*, .card, .input, .tab-*), animations
  lib/
    types.ts              # Central TS types for all 7 entities (only source of entity types)
    db.ts                 # localStorage persistence (load/save) + DB shape
    client.ts             # supabase-like chainable facade (from().select().eq().order().limit()...) + asArray()/asSingle() helpers
    router.ts             # parsePath()/navigate()/routeKey() - history-based routing (no react-router)
    generator.ts          # Deterministic output generation engine + generateAndPersist() + save*ToRepository()
    utils.ts              # formatDate, isToday, isThisWeek, effective status, urgency, badges, etc.
    seed.ts               # Demo data, generated via the engine on first run
  components/
    Sidebar.tsx TopBar.tsx ui.tsx Modal.tsx ConfirmationDialog.tsx
    RepositoryItemModal.tsx ViewItemModal.tsx DateRangePicker.tsx Toast.tsx
    tabs/                 # MinutesTab, ActionItemsTab, RaidTab, StatusReportTab
  pages/
    Dashboard.tsx NewMeeting.tsx Meetings.tsx OutputSelection.tsx
    OutputReview.tsx Repository.tsx QuickNotes.tsx
scripts/
  smoke.ts                # Headless seed + generation smoke test (tsx)
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

- `navigate(path)` uses `history.pushState` + dispatches `popstate`; `App.tsx` listens and re-renders. Router helpers live in `src/lib/router.ts`.
- Output Selection/Review with an empty `meetingId` loads the most recent meeting.

## Verification

- `npm run build` must pass (tsc strict, `noUnusedLocals`, `noUnusedParameters`).
- `npx tsx scripts/smoke.ts` runs a headless seed + generation smoke test (localStorage stubbed) - all checks must PASS.
- Manual smoke test: seed data loads on first run -> Dashboard KPIs -> create meeting with transcript -> generate -> verify all 4 tabs + auto-pushed repository items -> edit/toggle/delete -> quick note -> add to repository -> reload persists.

## Handoff Protocol (required)

At the END of every task, update `HANDOFF.md`:

1. Replace the "Latest State" section (current task, status, what the incoming agent should do first).
2. Append a row to the "Task Log" table (date, task, files touched, decisions/deviations, how verified).
3. Update "Open Questions / Known Limitations" if anything changed.

An incoming agent must read `HANDOFF.md` first, then this file, then the spec for the area being changed.