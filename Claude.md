# Gym Log — Progressive Overload Tracker

## What this app is

A tiny, offline-first mobile web app used **inside the gym, on a phone, between sets**.
It answers one question per exercise:

> "What did I lift last time, and what should I try today?"

Then it lets me log today's sets in a few taps.

**Hard rule: keep it simple.** No accounts, no backend, no charts, no rest timer,
no social features, no settings pages. If a feature is not listed in this file, do not build it.

---

## Tech stack (do not change)

- Next.js (latest stable, App Router) + TypeScript (strict)
- **Static export only:** `output: "export"` in `next.config.ts`. No API routes, no server actions,
  no middleware, no `next/image` optimisation (`images: { unoptimized: true }`). The build output is the `out/` folder.
- `trailingSlash: true`. `basePath` and `assetPrefix` come from the env var `BASE_PATH` (empty for Vercel, `/workout-log` for GitHub Pages).
- Plain CSS (`app/globals.css` with CSS variables). No Tailwind, no UI library.
- Fonts via `next/font/google` (self-hosted at build time, so they work offline).
- Service worker built with `workbox-build` (`injectManifest`) as a **post-build step over `out/`**,
  and registered with `workbox-window`. Do NOT use `next-pwa` (unmaintained). Details in "PWA / offline".
- Vitest for unit tests
- Data stored in `localStorage` behind a small storage module (so Supabase can replace it later)
- One page only (`app/page.tsx`). The 2 views switch with React state, not routes.

### Next.js rules for this app
- `app/page.tsx` renders `<GymApp />`, which is a `"use client"` component. All app UI is client-side.
- **No hydration mismatches:** never read `localStorage`, `Date`, or `window` during render. Read them in
  `useEffect` after mount. Until mounted, render a plain skeleton (header + empty list) so the build HTML and
  the first client render match.
- "Today" is computed on the client only, never at build time.

---

## Project structure

```
app/
  layout.tsx              // fonts, metadata, viewport, iOS meta tags
  page.tsx                // renders <GymApp />
  manifest.ts             // web app manifest (export const dynamic = "force-static")
  globals.css
components/
  GymApp.tsx              // "use client"; holds current view + selected day/exercise
  DayTabs.tsx
  ExerciseList.tsx
  ExerciseScreen.tsx
  SetRow.tsx
  Stepper.tsx
  DataSheet.tsx           // export / import / reset
  UpdateBanner.tsx        // "New version ready" prompt
  InstallHint.tsx         // one-time "add to home screen" hint
lib/
  plan.ts                 // the workout plan as typed data (below)
  progression.ts          // pure functions: lastSession(), target()
  progression.test.ts     // Vitest unit tests
  storage.ts              // ONLY file that touches localStorage
  exportImport.ts         // JSON export / import + validation
  pwa.ts                  // service worker registration, wake lock, persist(), standalone detection
  dates.ts                // todayLocal(), formatting
sw/
  sw.ts                   // service worker source (workbox precache + offline fallback)
scripts/
  build-sw.mjs            // post-build: compile sw.ts and injectManifest into out/sw.js
public/
  icon.svg, icon-192.png, icon-512.png, icon-maskable-512.png, apple-touch-icon.png
```

Scripts in `package.json`:
- `"build": "next build && node scripts/build-sw.mjs"`
- `"start:static": "npx serve out"` (to test offline locally)
- `"test": "vitest run"`

Keep components small. Business logic lives in `progression.ts` and `storage.ts`,
never inside components.

---

## The workout plan (hardcode in `plan.ts`)

Each exercise has: `id` (stable slug), `name`, `sets`, `repMin`, `repMax`,
`kind` (`"upper"` | `"lower"` | `"iso"` | `"bodyweight"`), `jump` (kg), and optional `note`.

Jump defaults by kind: upper = 2.5, lower = 5, iso = 2, bodyweight = 0.

**Important:** history is keyed by exercise `id`, NOT by day. The same exercise on two days
shares one history, so "last time" means the last time I did that exercise on any day.
Shared exercises:
- `incline-db-press` is on Mon and Thu
- `romanian-deadlift` is on Wed and Sat

Days use JS `Date.getDay()` numbers: 1 = Monday … 6 = Saturday, 0 = Sunday (rest).

| Day | Title | id | Name | Sets | Reps | Kind |
|---|---|---|---|---|---|---|
| 1 Mon | Push A — chest | bench-press | Barbell bench press | 4 | 6–8 | upper |
| | | incline-db-press | Incline dumbbell press | 4 | 8–10 | upper |
| | | cable-fly | Cable fly | 3 | 12–15 | iso |
| | | seated-db-press | Seated dumbbell press | 3 | 8–10 | upper |
| | | lateral-raise | Lateral raise | 4 | 12–15 | iso |
| | | overhead-cable-ext | Overhead cable extension | 3 | 10–12 | iso |
| | | rope-pushdown | Rope pushdown | 3 | 12–15 | iso |
| 2 Tue | Pull A — back thickness | deadlift | Deadlift | 3 | 5–5 | lower |
| | | barbell-row | Barbell row | 4 | 6–8 | upper |
| | | lat-pulldown-wide | Lat pulldown (wide) | 3 | 10–12 | upper |
| | | chest-supported-row | Chest-supported row | 3 | 10–12 | upper |
| | | face-pull | Face pull | 3 | 15–20 | iso |
| | | barbell-curl | Barbell curl | 4 | 8–10 | iso |
| | | hammer-curl | Hammer curl | 3 | 10–12 | iso |
| 3 Wed | Legs A — quads | back-squat | Barbell back squat | 4 | 6–8 | lower |
| | | leg-press | Leg press | 3 | 10–12 | lower |
| | | romanian-deadlift | Romanian deadlift | 3 | 8–10 | lower |
| | | leg-extension | Leg extension | 3 | 12–15 | iso |
| | | seated-leg-curl | Seated leg curl | 3 | 10–12 | iso |
| | | standing-calf-raise | Standing calf raise | 4 | 12–15 | iso |
| | | hanging-leg-raise | Hanging leg raise | 3 | 12–15 | bodyweight |
| 4 Thu | Push B — shoulders | ohp | Overhead barbell press | 4 | 6–8 | upper |
| | | incline-db-press | Incline dumbbell press | 4 | 8–10 | upper |
| | | cable-lateral-raise | Cable lateral raise | 4 | 15–20 | iso |
| | | pec-deck | Pec deck | 3 | 12–15 | iso |
| | | reverse-pec-deck | Reverse pec deck | 3 | 15–20 | iso |
| | | close-grip-bench | Close-grip bench press | 3 | 8–10 | upper |
| | | overhead-db-ext | Overhead dumbbell extension | 3 | 10–12 | iso |
| 5 Fri | Pull B — back width | weighted-pullup | Weighted pull-up | 4 | 6–8 | upper (note: "weight = added kg") |
| | | single-arm-db-row | Single-arm dumbbell row | 4 | 10–12 | upper |
| | | seated-cable-row-wide | Seated cable row (wide) | 3 | 10–12 | upper |
| | | straight-arm-pulldown | Straight-arm pulldown | 3 | 12–15 | iso |
| | | barbell-shrug | Barbell shrug | 3 | 12–15 | iso |
| | | incline-db-curl | Incline dumbbell curl | 3 | 10–12 | iso |
| | | reverse-curl | Reverse curl | 3 | 12–15 | iso |
| 6 Sat | Legs B — hams & glutes | romanian-deadlift | Romanian deadlift | 4 | 8–10 | lower |
| | | hip-thrust | Barbell hip thrust | 4 | 10–12 | lower |
| | | bulgarian-split-squat | Bulgarian split squat | 3 | 10–10 | lower (note: "reps per leg", jump 2.5) |
| | | lying-leg-curl | Lying leg curl | 4 | 12–15 | iso |
| | | leg-press-feet-high | Leg press (feet high) | 3 | 12–15 | lower |
| | | seated-calf-raise | Seated calf raise | 4 | 15–20 | iso |
| | | cable-crunch | Cable crunch | 3 | 15–15 | iso |
| 0 Sun | Rest | — | — | — | — | — |

Sunday shows: "Rest day. Sleep 7–9 hours. Walk if you want." plus the day tabs, so I can still open any day.

Rest guidance from my plan, shown as one small muted line under the day title:
"Rest 2–3 min on the first 2 exercises, 60–90 sec on the rest."

---

## Data model (`storage.ts`)

```ts
type SetEntry = { weight: number; reps: number };   // weight in kg, 0 allowed

type Session = {
  date: string;          // local date "YYYY-MM-DD"
  exerciseId: string;
  plannedSets: number;   // snapshot of plan at the time
  repMin: number;
  repMax: number;
  sets: SetEntry[];      // only sets I ticked as done, in order
};

type Store = { version: 1; sessions: Session[] };
```

- localStorage key: `gymlog:v1`
- One `Session` per `(date, exerciseId)`. Logging again on the same day updates that session.
- Wrap every localStorage read/write in try/catch. If the data is missing or corrupt, start empty and never crash.
- Expose only these functions: `loadStore()`, `getSessions(exerciseId)`, `upsertSet(date, exercise, index, set)`,
  `removeSet(date, exerciseId, index)`, `replaceStore(store)`, `clearAll()`.
  Components never touch localStorage directly. Later this module gets a Supabase version with the same functions.
- Use the **local** date (not UTC) for "today". Write a helper `todayLocal()`.

### Units (kg / lb)
- One global switch, "Weights in kg | lb", in the Data sheet. Saved in `gymlog:unit` (default kg).
- Storage, export files and the Supabase plan stay in **kg**. `lib/units.ts` converts for display and input only
  (kg→lb rounded to 0.01; lb→kg kept to 4 decimals so typed lb values round-trip exactly).
- Progression runs in the display unit: `target(exercise, last, jump)` with lb jumps upper 5, lower 10, iso 5,
  Bulgarian split squat 5 (`jumpLb` in `plan.ts`). Targets round to 0.5 of the display unit.
- Weight stepper step in lb: the lb jump, or 2.5 for iso. All "kg" labels, badges and the plan line use the unit.

---

## Progression logic (`progression.ts`): the core of the app

Pure functions, fully unit tested.

### `lastSession(sessions, today)`
The most recent session with `date < today` that has at least 1 set. Today's own session never counts as "last time".

### `target(exercise, last)` returns `SetEntry[]` (length = `exercise.sets`) plus a `reason`

1. **No last session:** weight = 0 (I type it in), reps = `repMin` for every set. reason = `"first"`.
2. **Hit the top:** every logged set has `reps >= repMax` AND `last.sets.length >= last.plannedSets`.
   - kind `bodyweight`: keep reps at `repMax`. reason = `"top-bodyweight"`. UI says "Top of range — slow the reps down or add weight."
   - otherwise: new weight = (heaviest weight in last session) + `exercise.jump`, reps = `repMin` for all sets. reason = `"add-weight"`.
3. **Otherwise (keep the weight, add reps):** for set `i`, use last session's set `i` (if last had fewer sets, reuse its final set).
   weight = that set's weight, reps = `min(repMax, thatReps + 1)`. reason = `"add-reps"`.

Round weights to 0.5 kg. Display "62.5", not "62.50".

### Required tests (`progression.test.ts`)
- no history: `first`, reps = repMin
- bench 60 kg × [8, 8, 7, 6], range 6–8: targets [8, 8, 8, 7] at 60
- bench 60 kg × [8, 8, 8, 8]: 62.5 kg × [6, 6, 6, 6]
- squat 100 kg × [8, 8, 8, 8]: 105 kg × 6
- lateral raise 10 kg × [15, 15, 15, 15]: 12 kg × 12
- last session had only 2 of 4 sets, both at top: NOT a weight increase
- RDL done Wed (3 sets) and Sat (4 sets): Sat target uses Wed's session; the 4th set reuses set 3
- hanging leg raise at top stays at 15 reps, weight 0
- a session dated today is ignored by `lastSession`
- mixed weights last time [60, 60, 57.5]: per-set weights are kept

---

## Screens and UX

The app is used with sweaty hands and a quick glance. So: huge tap targets (min 56px),
big numbers, one-handed use, nothing that needs precision.

### Screen 1: Today
- Top: day tabs `Mon Tue Wed Thu Fri Sat`. Today is selected on open. Sunday selects nothing and shows the rest message.
- Day title (e.g. "Push A — chest") + the rest guidance line.
- List of the day's exercises. Each row shows:
  - name, and the scheme `4 × 6–8`
  - **Last:** `60 kg · 8 8 7 6` (or "Not done yet")
  - **Today:** `60 kg · 8 8 8 7`, and when weight goes up, a clear "+2.5 kg" badge
  - progress: `2/4` sets done today, and a check mark when all are done
- A small "Data" button in the header opens the Data sheet.
- If the last export is more than 7 days old (or never), show one quiet line at the bottom: "Last backup: 9 days ago — Export". Nothing else nags.

### Screen 2: Exercise
- Back button, exercise name, scheme, optional note.
- A **Last time** block: date (e.g. "Thu, 1 Oct") and each set `60 × 8`.
- A one-line **plan for today**, in plain words:
  - add-reps: "Same weight. Beat last time by 1 rep per set."
  - add-weight: "You hit the top last time. +2.5 kg, start at 6 reps."
  - first: "First time. Enter your weight."
- **Set rows** (one per planned set), prefilled with the target:
  - `Set 1` | weight stepper (− value +) | reps stepper (− value +) | big ✓ button
  - The weight stepper moves by the exercise's `jump` (by 1 for `iso`). Tapping the number opens a numeric input (`inputmode="decimal"`) so I can type any weight.
  - Tap ✓ to save the set at once (upsert). The row turns "done" (filled style) and shows the logged values.
  - Tap ✓ again to undo (remove the set).
  - When I change a set's weight, also prefill that weight into the not-yet-done sets below it.
  - Next to each done set, a small marker shows how it compares with last time's same set: ▲ better (more weight, or same weight + more reps), = same, ▼ less.
- Bodyweight exercises hide the weight stepper.
- Allow one extra set: a quiet "+ Add set" link under the rows.
- When all planned sets are done, show "Done ✓" and a "Back to today" button.

### Data sheet
- **Export backup**: downloads `gym-log-YYYY-MM-DD.json` and records the export time (`gymlog:lastExport`).
  Use a Blob + `<a download>`. On iOS, if download is unsupported, fall back to `navigator.share` with the file.
- **Import backup**: file picker (`.json`). Validate the file (see below), then show "Import 142 sessions? Sessions on the same date for the same exercise will be replaced by the file." Merge: on matching `(date, exerciseId)` the file wins, everything else is kept.
- **Delete all data**: confirm dialog where I must type `DELETE`.
- Show the total number of sessions stored and the date of the last export.

### Export file format (versioned, Supabase-ready)
```json
{
  "app": "gym-log",
  "version": 1,
  "exportedAt": "2026-10-04T18:30:00.000Z",
  "sessions": [ { "date": "2026-10-01", "exerciseId": "bench-press", "plannedSets": 4, "repMin": 6, "repMax": 8, "sets": [ { "weight": 60, "reps": 8 } ] } ]
}
```
Import validation: `app === "gym-log"`, `version === 1`, `sessions` is an array, and each session has a valid date string, a string id, and sets with non-negative numbers. Reject bad files with a plain message: "This file isn't a Gym Log backup." Never partially import a bad file.

---

## Visual design

Theme idea: **Olympic weight plates on a chalk-dusted slate.** The plate colours mark the day type, so I know at a glance where I am.

Tokens (CSS variables on `:root`; dark is the default because gyms are dim, and light mode follows `prefers-color-scheme: light`):

| Token | Dark | Light | Use |
|---|---|---|---|
| `--bg` | `#1C252C` (slate) | `#EEF0EE` | page |
| `--surface` | `#26313A` | `#FFFFFF` | rows, sheets |
| `--ink` | `#ECE9E2` (chalk) | `#1C252C` | text |
| `--muted` | `#93A1AB` | `#5E6B74` | secondary text |
| `--push` | `#D2453A` (red plate) | `#B8352B` | push days accent |
| `--pull` | `#3D72C4` (blue plate) | `#2B5DAA` | pull days accent |
| `--legs` | `#E2B33C` (yellow plate) | `#A87F14` | legs days accent |
| `--good` | `#4FAE6A` (green plate) | `#2F8A4A` | ▲ better, done states |

- The active day's accent colours the selected tab, the ✓ buttons and the "+2.5 kg" badge.
- Font: **Barlow Condensed** (600/700) for numbers, weights and headings; **Barlow** (400/500) for body. Load with `next/font/google` (self-hosted, works offline), fallback `system-ui, sans-serif`. Numbers use `font-variant-numeric: tabular-nums`.
- Weight and rep values are large (≥ 28px). Exercise names are 18px.
- Rounded corners: 14px on rows, 999px on the ✓ button and badges. Avoid identical-card soup: rows are separated by spacing and a thin divider, not shadows.
- No decorative animation. The only motion: a quick fill when a set is ticked (150ms), respecting `prefers-reduced-motion`.
- Inputs use `font-size: 16px` or larger (stops iOS from zooming in).
- Handle the notch and home bar: `viewport-fit=cover` plus `env(safe-area-inset-*)` padding.
- Visible focus rings; colour contrast at least 4.5:1.

---

## PWA / offline

### Service worker (`sw/sw.ts` + `scripts/build-sw.mjs`)
- After `next build`, `build-sw.mjs` bundles `sw/sw.ts` (esbuild) and runs `workbox-build` `injectManifest`
  with `globDirectory: "out"` and `globPatterns: ["**/*.{html,js,css,woff2,png,svg,webmanifest,json}"]`, writing `out/sw.js`.
- Precache everything, so the whole app works in airplane mode after the first load (gym basements have bad signal).
- Navigation requests fall back to the precached `index.html`.
- The app makes **zero network requests** at runtime. No analytics, no CDN fonts, nothing.
- Register the service worker with `workbox-window` from `lib/pwa.ts`, only in production, with the
  correct `BASE_PATH` prefix and `scope`.

### Manifest (`app/manifest.ts`)
- name "Gym Log", short_name "Gym Log", `display: "standalone"`, `orientation: "portrait"`,
  `background_color` and `theme_color` = dark `--bg`.
- `start_url` and `scope` = `BASE_PATH + "/"` (important for GitHub Pages).
- Icons: a simple weight-plate icon. Generate the SVG, then export PNG 192 and 512, a **maskable** 512 (with safe padding), and apple-touch-icon 180.
- `layout.tsx` adds the iOS tags: `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style: black-translucent`, `apple-mobile-web-app-title`, and `viewport` with `viewport-fit=cover`.

---

## PWA reliability (must-have, these prevent real gym problems)

1. **Never reload by itself.** When a new version is ready, show a small bar on the Today screen:
   "New version ready — Update". It reloads only when I tap it. Never show it on the Exercise screen
   mid-workout. (Use `workbox-window` `waiting` event + `messageSkipWaiting()`.)
2. **Survive the OS killing the app.** iOS and Android kill background apps (while I'm resting, on my phone).
   Save the UI state to localStorage key `gymlog:ui` (current view, selected day, open exercise id, and any
   edited-but-not-ticked stepper values) on every change. On launch, restore it if it's from today.
   Reopening the app puts me back on the same exercise with the same numbers.
3. **Keep the screen awake** on the Exercise screen with the Screen Wake Lock API. Re-acquire it on
   `visibilitychange`, release it when leaving the screen, and skip silently if unsupported.
4. **Ask for persistent storage** (`navigator.storage.persist()`) after the first logged set, so the
   browser doesn't evict my data. Do it silently; don't show the result.
5. **Install hint for iOS storage.** On iOS, Safari and the home-screen app keep **separate** storage.
   If the app is NOT running standalone (`matchMedia("(display-mode: standalone)")` / `navigator.standalone`),
   show a one-time dismissible hint: "Add to Home Screen and always open Gym Log from the icon, so your log stays in one place."
   On Android/Chrome, use `beforeinstallprompt` to show an "Install" button inside the same hint.
6. **Day change.** Recompute "today" on `visibilitychange` and `focus`, so an app left open overnight
   shows the right day and treats yesterday's sets as "last time".
7. **No accidental gestures.** `touch-action: manipulation` (no double-tap zoom), `overscroll-behavior: none`
   on html/body (no pull-to-refresh reload), no `:hover`-only UI, `-webkit-tap-highlight-color: transparent`,
   `user-select: none` on buttons and steppers.
8. **Typing weights.** Number inputs use `inputmode="decimal"`, accept both "62.5" and "62,5", commit on blur
   or Enter, and scroll into view above the keyboard.
9. **Export works when installed.** In standalone mode on iOS, `<a download>` is unreliable. Use
   `navigator.share({ files: [file] })` when `navigator.canShare({ files })` is true; otherwise use a Blob + `<a download>`.
10. **Save errors are visible.** If a localStorage write throws (quota, private mode), show a red banner:
    "Couldn't save. Export a backup now." with the Export button. Never fail silently.
11. **Fast.** First load under 150 KB of JS (gzipped). The Today screen is interactive in under 1s on a mid-range phone.

---

## Deployment

The deploy target comes from the kickoff prompt (`vercel` or `github-pages`). Default: **vercel**.

### Vercel
1. `npm run build` must pass (with `BASE_PATH` empty).
2. Add a `vercel.json` so the service worker is never cached stale:
   `sw.js` gets `Cache-Control: no-cache` and `Service-Worker-Allowed: /`.
3. Run `npx vercel --prod --yes`. If not logged in, stop and tell me to run `npx vercel login`, then continue.
4. Print the production URL.

### GitHub Pages
1. `next.config.ts` reads `BASE_PATH` for `basePath` and `assetPrefix`.
2. The build must add an empty `out/.nojekyll` file (without it GitHub Pages hides the `_next/` folder and the app breaks).
3. Add `.github/workflows/deploy.yml` using `actions/configure-pages`, `actions/upload-pages-artifact` (path `out`) and `actions/deploy-pages`, with `BASE_PATH=/workout-log` during the build.
3. `git init`, commit, then `gh repo create workout-log --public --source=. --push` (if `gh` is not logged in, stop and tell me to run `gh auth login`).
4. Enable Pages for workflow builds: `gh api -X POST repos/{owner}/workout-log/pages -f build_type=workflow` (ignore "already exists").
5. Watch the run with `gh run watch`, then print `https://<owner>.github.io/workout-log/`.

Optional later: a custom subdomain such as `gym.theversehub.in` (only if I ask).

---

## Definition of done (check every item before deploying)

- [ ] `npm run test` passes, including every progression test listed above
- [ ] `npm run build` passes with no TypeScript errors
- [ ] Opening the app shows today's workout with no extra taps
- [ ] Logging a set survives a page reload
- [ ] Export → Delete all → Import restores everything exactly
- [ ] Importing a random JSON file shows the error and changes nothing
- [ ] No hydration warnings in the browser console
- [ ] Works offline after the first load (`npm run start:static`, load once, set DevTools to Offline, reload: the app still works)
- [ ] Lighthouse: installable, and the manifest + service worker have no errors
- [ ] A new deploy shows the "New version ready" bar and does NOT reload by itself
- [ ] Open an exercise, change a stepper, close the tab, reopen: same exercise, same numbers
- [ ] Looks right at 360px wide; no horizontal scrolling; tap targets ≥ 56px
- [ ] Light and dark mode both readable
- [ ] Deployed, and the live URL printed at the end

After deploying, give me a short **phone test checklist** to run once on my real phone:
install from the icon → log a set in airplane mode → kill the app → reopen (same screen) → export a backup.

## Working style
- Build in this order: lib/plan.ts → lib/progression.ts + tests → lib/storage.ts → screens → export/import → PWA + reliability → deploy.
- Run the tests after the progression logic, before writing any UI.
- Write a short README: how to run, how to deploy, the backup format, and how to swap `storage.ts` for Supabase later.
- Don't add features beyond this file. If something is unclear, choose the simplest option and note it in the README.