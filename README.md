# LifeOS

Personal life management system — daily planning, habit tracking, goals, AI-powered day planning.

## Features

- **Next.js 16** (App Router, Turbopack)
- **React 19** with TypeScript
- **Tailwind CSS v4** with CSS-first configuration
- **next-intl v4** for internationalization (i18n) and RTL support
- **Firebase** (Auth + Firestore) for sign-in and all user data
- **ApexCharts** for data visualization
- **FullCalendar** for the calendar module
- Dark mode support (light/dark/auto)
- Installable PWA (a small service worker makes the shell work offline)
- Responsive sidebar with collapsible navigation
- Authentication pages (Sign In, Sign Up)
- Multiple dashboard layouts
- UI component library (buttons, modals, tables, forms, charts, etc.)

## Getting Started

### Prerequisites

- Node.js 20.x or later

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   └── [locale]/            # Localized routes
├── components/              # React components
│   ├── ui/                  # Primitive UI components
│   ├── form/                # Form components
│   ├── common/              # Shared components
│   ├── header/              # Header dropdowns
│   └── <feature>/           # Feature-specific components
├── layout/                  # App shell (sidebar, header)
├── context/                 # React contexts (Sidebar, Theme)
├── hooks/                   # Custom hooks
├── icons/                   # SVG icons (SVGR)
├── i18n/                    # Internationalization config
├── messages/                # Translation dictionaries
└── utils/                   # Utility functions
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production (`prebuild` runs ESLint first, so a lint error fails the build)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run the unit tests (`node --test`)

## Internationalization

This project uses `next-intl` for i18n. Supported locales:
- English (en) — served without a prefix
- Russian (ru) — served under `/ru`

Translation files are in `src/messages/` (`en.json`, `ru.json`), and the locale
list lives in `src/i18n/routing.ts`. Navigation primitives must be imported from
`@/i18n/navigation` rather than `next/link`, otherwise links lose the locale
prefix — the ESLint config enforces this.

## Deployment (Vercel)

1. **Environment variables** (Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
     `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`,
     `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID`
     — the client SDK config (see `.env.example`).
   - `GEMINI_API_KEY` — server-only, used by the AI routes.
   - `FIREBASE_SERVICE_ACCOUNT` — the service account JSON on a single line.
     The AI routes verify the caller's ID token with it; without it they answer
     `503 AI service not configured`.
2. **Firebase console**: add the deployment domain under Authentication →
   Settings → Authorized domains, otherwise the Google sign-in popup is
   rejected.
3. **Firestore rules**: paste `firestore.rules` into Firestore Database →
   Rules. They are plain owner-scoped rules (`users/{uid}/**` is readable and
   writable only by that same user) and there is no `firebase.json`, so this is
   a manual step.
4. **Runtime**: `/api/ai/*` declares `runtime = "nodejs"` (the token check
   needs Node) and a `maxDuration` of 30s for the Gemini call.

Note on rate limiting: `src/lib/rate-limit.ts` keeps its counters in memory, so
limits apply per serverless instance rather than globally. It protects against a
stuck client, not against a determined abuser — use a shared store (Redis, Vercel
KV) if the AI routes are exposed to real traffic.

## Styling

Uses Tailwind CSS v4 with theme tokens defined in `src/app/globals.css`. All styling uses CSS logical properties for RTL support.

## License

MIT