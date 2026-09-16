# LifeOS

A personal life management system: plan the day hour by hour, keep habit
streaks alive, break goals into subtasks and see whether any of it is actually
working — all behind one Google sign-in, with every document owner-scoped in
Firestore.

**Live demo:** <https://os-life-one.vercel.app>

<!--
Screenshots: drop the files into `docs/screenshots/` and uncomment the block
below. Keep them around 1600px wide, light theme, browser chrome cropped away.

![Today](docs/screenshots/today.png)
![Habits](docs/screenshots/habits.png)
![Schedule](docs/screenshots/schedule.png)
![Analytics](docs/screenshots/analytics.png)
-->

## Modules

| Module | What it does |
| --- | --- |
| **Today** | The day's tasks as a list: quick add, edit, complete, delete, and a progress bar that says how much of the plan is done. |
| **Habits** | Repeating habits with a month activity grid, current/best streak badges, and archive instead of delete. |
| **Schedule** | An hour-by-hour day timeline with drag & drop: dragging a block moves `startTime`/`endTime` (15-minute snap), keeping its duration. The "now" line ticks every minute, and clicking empty space opens the task form pre-filled with that hour. |
| **Goals** | Goals with subtasks, progress bars and optional deadlines, all edited inline. |
| **Analytics** | Completion rate per day (7/30-day range), the hours of the day tasks actually get finished in, and a compact streak overview for every active habit. Charts are hand-rolled SVG — no charting library in the bundle. |
| **Notes** | Free-form daily notes that save as you type, with a dated history and per-day status. |
| **Profile** | Personal details, address and security/account section. |

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
├── hooks/                   # Firestore subscriptions (useTodayTasks, useHabits, useGoals, useNotes)
├── lib/                     # firestore.ts (data layer), date.ts, analytics.ts, authActions.ts
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
