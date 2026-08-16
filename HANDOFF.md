# HANDOFF.md - Task Log & Agent Handoff

Rules: this file is updated at the END of every task. An incoming agent reads **Latest State** first, then `AGENTS.md`, then the spec (`.docx`) for the area being changed.

---

## Latest State

- **Current task:** Gemini AI summaries + GitHub Pages publishing + testing data cleanup - CODE COMPLETE, awaiting user deployment steps
- **Status:** Done on code side (build clean, smoke 14/14, verify-remote 12/12, Supabase emptied). Two user actions remain (below).
- **Incoming agent should:**
  1. **Ask user to deploy the Edge Function:** Dashboard -> Edge Functions -> New Function `summarize` -> paste `supabase/functions/summarize/index.ts` -> Deploy -> Secrets -> add `GEMINI_API_KEY` (AI Studio key). Until then, AI buttons show an error toast.
  2. **Ask user to configure Pages:** repo Settings -> Pages -> Source "GitHub Actions"; Settings -> Secrets and variables -> Actions -> `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. Then the next push deploys to https://anne1114.github.io/meeting_assistant/.
  3. After deploy, verify: live URL loads, deep link like `/meeting_assistant/repository` refreshes without 404, AI buttons work, tables stay empty (no reseed on the live site).
  4. `npm run build` + `npx tsx scripts/smoke.ts` + `npx tsx scripts/verify-remote.ts` must all pass after any change.
  5. Read `AGENTS.md` for conventions and `Product Specification Document - Meeting Assistant.docx` (sections 8-9, 11) before touching business logic.

---

## Task Log

| Date | Task | Files touched | Decisions / deviations | How verified |
|------|------|---------------|------------------------|--------------|
| 2026-08-16 | Gemini AI summaries (Edge Function), GitHub Pages deploy, testing-data cleanup | `supabase/functions/summarize/index.ts` (new), `src/lib/gemini.ts` (new), `public/404.html` (new), `.github/workflows/deploy-pages.yml` (new), `src/pages/NewMeeting.tsx`, `src/components/tabs/MinutesTab.tsx`, `src/pages/OutputReview.tsx`, `src/lib/client.ts` (exported SUPABASE_URL/ANON_KEY), `src/lib/router.ts` (base-aware), `src/lib/seed.ts` (VITE_SEED_DISABLED), `vite.config.ts` (GH_BASE), `index.html` (path restore), `package.json` (+@types/node), `AGENTS.md`, `HANDOFF.md` | Gemini key kept server-side in Edge Function secret (never in bundle). Router made base-aware via BASE_URL so the same code works at `/` and `/meeting_assistant/`. Seeding disabled in Pages builds via `VITE_SEED_DISABLED`. Deleted ALL rows from Supabase (meetings cascade + follow_ups + quick_notes) so the live site starts clean. `@types/node` added (dev-only) for `process.env.GH_BASE` in vite.config. | `npm run build` clean (both base `/` and `GH_BASE=/meeting_assistant/`); smoke 14/14 PASS; verify-remote 12/12 PASS; tables verified empty; dist contains 404.html + base-prefixed assets |
| 2026-08-16 | Supabase remote mode: credentials wired + grant fix | `.env` (gitignored), `supabase/schema.sql` (added GRANT section), `scripts/verify-remote.ts` (new), `HANDOFF.md` | Tables created by user via SQL Editor needed explicit `GRANT SELECT/INSERT/UPDATE/DELETE TO anon, authenticated` (RLS alone insufficient -> 42501). Added to schema.sql for future setups; user ran 3-line grant snippet on the existing project. | REST ping 200; `npx tsx scripts/verify-remote.ts` 12/12 PASS (7 tables + insert/update/select/delete/cleanup); smoke 14/14 PASS |
| 2026-08-16 | Supabase remote mode integration (schema + facade swap) | `supabase/schema.sql` (new), `.env.example` (new), `.gitignore`, `src/lib/client.ts` (real supabase-js when env set, `useRemoteDb` flag), `src/lib/seed.ts` (remote seed guard + counts), `src/vite-env.d.ts` (env typing), `package.json` (added `@supabase/supabase-js`), `AGENTS.md` | RLS policies open to anon+authenticated per single-tenant spec (schema.sql). Seeding in remote mode only when `meetings` empty; localStorage flag kept for local mode. Real client cast to the local facade interface so all pages share one code path. | `npm run build` clean; smoke test 14/14 PASS (local mode); remote mode awaiting real credentials |
| 2026-08-16 | Full prototype implementation (7 pages, 4 tabs, data layer, generator, seed) | All files under `src/` (see AGENTS.md architecture map), `scripts/smoke.ts`, `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html` | Router extracted to `src/lib/router.ts` (spec suggested App.tsx - cleaner, avoids circular imports). Smoke test added at `scripts/smoke.ts` (tsx, localStorage stubbed) since the spec had none. `follow_ups.status` from auto-push copies action/RAID status as-is (spec-declared MVP inconsistency, kept). | `npm run build` clean; `npx tsx scripts/smoke.ts` 14/14 PASS; dev server HTTP 200; pushed to github.com/anne1114/meeting_assistant (commit 2926df3) |
| 2026-08-16 | Created AGENTS.md + HANDOFF.md (task 0) | `AGENTS.md`, `HANDOFF.md` | Rolling single-file handoff format (latest state + append-only log) | Read-back |

---

## How to Run & Verify

```bash
npm install
npm run dev        # dev server (http://localhost:5173)
npm run build      # tsc typecheck + production build - MUST pass
npx tsx scripts/smoke.ts   # headless data-layer + generator smoke test - all checks must PASS
```

Manual smoke test: seed data on first run -> Dashboard KPIs -> create meeting with transcript -> generate -> verify 4 tabs + auto-pushed repository items -> edit/toggle/delete -> quick note -> add to repository -> reload persists.

## Open Questions / Known Limitations

- Spec §15 notes several MVP limitations carried into this prototype: generated due dates are text labels ("Friday", "End of Week") not ISO dates; upload area is a visual placeholder; filter presets are session-only; quick note delete has no confirmation.
- `follow_ups.status` may contain `open`/`done` values copied as-is from action/RAID items (spec-declared inconsistency).
- Generated action items can include decision sentences containing "will" (e.g. "We decided that X will use...") - this matches the spec's keyword list verbatim.
- First-run seed uses dynamic dates (relative to today), so overdue/due-today dashboard states are always visible.
- AI buttons ("Summarize with AI", "AI-refine") require: remote mode (.env) AND the `summarize` Edge Function deployed AND `GEMINI_API_KEY` secret set. Until then they surface a friendly error toast.
- AI-refine overwrites `discussion_summary` + `key_decisions` of the current minutes (no undo); regenerating outputs restores engine content.

## Key Decisions Log

- **localStorage** over IndexedDB for prototype persistence (simplicity; data volume is small).
- **Supabase-style facade** (`src/lib/client.ts`) so a later swap to `@supabase/supabase-js` is near drop-in; `asArray()/asSingle()` helpers normalize query results.
- **Remote mode** is opt-in via `.env` (`VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`); the real client is cast to the facade interface so all pages share one code path. `useRemoteDb` is the mode flag.
- **RLS** is enabled on all tables with open policies for `anon` + `authenticated` (single-tenant, no-auth per spec section 9).
- **Seed demo data** generated by running the real generation engine on sample transcripts at first launch (exercises the engine and keeps seed consistent). Remote seeding runs only when the `meetings` table is empty.
- Router lives in `src/lib/router.ts` (deviation from spec's "in App.tsx" - avoids circular imports between App/Sidebar/TopBar).
- Headless smoke test `scripts/smoke.ts` added for regression checking without a browser.
- Handoff docs live in repo root (`AGENTS.md`, `HANDOFF.md`) per opencode convention.