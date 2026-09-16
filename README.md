# LifeOS

A personal life management system: plan the day hour by hour, keep habit
streaks alive, link the day's tasks to long-term goals and see whether any of it
is actually working — all behind one Google sign-in, with every document
owner-scoped in Firestore.

**Live demo:** <https://os-life-one.vercel.app>

## Modules

| Module | What it does |
| --- | --- |
| **Today** | Capture first: a one-field quick add creates a task from its title alone, and a time can be added later (or never). Day arrows reach any date, `Now`/`Next` read the clock, and unfinished work from the last 14 days is offered for recovery — carry to tomorrow, reschedule, or drop it off the plan. Shows the day's planned time in hours and minutes. |
| **Week** | The same tasks as Today, seven days at a time and read as one bounded week: a card per day (priority, goal, timed or not), a review counted from those tasks alone, and the two planning decisions — move a task to another day or take it off the plan, one at a time or for a whole selection. A leftover carried forward lands on the next week's first day, and its report outlives the selection so a partial write is visible. No week document, no weekly entity. |
| **Habits** | Repeating habits with a month activity grid, current/best streak badges, and archive instead of delete. |
| **Schedule** | The same selected day as Today, as an hour-by-hour timeline: dragging a block moves `startTime`/`endTime` (15-minute snap), keeping its duration — mouse, touch (press and hold) and arrow keys all work. The "now" line ticks every minute, clicking empty space opens the task form pre-filled with that hour, and tasks without a time are listed above the grid instead of being given an hour they never had. |
| **Goals** | Long-term directions, moved by ordinary tasks: a task can optionally carry a `goalId`, and a goal's page shows *task progress* (`3 / 6`), its next actionable task, and every linked task — open and completed. Goals have three states (active, completed, archived), and no state ever touches the work linked to it. A goal's pre-task checklist, where a goal still has one, can be converted into real tasks in one step; completed steps stay behind as history. |
| **Analytics** | Completion rate per day (7/30-day range), the hours of the day tasks actually get finished in, and a compact streak overview for every active habit. Dropped tasks are excluded from both the rate and the totals — they were taken off the plan, so they are neither a success nor a failure. Charts are hand-rolled SVG — no charting library in the bundle. |
| **Notes** | Free-form daily notes that save as you type, with a dated history and per-day status. |
| **Profile** | The Google identity you are signed in with (avatar, name, email) and a way to sign out. Nothing else — the module only offers actions the backend actually performs. |

## Tech stack

- **Next.js 16** — App Router with static rendering, Turbopack
- **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** — CSS-first theme tokens in `src/app/globals.css`
- **Firebase** — Google Auth + Firestore (`onSnapshot` for live data)
- **next-intl** — English and Russian, `as-needed` locale prefixes
- **@dnd-kit** — drag & drop on the Schedule timeline
- Installable **PWA** — a small service worker pre-caches the app shell

## Getting started

```bash
npm install
cp .env.example .env   # then fill in the Firebase web config
npm run dev
```

Open <http://localhost:3000>.

### Environment variables

Only the public Firebase client config is needed (see `.env.example`); there
are no server-side secrets.

| Variable | Where it comes from |
| --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase console → Project settings → Your apps → Web app |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | idem |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | idem |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | idem |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | idem |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | idem |

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` | Production build (`prebuild` runs ESLint first, so a lint error fails the build) |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (`node --test`) |

## Project structure

```
src/
├── app/[locale]/            # Localized routes: (admin) app shell, (auth) pages, errors
├── components/              # Feature components: today, habits, schedule, goals, analytics, notes
├── layout/                  # App shell — sidebar, header, backdrop
├── context/                 # Sidebar and auth providers
├── hooks/                   # Firestore subscriptions (useDayTasks, useHabits, useGoals, useGoalTasks, useGoalDetail, useNotes)
├── lib/                     # firestore.ts (data layer), taskSchedule.ts + goals.ts + week.ts (pure rules), date.ts, analytics.ts, authActions.ts
├── i18n/                    # Routing and navigation wrappers
└── messages/                # en.json / ru.json dictionaries
```

## Internationalization

English is served without a prefix, Russian under `/ru`. Dictionaries live in
`src/messages/`, the locale list in `src/i18n/routing.ts`. Navigation must be
imported from `@/i18n/navigation` instead of `next/link` / `next/navigation`,
otherwise links drop the locale prefix — an ESLint rule enforces this.

## Deployment (Vercel)

1. Import the repository; the framework preset needs no changes and there is
   no `vercel.json`.
2. **Environment variables** — add the six `NEXT_PUBLIC_FIREBASE_*` values for
   Production, Preview and Development.
3. **Firebase console** — add the deployment domain under Authentication →
   Settings → **Authorized domains**, otherwise the Google popup is rejected
   (`auth/unauthorized-domain`).
4. **Firestore rules** — paste `firestore.rules` into Firestore Database →
   Rules and publish. They are plain owner-scoped rules (`users/{uid}/**` is
   readable and writable only by that user), and nothing else is exposed.

## License

GNU General Public License v3.0 — see [LICENSE](LICENSE).
