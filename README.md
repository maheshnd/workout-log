# Gym Log

A tiny offline-first web app for the gym: *what did I lift last time, and what should I try today?*
Static Next.js export, data in `localStorage`, works in airplane mode after the first load.

## Run

```bash
npm install
npm run dev            # http://localhost:3000 (no service worker in dev)
npm test               # progression + import unit tests (Vitest)
npm run build          # static export to out/ + out/sw.js
npm run start:static   # serve out/ to test offline (build with BASE_PATH empty)
```

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`: tests, then `BASE_PATH=/gym-log npm run build`,
then publishes `out/`. The site is at `https://<owner>.github.io/gym-log/`.

First-time setup:

```bash
gh repo create gym-log --public --source=. --push
gh api -X POST repos/<owner>/gym-log/pages -f build_type=workflow
```

For Vercel instead: build with `BASE_PATH` empty and add a `vercel.json` that serves `sw.js`
with `Cache-Control: no-cache`.

## Backup format

Data → Export backup writes `gym-log-YYYY-MM-DD.json`:

```json
{
  "app": "gym-log",
  "version": 1,
  "exportedAt": "2026-10-04T18:30:00.000Z",
  "sessions": [
    { "date": "2026-10-01", "exerciseId": "bench-press", "plannedSets": 4,
      "repMin": 6, "repMax": 8, "sets": [{ "weight": 60, "reps": 8 }] }
  ]
}
```

Import checks the whole file first and rejects it if anything is wrong. Sessions with the same
`(date, exerciseId)` are replaced by the file. Everything else is kept.

## Units

Data → "Weights in kg | lb". Weights are always saved in kg (so backups are unit-free);
lb is converted for display and typing. In lb the jumps are upper +5, lower +10, isolation +5,
split squat +5, and the isolation stepper moves by 2.5 lb. History logged in kg shows converted
(e.g. 10 kg → 22.05 lb), and the next target rounds to the nearest 0.5 lb.

## Swapping storage for Supabase later

Only `lib/storage.ts` touches `localStorage`. To move to Supabase, write a version of the store
functions with the same signatures: `loadStore`, `getSessions`, `upsertSet`, `removeSet`,
`replaceStore`, `clearAll`. A `sessions` table with a unique `(user_id, date, exercise_id)`
key and a `sets jsonb` column maps 1:1 to `Session`. Today the functions are synchronous and
return `false` when a write fails. A network version would make them async, keep an in-memory
cache for reads, and still return save failures so the red "Couldn't save" banner works.
The UI state, last-export time and install-hint flag can stay in `localStorage`.

## Choices made where the spec was open

- **Sets are ticked in order.** Only the next set's ✓ is active, and only the latest done set
  can be undone. This keeps "sets in order" in the data model exact.
- `storage.ts` also has tiny helpers for `gymlog:ui`, `gymlog:lastExport` and the install-hint
  flag, so that no other file touches `localStorage`.
- The "Last backup" line only appears once at least one session is logged.
- Delete all data removes sessions but keeps the last-export time (your backup file still exists).
- First time on a bodyweight exercise the plan line says "First time. Do what you can."
  (there's no weight to enter).
- Typed weights keep up to 2 decimals (e.g. 61.25 for micro plates). Targets are rounded to 0.5 kg.
- JS budget: about 141 KB gzipped for modern browsers. A further ~40 KB legacy polyfill chunk is
  `nomodule`, so phones never download it.
