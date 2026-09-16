# LifeOS — Product Audit

**Product:** https://os-life-one.vercel.app (RU: `/ru`, EN: `/`)
**Repository:** `b4631119-oss/lifeOS`, audited at commit `ceb668e` on branch `main` (working tree: only `README.md` modified).
**Date:** 16 September 2026.

## Evidence rules used in this document

Every statement carries one of these labels:

- **Confirmed** — reproduced from source code, the local production build, an HTTP probe, or the live deployment.
- **Observation** — directly read from the code/live output, but its user impact is a matter of interpretation.
- **Potential risk** — plausible from the code, not reproducible with the access I had.
- **Recommendation / Hypothesis** — proposed, not verified.

### What I tested

| Did | How |
| --- | --- |
| Full source read | 197 project files; every component, hook, `lib/` module, both dictionaries, config, rules, service worker |
| Build / lint / tests | `npm test` → 35/35 pass; `npx eslint .` → clean; `npm run build` → success (prebuild runs ESLint) |
| Local production server | `next start -p 3100`, streamed through the in-app preview (real rendering, screenshots, DOM probes, console/network logs) |
| HTTP probes | Status codes, response headers, served HTML, asset availability, per-chunk JS byte sizes on `/`, `/ru`, `/ru/signin`, 404s, `/robots.txt`, `/sitemap.xml`, `/en`, `/fr`, `/ru/error-404` |
| Live deployment | `GET https://os-life-one.vercel.app/ru` — status 200, extracted title/description/readable text |
| Localization | Both dictionaries parsed and compared key-by-key (290 = 290 leaves, identical key sets) |

### What I could **not** test — and why

- **Any authenticated screen.** Sign-in is Google-only (`AuthContext`, `GoogleSignInButton`) and I have no account for this Firebase project, so I could not open Today, Schedule, Habits, Goals, Analytics, Notes or Profile as a signed-in user. Everything I say about those screens is derived from reading their code plus the rendered public pages. I cannot confirm runtime behaviour such as live Firestore updates, drag-and-drop feel, or how an empty/error state looks with a real account.
- **Mobile and tablet rendering / touch input.** The preview viewport I had was 638 × 868 CSS px. I did not test real devices or device emulation, so touch targets, virtual-keyboard behaviour, drag-on-touch and breakpoint transitions are **inferred from code**, not observed.
- **Core Web Vitals (LCP/INP/CLS).** I did not run Lighthouse or Chrome UX Report field data. I report only *payload* measurements (bytes over the wire), not rendering timings.
- **Firebase project configuration.** I read `firestore.rules` in the repo and `firestore.rules` looks correctly owner-scoped, but I cannot confirm the deployed ruleset, authorized domains, quota/billing settings, or whether any real data exists.
- **The deployed commit.** I could not map the live deployment to a git commit. The local production build I measured is this checkout; the live `GET /ru` reproduced the same title/description/empty-content finding, so that finding holds for both.

---

## 1. Full project discovery

**Stack (confirmed):** Next.js 16.3.4 (App Router, Turbopack, React 19.2, strict TypeScript 5.9), Tailwind CSS v4 (CSS-first `@theme` tokens in `src/app/globals.css`, no `tailwind.config`), Firebase 12 (Google Auth + Firestore), `next-intl` 4 with `localePrefix: "as-needed"`, `@dnd-kit` for the Schedule timeline, hand-rolled SVG charts (no charting library), installable PWA with a hand-written `public/sw.js`. Dependencies are few and all used — no suspicious or exotic packages.

**Structure:** `src/app/[locale]/` with route groups `(admin)` (app shell), `(full-width-pages)/(auth)` and `(error-pages)`; `src/components/<feature>/` (today, schedule, habits, goals, analytics, notes, user-profile, auth, landing); `src/layout/` (AppSidebar, AppHeader, Backdrop); `src/hooks/` (one subscription hook per collection); `src/lib/` (data layer `firestore.ts`, pure logic `habits.ts`, `analytics.ts`, `chart.ts`, `notes.ts`, `completionStamp.ts`, `date.ts`, `sidebar.ts`, `theme.ts`); `src/i18n/` (routing, navigation wrappers, languages); `src/messages/{en,ru}.json`; `src/types/lifeos.ts` (the whole data model); `src/proxy.ts` (next-intl middleware — Next 16's rename of `middleware.ts`).

**Data model (confirmed, `src/types/lifeos.ts`):** everything under `users/{uid}/…` — `tasks` (`title, startTime, endTime, status, date, createdAt, completedAt?`), `habits` (`name, active, createdAt`), `habitLogs` (`habitId, date, done`), `goals` (`title, description, deadline, subtasks[{id,title,done}], createdAt`), `notes` (doc id = `YYYY-MM-DD`, `content, aiSummary, createdAt`). **There is no `goalId` on tasks, no `areaId`, no project entity, no priority/importance field, no tags, no recurrence, no reminder, no estimate, no user settings document.**

**Quality observations (all confirmed):**

- No `any`, no `@ts-ignore`, no `TODO/FIXME/HACK` anywhere in `src/`.
- Business logic is extracted into pure modules with unit tests (`chart.test.ts`, `completionStamp.test.ts`, `notes.test.ts`, `sidebar.test.ts`, `authErrors.test.ts` — 35 tests, all passing, 362 lines).
- Real-time reads via `onSnapshot`; one-shot reads where a subscription would fight the UI (`useNotes`, `useAnalytics`) — and the comments explain why.
- Error handling is systematic: route-level `error.tsx`, `ErrorBanner` with retry, per-mutation error state in the hooks.
- Every module has an empty state, a loading state and a confirmation dialog (single shared `ConfirmModal`, single shared `Modal` with focus trap).
- Firestore queries use only single-field ranges (`date >=`) and rely on the fact that `YYYY-MM-DD` sorts lexicographically, so no composite indexes are needed. Doc ids double as dates for notes — one note per day by construction.
- **Technical debt present (confirmed):** a large residue of the TailAdmin Pro template this project was generated from — `AGENTS.md` describes ApexCharts/FullCalendar/Swiper routes and folders that no longer exist; `src/app/[locale]/(full-width-pages)/(error-pages)/error-404/page.tsx` is a leftover demo route; `public/images/user/owner.png|owner.jpg` are demo portraits used as the real avatar; several translation keys belong to UIs that were deleted; `Note.aiSummary` and a service-worker comment about "the AI routes" are leftovers of a removed AI feature.

---

## 2. Ordinary user audit

### First 5–10 seconds (measured on the local production build, RU)

For a signed-out visitor, `/` and `/ru` render the landing page — but only after hydration. **Confirmed:** the server-sent HTML for `/ru` contains a loading spinner (`animate-spin`), **zero `<h1>` elements**, and the landing copy exists only inside the React Server Component payload, not as markup. The live deployment behaves the same: fetching `https://os-life-one.vercel.app/ru` and extracting readable text yields only `Сегодня | LifeOS`.

Then, once hydrated (screenshot + DOM probe):

- Purpose is understandable: an `<h1>` "Планируйте день, держите привычки, доходите до целей", a one-paragraph subtitle, four module cards, and a Google button. It reads as a personal productivity app — not as "one system that helps you understand, organize, plan, execute and review your life".
- **Confirmed layout fact:** at a 638 px-wide viewport the primary call-to-action ("Войти через Google") has `top = 870 px` with a viewport height of 868 px — it is **below the fold**. On a phone (≈375–430 px wide) the four stacked cards push it further down. The only action a new user can take requires scrolling past the whole pitch, and the secondary "Уже есть аккаунт? Войти" link is below it as well.
- The landing advertises **4 of the 7 modules** (Today, Habits, Goals, Analytics). Schedule and Notes are missing, and Profile is not a feature to advertise — so the product looks narrower than it is, which is the safe direction, but the omission is inconsistent with a "one system" story.
- The logo is a solid blue rounded rectangle with the wordmark (`public/images/logo/logo.svg`) — legible, but it reads as a template placeholder rather than a brand.
- No product screenshot, no example, no "who is this for", no privacy/terms link. For a system that asks a user to put their life into it, there is no trust surface on the landing page beyond one sentence: "Вход только через Google — всё остаётся под вашим аккаунтом."

### First session

**Confirmed by code:** there is no onboarding of any kind. After the Google popup the user lands on `/` (Today) with a client-side auth guard, an empty task list, an empty progress card, and a "Add task" button.

The first-task flow is the clearest friction in the product: opening "Add task" shows **Title + Start time + End time + Status**. `TaskForm.validate()` (confirmed) rejects the form unless all of title, start and end are present, and rejects `endTime <= startTime`. So the minimum viable capture in the core module of a life-management system is "a named block with a start and an end". There is no quick-add, no capture inbox, no "someday" task, no natural-language or single-field entry, and no default duration on the Today page (the Schedule page *does* prefill a snapped time slot — that convenience exists in one module and not the other).

Dead ends and friction after that first task:

- The day is the only time horizon that exists anywhere in the product (**confirmed**: the only `type="date"` input in `src/` is the goal deadline; the only `addDays`/date maths in components are the habit grid window and analytics windows). A user cannot see yesterday, cannot plan tomorrow, cannot see a week.
- Unfinished tasks silently disappear. `useTodayTasks` subscribes to `where("date","==",today)`; no surface in the app lists any other date. A task not completed today is visible in no list ever again — it survives only as a data point in Analytics.
- The first habit, first goal and first note have their own empty states with a call to action (good), but nothing in the product tells the user how the modules relate, or why they should fill all five.

### Daily usage (as far as the model and code allow)

- **Morning:** Today shows the date, a greeting, two progress cards ("Задачи выполнены" 0%, "Время идёт" — hidden when the day has no tasks), and the task list ordered by `startTime`. That is the full morning briefing. It answers "what did I plan" but not "what should I do first", "how much load is this", or "which of these matters".
- **During the day:** the Schedule gives a real hour-by-hour timeline with a "now" line that ticks (confirmed: `useNowMs`, `NowIndicator`), and blocks are draggable with keyboard support and screen-reader announcements (`accessibility.announcements`, `screenReaderInstructions`). This is the strongest execution surface in the product. But the Today list does not mark the current or next task, and nothing tells the user what to do next.
- **Evening:** Analytics shows completion rate, tasks done, "most productive hour" and habit streaks; Notes lets the user write a few lines that autosave. Nothing prompts the user to look at what happened, nothing connects the note to the day's tasks, and nothing turns the day into a decision about tomorrow.
- **Time budgets:** 30 seconds is achievable only for ticking off a habit or completing a task (one tap). 5 minutes is enough to write a note, drag one or two blocks, or check Analytics. Actually *planning a day* (adding 5–8 timed tasks) is a 10–20 minute job because every task forces two time decisions, and there is no way to type a day's plan as a batch.

---

## 3. "What is missing?" — life-management gap analysis

I built the coverage table below from the data model and the rendered surfaces, not from the presence of pages.

| Area | Status | Why |
| --- | --- | --- |
| **Capture** | **Weak** | Capture exists only as "add a task with two times", "add a habit" (name only), "add a goal" (title/description/deadline), "type in today's note". No inbox, no unscheduled task, no idea/thought capture, no voice/quick add, no commitment outside today. The cheapest input in the whole app is a habit with one field — the core object (task) is the most expensive. |
| **Organize** | **Missing** | No areas of life, no projects, no tags, no contexts, no nesting beyond one flat `subtasks` array on a goal, no ordering, no search anywhere in the app. Structure = 5 flat collections. |
| **Prioritize** | **Missing** | There is no importance signal at all. `status ∈ {todo, in_progress, done}` is a progress state, not a priority, and `in_progress` duplicates the action of the Today checkbox (the checkbox writes `done`/`todo` and skips `in_progress`, so the middle state is reachable only through the form's select). Nothing distinguishes urgent from important; nothing sorts or filters. |
| **Plan** | **Partially covered, only for today** | The Schedule is a genuine hour-by-hour plan for one day, with drag + keyboard + snap + collision-aware column layout. Beyond today: nothing. No week, no month, no quarter, no year, no capacity, no template, no recurring plan. |
| **Execute** | **Covered (the strongest area)** | Today + Schedule + Habits give quick completion toggles, a live "now" line, optimistic drag with rollback (`pending`/`optimistic` in `ScheduleView`), real-time sync, and a per-day progress bar. |
| **Review** | **Weak** | Analytics is numeric-only over 7/30 days: completion %, tasks done, peak completion hour, habit streak table, plus a completion-per-day line chart with gaps for days with no tasks (a good decision). There is no list of what was finished, no day-by-day breakdown, no week boundary, no comparison of plan vs actual, no review prompt, no goals in the review at all. |
| **Reflect** | **Weak** | Notes is undirected free text, one per day, autosaved, with a collapsed history showing the first non-empty line. No prompts, no link to the day's data, no tags, no search, no "what did I learn". The user must invent their own reflective practice with no structure or reminder. |
| **Adapt** | **Missing** | Nothing can be rescheduled in bulk: no roll-over of unfinished tasks, no "push the rest of the day by 30 minutes", no recalculate-after-interruption, no option to drop or defer a task. Changing priorities means editing blocks one by one, or abandoning the plan. |
| **Recover** | **Missing** | After a missed day or week there is no re-entry path: no carry-over, no streak repair, no "welcome back", no summary of what was missed. Habits can only be toggled for *today* (`toggleHabit` uses `today`), so a forgotten check-in cannot be corrected retroactively. The day the user stopped is simply where the record ends. |
| **Long-term** | **Missing in practice** | Goals exist as a separate page with a deadline and a subtask checklist, but **no task, habit, note or analytic ever references a goal** (confirmed from `types/lifeos.ts` and every view). A long-term goal cannot influence today, and today cannot be shown to serve the goal. |
| **Redundant** | Small | `status: in_progress` vs the binary completion checkbox; the "Time elapsed" card next to "Tasks completed" (informative, but not actionable); Profile's address/social/2FA tables (pure noise, see §7). |

**Summary of the gap:** the system covers *Execute* well and *Plan* for a single day. Capture is expensive, Organize/Prioritize/Adapt/Recover are absent, and Long-term is a separate island. The conceptual flow **Capture → Organize → Understand → Prioritize → Plan → Execute → Review → Reflect → Adapt** is implemented as *Plan (today) → Execute → (numeric) Review*, with everything else missing.

---

## 4. System connectivity audit

Chains requested vs. reality:

- **Vision → Areas → Goals → Projects → Tasks → Actions → Results → Review** — **broken after Goals.** There is no Vision entity, no Areas, no Projects entity. Goals have flat subtasks that are *not* tasks; tasks have no `goalId`. A subtask cannot be scheduled, completed on Today, counted in Analytics or seen in the Schedule. The chain is two disjoint islands: `Goals → subtasks` and `Tasks(+Habits) → Analytics`.
- **Year → Quarter → Month → Week → Today** — **broken after Today.** Only `Today` exists. Tasks carry a `date` field and could hold any date, but no UI can create or display another one.

Answering the specific questions:

| Question | Answer (confirmed) |
| --- | --- |
| Can a long-term goal lead to an actual action today? | No. The goal's subtask list is the end of that path; nothing converts a subtask into a task and nothing links back. |
| Can today's actions contribute to a project? | There is no project concept. A task belongs to a date and a time, nothing else. |
| Can projects contribute to goals? | No projects exist. |
| Can completed work produce meaningful progress? | Only inside Goals (subtask → progress bar) and inside Analytics (aggregate %). Completing a Today task moves no goal. |
| Can review influence future planning? | In practice no: Analytics has no action, and the plan for a future day cannot be created anywhere. A user can read "last week you completed 61%" and has no way to act on it. |
| Real connections or separate pages? | Two real connections exist: Today and Schedule are two views of the same `tasks` subscription (correct and well done), and Analytics aggregates tasks + habit logs. Everything else is separate pages sharing only the auth user. |

**Broken connections, ranked by cost to the product:** Goals ↔ Tasks (highest), Day ↔ Day (no continuity), Notes ↔ everything (reflection is isolated), Analytics ↔ action (review never changes the plan), Habits ↔ any other module (a habit exists only inside its own page and the analytics streak table).

---

## 5. Real-life scenario test

Method: for each scenario I derived what the code would do. Where the answer depends on runtime behaviour I could not observe, I say so.

| # | Scenario | What LifeOS does today | Friction / missing | Is a new feature needed? |
| --- | --- | --- | --- | --- |
| 1 | Normal day | Today list + Schedule timeline + habit toggles + note. Works, and is the product's best case. | Nothing shows what is *next*; the user must read the times. | No — a "now/next" highlight is a change to existing UI. |
| 2 | 15+ tasks | A flat list sorted by start time, a % progress card. | No grouping by time of day, no filter/sort by status, no collapse, no bulk actions, no load total. Scanning 15 items is fine; *deciding* among them is unsupported. | No — sorting/filtering existing data would help. |
| 3 | Unexpected urgent task | The user opens Add task and fills title + start + end + status. | Minimum 4 decisions for an interrupting task; no priority marker; the rest of the plan is untouched and now silently overlapping. | No — optional times + a priority field would cover it. |
| 4 | Priorities suddenly change | Drag each block on the Schedule; or edit each task's times. | One-by-one, with no "shift the rest of the day", no bulk move, no way to mark what got dropped. | No — a bulk-shift action on the existing timeline. |
| 5 | User fails to complete the plan | Nothing happens. The tasks stay dated today, are gone from every list tomorrow, and are counted as failures in the completion rate. | No roll-over prompt, no "carry to tomorrow", no way to drop or defer. The user is punished in Analytics for work they never see again. | No — a day-end choice ("carry over / drop") over existing data. |
| 6 | User misses several days | Habit grid shows grey cells; the completion chart shows gaps (days with no tasks are `null`, not 0% — a genuinely good choice); the note history has holes. | No recovery path, no streak repair, no summary of the skipped period, no re-entry. | Partially — a short "catch-up" flow. |
| 7 | User becomes overloaded | Nothing measures load. The progress cards only compare done-vs-planned and elapsed-vs-scheduled. | No total planned hours, no capacity, no warning that the day is over-scheduled. | No — a computed "planned vs available hours" reading of existing data. |
| 8 | Large long-term project | A goal with a flat subtask list (only the first 5 shown until "Show N more"). | No nesting, no per-subtask dates or owners, no status, no task linkage, no history of progress. Not usable as a project. | Yes — but the minimal version is "goal completion/archive + subtask→task", not a project-management suite. |
| 9 | Multiple simultaneous projects | Goals stack in creation order, each with its own card. | No grouping, sorting, filtering, or progress-over-time; nothing tells the user which goal is at risk before its deadline passes. | No — sorting/filtering + deadline awareness. |
| 10 | Long-term personal goal | A deadline field and a progress bar, visible only if the user opens Goals. | The daily surface never mentions goals, so the goal cannot shape a day. | No — the missing piece is the *link*, not a new page. |
| 11 | Understand the previous week | Analytics: completion % per day (7/30), % done, peak hour, habit streaks. Notes: the user's own words. | No per-day detail, no "what did I actually finish", no week boundary (Mon–Sun) or comparison, no review template, goals absent. | Yes, weakly — a single read-only "week in review" panel over existing data. |
| 12 | Doesn't know what to do next | The Schedule's "now" line shows where the day is; the Today list shows everything equally. | Nothing highlights the in-progress or next block; nothing suggests breaking down the next block. | No — a next/late visual state on existing items. |

---

## 6. Long-term lifecycle audit

- **First day:** pleasant but thin — one list, one timeline, one habit, one note. The user sees a working tool.
- **First week:** the habit grid starts to show a pattern, Analytics fills in (though the "productive hours" chart stays empty until tasks are completed *after* `completedAt` existed, and it says so honestly: `hoursChart.noDataMessage`). Notes accumulate.
- **First month:** the note history becomes a long collapsed list (unbounded, no search, no pagination — see §12/§14), Analytics has a 30-day view, and the habit grid is capped at 12 weeks so history older than that is invisible in Habits but still counted in streaks (lookback is 365 days).
- **3 months / 1 year:** the system's usefulness does **not** grow with the data. The only surfaces that consume history are two 7/30-day charts and a streak table; everything the user wrote and did is stored but never read back in aggregate. There is no monthly or yearly view, no year-in-review, no "where did the year go".
- **Overwhelm:** the app never shows more than one day of tasks, so it cannot overwhelm by volume — but that is achieved by *hiding* data, not by organizing it. Once a goal list grows past a dozen goals, the Goals page becomes a long scroll with no filter.
- **Recovery from inactivity:** none (see §3/§5). The product has no concept of "returning".
- **Changing goals/priorities:** goals can be edited or deleted; there is no archive, no pause, no completion state (see P1 finding), and priorities do not exist as a concept.

**Answer to the central question:** as implemented, LifeOS trends toward *"a well-built tracker of the last 30 days plus a big database of forgotten tasks"*. The database of forgotten tasks is the stronger risk, because unfinished tasks leave every list and are retained only as failures in a percentage.

---

## 7. Senior product manager audit

**What problem does LifeOS solve today?** It answers "what did I plan for today, is my day on track, and are my habits holding?" — a day planner with habit streaks and a small analytics page. That is a real, coherent, if conventional, product.

**Who is it for?** Someone who already believes in day-planning with time-boxes and habit tracking, works alone, and has fewer than ~10 planned blocks a day.

**Hierarchy (my classification, with reasoning):**

- **Core:** Today (tasks for today), Schedule (the same tasks on a timeline), Habit toggling + streaks. These three produce the daily loop and share one collection.
- **Supporting:** Analytics (makes the loop visible over a week/month — but currently cannot change a decision), Goals (the only long-term surface — currently outside the loop), Notes (intended reflection surface — currently unconnected).
- **Secondary:** Profile's account info; language switcher; theme; PWA install.
- **Noise (as shipped):** Profile's Address table ("United States / Phoenix, Arizona / ERT 2489 / AS4568384"), the Personal-Information modal, Social Links (four `href="#"` icons), "Change Password", the 2FA switch, "Logout all devices", "Delete account" — all of them are inert (see §12/§13) and three of them advertise capabilities the product does not have. Also: the reachable demo route `/ru/error-404` with a broken illustration, and the orphan `/reset-password` page in a Google-only sign-in product.

**Product loops:**

- *Capture → Plan → Execute → Review → Improve*: only **Plan → Execute** is complete. Capture is too expensive, Review is numeric-only and read-only, and "Improve" has no surface at all.
- *Goal → Project → Task → Action → Result → Review*: **broken at both ends** — no Projects, and no Goal↔Task link.

**The single most important product statement I can make:** LifeOS has a working daily engine and a **disconnected long-term module**, and it has no mechanism by which yesterday informs today. Everything else in this report is downstream of those two facts.

---

## 8. Senior UI/UX designer audit (15+ years)

### Visual hierarchy

- Landing: h1 → subtitle → four identical cards → CTA. The cards are visually the heaviest element on the page (four bordered boxes), which competes with the only thing that matters to a visitor (sign in). The CTA is below the fold at 638 px width (confirmed measurement).
- App pages: each page opens with a breadcrumb-style `<h2>` title, then a subtitle paragraph, then a right-aligned `h2` + separator + page title (the breadcrumb component prints the page title **twice** — once as the heading, once as the current crumb), then the actual content, then the action button in a sub-header. On Today, the eye lands on the date/greeting + "Add task", which is correct. On Analytics, the "range switch" sits in the same row as the duplicated title, which is fine.
- **Observation:** every page repeats `Title | Title` (breadcrumb), which is noise in an app with a 7-item sidebar and no depth: breadcrumbs imply hierarchy that does not exist.

### Information architecture and naming

- Sidebar: Today, Habits, Schedule, Goals, Analytics, Notes, Profile — flat, one level, no groups (the "Menu" group heading exists but contains everything).
- Terminology is mostly honest, with three concrete mismatches: (1) the landing/`habits` description says "на сетке месяца" / "on a month grid" while the grid is explicitly **12 weeks** (`GRID_WEEKS = 12`, label "Последние {weeks} недель"); (2) RU mixes "серии" and "стрики" for streak (`habits.currentStreak` = "Текущая серия" vs `analytics.metaDescription`/`analytics.habits.title` = "стрики"/"Стрики"); (3) RU mixes "Процент выполнения" (landing) and "Доля выполненных" (`analytics.stats.completionRate`). EN/RU also disagree in metadata: `analytics.metaDescription` RU says "стрики", EN says "habit streaks" (fine), but `landing.modules.habits` EN says "month grid" — same error in both languages.
- The sign-in page's back link is labelled "Вернуться на главную" / "Back to dashboard" and points to `/`, which is the **landing page** for a signed-out user. Minor, but it is the first label a new user reads.
- Discoverability: the only way to reach the Schedule's create-task affordance ("click any empty hour") is the empty-state sentence and its hint; the Today page's plain "Add task" is easier. Nothing tells the user that Today and Schedule are the same data.

### Navigation

- Desktop: fixed sidebar 90 px collapsed / 290 px expanded, hover-expand, header with language, theme, user menu. Sound and consistent.
- Mobile (< 1280 px): the same sidebar becomes a drawer with a backdrop, scroll lock, and `inert`/`aria-hidden` when closed (`lib/sidebar.ts` + test). **Confirmed bug:** the drawer's close (X) button calls `setIsHovered(false)` instead of `toggleMobileSidebar()` (`AppSidebar.tsx`), so it does nothing except clear hover; the drawer can only be closed by tapping the backdrop or navigating. This is the top-priority *mobile* defect.
- Click depth: 1 click to any module; 1 modal for every create/edit. Nested screens: none. Back navigation: browser back works logically (real navigation, no client-side wizard state); modals do not intercept back (a back press with a modal open navigates away instead of closing it — a small, common gap).

### Consistency

Typography, spacing, radii, borders and shadows come from `@theme` tokens and are used consistently; dark mode variants are present throughout; the primary button, outline button, badge, card and modal are shared components. **Inconsistencies found:**

- Two distinct modal shells (`Modal` with focus trap, used by the modules; plus TailAdmin-era inline panels inside Profile's cards) and two visual languages on Profile (module style vs template style).
- The sidebar, header and modals still contain **inline hand-written SVG** even though the project has an icon barrel (`src/icons/index.tsx`) and an explicit rule against it — template residue, not user-visible, but it is the kind of duplication that produced the four near-identical confirm modals the project already cleaned up.
- Icon sizing is ad hoc in places (`h-4 w-4` vs `size-4` vs `h-3.5 w-3.5`) — cosmetic only.

### Component states

Verified by reading the components:

| State | Today tasks | Habits | Goals | Schedule | Notes | Analytics |
| --- | --- | --- | --- | --- | --- | --- |
| loading | text block | text block | text block | text block | text block | text block |
| empty | dedicated empty state + CTA | dedicated + CTA | dedicated + CTA | dashed notice | history empty text | dedicated empty state + "Go to Today" |
| error | `ErrorBanner` + retry | same | same | same + separate move-error banner | same | same |
| success/feedback | status badge + strikethrough | streak badge + grid cell | progress bar | announcement text (a11y) | "Saved at …" | charts |
| disabled/submitting | form disables while saving | — | inline "Saving…" | — | — | — |
| hover/focus | present (44 px icon buttons) | present | present | focus ring on blocks | present | charts are SVG (limited keyboard value) |

The state coverage is genuinely above average. Two gaps: no skeleton loaders anywhere (a plain sentence is used), and the TaskForm's validation error is a plain red paragraph with no `aria-live`/`aria-describedby` link to the field. Also, destructive confirm buttons are `h`≈44 px (`px-4 py-3`) while other buttons mix `py-2`/`py-3.5`.

---

## 9. Mobile / tablet / responsive audit

I could not test on real devices (see the limitations above), so this section is a code-level review with the one measurement I have.

- **Breakpoints:** Tailwind defaults plus custom `2xsm` (375), `xsm` (425), `3xl` (2000). The app's structural breakpoint is **`xl` (1280 px)**: below it the sidebar becomes a drawer (`DESKTOP_QUERY = "(min-width: 1280px)"`, hand-synced with the `xl:` classes). **Observation:** on a tablet in landscape (1024–1279 px) the whole app hides behind a hamburger, which is a poor use of a screen that has room for a collapsed rail; the collapse/expand affordance in the header does nothing below 1280 px (by design, `handleToggle` switches to `toggleMobileSidebar`).
- **Mobile navigation:** drawer + backdrop + scroll lock + focus/inert handling are implemented; the close button is broken (see §8). There is no bottom navigation; for a daily-planning app with 7 destinations, a bottom bar for the 3–4 core destinations would reduce reach distance — **recommendation, not a defect.**
- **Touch targets:** mixed. Task edit/delete buttons are 44 × 44 (`h-11 w-11`), the sidebar toggle and close are 44 × 44, and the habit "Today" toggle is ≈36 px tall (`px-3.5 py-2`) — below the 44 px guideline. The habit activity grid cells are **12 × 12 px** (`h-3 w-3`), 84 per habit; they are not interactive, but their date is exposed only via the HTML `title` attribute, which does not appear on touch and is not announced by screen readers — so on a phone the grid is a decorative pattern, not information.
- **Forms:** the task form stacks to one column below `sm`; `type="time"` inputs open the native picker (good). The form is inside a modal with `max-h`-less content — on a short phone viewport (e.g. 667 px tall) the modal container is `overflow-y-auto` at the page level (`fixed inset-0 … overflow-y-auto`), so it scrolls, but the dialog is anchored to the top (`items-start`) rather than centred or bottom-sheeted; with the virtual keyboard open this is the layout most likely to feel awkward. I could not verify it.
- **Tables/charts:** Analytics charts are SVG sized from a `useElementWidth` measurement of their container, so they reflow rather than overflow. The 24-bar hour histogram with 22 px max bars will be legible at ~360 px width but its x-axis labels are subset by `labelIndexes` (good).
- **Horizontal overflow:** the habit grid is wrapped in `overflow-x-auto` per habit card; the Schedule grid is `flex` with `min-w-0 flex-1` (no overflow); no fixed-width element is used in the task list (titles truncate/wrap). I found no element that obviously overflows, but see the caveat in §30 — "no overflow" is not the same as "good on mobile".
- **Touch drag (Schedule):** **Potential risk.** `ScheduleView` registers only `PointerSensor` (activation distance 4 px) and `KeyboardSensor`; there is **no `TouchSensor`**, while `ScheduleTaskBlock`'s comment says the drag "waits out the TouchSensor's 250 ms delay" and the block uses `touch-manipulation` (which still allows panning). The mismatch between the comment and the code is a strong hint that touch dragging was not verified. On a phone, dragging a block may scroll the page instead of moving the task. This is the one item in this section I would verify on a real device first.
- **Tablet:** no tablet-specific layout exists — it is the phone drawdown applied to a wider canvas, so a tablet gets a 290 px drawer over a 1024 px screen and a single-column list where two columns would fit.

---

## 10. UX research: five simulated users

Stated explicitly: these are **hypotheses derived from the implemented flows**, not user-testing results. I have not observed a real person using LifeOS.

| User | Onboarding | First task | Planning | Execution | Review | Return after absence |
| --- | --- | --- | --- | --- | --- | --- |
| **A — enjoys planning** | Loves the Schedule, immediately blocked by the mandatory times and by not being able to plan tomorrow. | Fine. | Wants a week view/templates; finds none; will export to another tool. | Satisfied by drag & drop, keyboard support, "now" line. | Wants per-day detail and plan-vs-actual; finds only aggregates. | Will rebuild manually; may accept it. |
| **B — procrastinates** | No onboarding, no nudge, no reminder system (there is not a single notification in the product). | 4 fields is enough friction to defer. | Plans optimistically; the tool records it without comment. | The only motivation is the streak badge and the % card. | Sees the failure as a lower percentage with no way to act. | **Abandonment risk highest here:** nothing brings them back, nothing forgives, nothing rolls over. |
| **C — too many responsibilities** | Overwhelmed by 7 modules with no explanation of how they connect. | Needs a priority or a place for "later"; neither exists; every task needs a time slot. | Cannot represent real load; no capacity view. | The flat list of 15+ items has no resume/recovery affordance. | Cannot find which project is at risk — there are no projects. | No recovery. Likely to keep a separate notes app for commitments. |
| **D — long-term goals** | Reads "Goals" and builds a goal tree; discovers it is disconnected from the day. | Fine. | Wants "this week serves goal X"; impossible. | Same as A. | Wants progress over time and milestones; only a subtask % exists. | No continuity surface; the goal page is where it was. |
| **E — dislikes productivity systems** | The landing page's promise ("one system … plan, habits, goals") is the good hook; the mandatory time fields are the wall. | Requires two clock decisions to write down a to-do — this is where this user leaves. | Will not use the Schedule. | Might use the habit toggle and a note. | Will not open Analytics. | Returns only if the entry cost drops. |

Converging conclusions: the product is optimised for **User A and D's enthusiasm**, not for the users with the most friction (B, C, E). The cheapest single change for B/C/E is making the time fields optional (§21).

---

## 11. Behavioural / psychology audit (product behaviour only)

- **Cognitive load / decision fatigue:** the heaviest decision in the product (start + end time) is required at the most fragile moment (capture). Every task is a scheduling decision; the app never separates "what to do" from "when".
- **Overwhelm:** low by construction — only today's data is shown. But the *Goals* page has no cap, sort or filter, and Profile is a wall of meaningless fields; those are the two places that can visually overwhelm.
- **Procrastination & the 30-unfinished-task test (the critical one).** With 30 unfinished tasks the product does **not** help: they cannot be seen together (only today's), cannot be prioritized (no field), cannot be bulk-rescheduled (only one drag at a time on the timeline), cannot be removed in bulk, and are not converted into a realistic plan (no capacity, no "only the 3 that matter"). Instead they reappear as a **lower completion percentage** in Analytics. The evidence is structural: `useTodayTasks` filters `date == today`; `LifeTask` has no priority; `ScheduleView` moves one task per drag; `AnalyticsView` divides `done/total` over the window. **This is the product's central behavioural risk: it makes failure more visible than success, and less recoverable than failure.**
- **Guilt/ perfectionism:** a broken habit streak shows as grey cells and a reset counter with no repair mechanism; a missed day is a permanent hole in the note history; the completion rate has no "context" (a 30-task day and a 3-task day are equally weighted in `buildDailyCompletionSeries`, and the summary `percent` is a single pooled number).
- **Progress visibility:** genuinely decent where it exists — `DayProgress` compares done-vs-planned and elapsed-vs-scheduled; goal cards show a % via a progress bar with `role="progressbar"`; streaks use a "current/best" pair rather than a single shaming number. These are good design decisions worth keeping.
- **Habit formation:** the habit module is honest (no gamification, no fake rewards, archive instead of delete, history preserved). It is missing the two supports that matter: retroactive check-in (a forgotten tap cannot be fixed) and a reminder of any kind.
- **Over-planning:** nothing prevents it and nothing surfaces it. A day with 14 planned hours looks identical to a day with 3.
- **"Managing LifeOS as another job":** the number of surfaces (7 modules, section headers, breadcrumbs, profile tables) implies more maintenance than the daily loop actually needs. The product's own data model needs 2 collections for a working day (tasks + habitLogs); the interface suggests a much heavier system.

---

## 12. Senior software engineer / architect audit

**Architecture.** Layering is clean and consistently applied: `types` → `lib/firestore.ts` (all Firestore calls, one file, mapping functions with defensive defaults) → `hooks/` (subscriptions + mutations + error state) → feature components (presentational, split by responsibility) → route pages (server components that only set locale + metadata). Pure logic is extracted into `lib/habits.ts`, `lib/analytics.ts`, `lib/chart.ts`, `lib/notes.ts`, `lib/completionStamp.ts`, `lib/date.ts` and unit-tested. This is well above average for a project of this size, and the comments explain *why* (e.g. why Notes is not a subscription, why `completedAt` is stamped in one place, why the habit grid offsets by `getDay()`).

**Duplicated code (confirmed):**

1. The three subscription hooks (`useTodayTasks`, `useHabits`, `useGoals`) each re-implement the same `loading / error / attempt / reload / run(action)` scaffold — ~40 duplicated lines each.
2. Firestore access is split across `lib/firestore.ts` (sync facade) and `lib/firebaseConfig.ts` (async loaders) with **two different singleton caches** (`app`/`auth` locals in each file). `GoogleSignInButton` bypasses `lib/authActions.ts` entirely and re-implements `signInWithGoogle` with `import("@/lib/firebase") + import("firebase/auth")`, while `UserDropdown` re-implements the sign-out the same way, a third time, instead of calling `signOutUser()`. `AuthContext` uses yet another path (`getFirebaseAuth`).
3. Two "delete confirmation" modalities remain: the shared `ConfirmModal` for module deletes and the inline template panels on Profile.

**Huge components (confirmed sizes):** `UserMetaCard.tsx` ≈ 300 lines of mostly static JSX; `UserDropdown.tsx` ≈ 300 lines with four inline SVG icons; `ScheduleView.tsx` ≈ 330 lines (acceptable, it is the drag controller); `GoalCard.tsx` ≈ 300.

**Dead code / doc drift (confirmed):**
- `GoogleSignInButton.prefetch` creates an `AbortController` that is never used or aborted, and warms `@/lib/firebase` — which statically imports `firebase/app`, `firebase/auth` **and** `firebase/firestore`. So "prefetch the auth chunk" actually prefetches Firestore; the intended `preloadAuthSdk()` from `lib/authActions.ts` is used by the reset-password form but not here.
- `Note.aiSummary` is written (`saveNote(..., isNew)` sets `aiSummary: null`) and mapped, and never read or rendered (only tests reference it). `public/sw.js` still explains why "the AI routes" are skipped; those routes do not exist.
- `global-not-found.tsx`'s comment says the route is enabled by `experimental.globalNotFound` in `next.config.ts`; `next.config.ts` has no such flag (it is stable in Next 16).
- `AGENTS.md` documents a TailAdmin Pro template (ApexCharts, FullCalendar, Swiper, `(ui-elements)` route groups) that does not exist in the codebase.
- Unused translation keys (grepped, no UI references them): `header.searchPlaceholder`, `header.notifications.*` (5 keys), `common.filter`, `common.seeAll`, `auth.errors.google`. `goals.archive/archived/archivedHint/reactivate` are also unreferenced — they describe a feature that was never built (§16).

**State management.** Source of truth is Firestore; the hooks hold server state; local UI state is component-local; two contexts (`ThemeContext`, `SidebarContext`) hold genuine cross-cutting UI state; `AuthContext` holds the user. No unnecessary global state, no Redux-like indirection. Optimistic updates exist exactly where they matter (Schedule drag) with correct rollback and pruning against the snapshot. The Notes hook deliberately avoids a subscription to prevent echo-fighting the cursor, and serializes writes through a promise chain so a slow save cannot overwrite a newer one — verified by reading `useNotes`.

**Fragile logic / correctness risks (confirmed):**

- **Midnight rollover:** `useTodayTasks`, `useHabits` and `useNotes` compute `todayKey()` in a `useMemo(..., [])`, so an app left open across midnight keeps yesterday's date: new tasks are created with *yesterday's* date, habit toggles write to yesterday's log, and Notes keeps saving into yesterday's document. Only a reload fixes it. Real for a PWA that a user leaves open overnight — which is exactly the PWA use case the manifest promotes.
- `getTasksSince`/`getNotes` have no `limit()`: Notes loads the **entire** history into memory and renders every collapsed row on each page visit; analytics loads 30 days unconditionally.
- Deleting a habit reads **all** habit logs, then issues one delete per log — O(n) round trips, and a partial failure leaves orphaned logs (the habit document is deleted last, so the failure mode is orphaned logs, not lost habits).
- `updateTask` optimistically toggling status relies on `tasks.find(...)` in the hook for `previousStatus`; if two status writes race, `completedAt` can be stamped twice. Low likelihood, real.
- No optimistic UI for the task checkbox or habit toggle (they wait for the snapshot) — on a slow connection, tapping a habit shows nothing until the write lands. Cosmetic but it is the app's most frequent action.
- `TaskForm` reads `task?.status` into `useState` once; the parent remounts it via `key`, so this is handled — worth keeping in mind during refactors.

**Type safety.** Strict TypeScript, no `any`, no casts except well-commented `as` uses (e.g. `value as TaskStatus` from a select, Firebase snapshot field casts guarded with `??`). Mapping functions default every field. Good.

**Data.** Schema is flat, denormalised-free, and relationships are implicit (task has no parent). Validation is client-side only (see §13). No migrations exist or are needed yet — but the additive `completedAt?` field shows the author already understands the forward-compatibility problem. Deletion is immediate and irreversible for tasks, goals and notes; habits delete their logs first. There is **no undo anywhere** in the product.

---

## 13. Security audit

Classified strictly by evidence.

**Confirmed strengths:**

- `firestore.rules` scopes everything to `users/{uid}` and its direct subcollections, requiring `request.auth.uid == uid`; nothing else in the database is exposed. No collection is world-readable. **Observation:** rules allow any field/value inside a user's own documents — a malicious user can only corrupt their own data, so impact is low.
- No server-side API routes exist at all (`/api/*` is not implemented), so there is no server secret, no SSRF surface and no unprotected endpoint. The only secrets are the public Firebase client config, which is not a secret.
- The single `dangerouslySetInnerHTML` in the app is a static theme-init script with no user input. No `innerHTML` for user content anywhere; React escapes task titles, notes and goal text by default, so stored-XSS via task titles is not evident. No SQL/NoSQL injection surface (no dynamic queries, no string-built paths; document ids come from Firestore).
- The service worker refuses to handle cross-origin requests and `/api/*`, never caches POST/`RSC` payloads, and its own response is served with `no-cache` (`next.config.ts`).

**Confirmed issue (privacy, P0):** the deployed UI hard-codes a real person's identity into the client bundle and shows it to every user — name ("Melibaev Bilolidin"), a personal Gmail address (`b4631119@gmail.com`), a phone number (`+996559679787`), a city ("Bishkek, Kyrgyzstan") and a stock portrait, in `UserDropdown.tsx` and `UserMetaCard.tsx`. This is not a vulnerability in the classic sense; it is definite personal-data exposure and a broken product (every user sees someone else's identity as their own).

**Potential risks — requires verification (no exploitation attempted):**

1. **No abuse/cost ceiling.** Any authenticated user can create unlimited tasks/notes/logs (unbounded write rate, no rules-based validation, no App Check configured in `next.config.ts` or the client, no rate limiting). Impact is operational: quota exhaustion and cost, not data breach. I did not test whether App Check or quota alerts are configured in the Firebase console.
2. **No security headers.** `next.config.ts` sets headers only for `/sw.js` — no `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`/`frame-ancestors` or HSTS directive specific to the app. With no user-generated HTML rendering in the app and Firebase's own hosting headers, the practical impact is low, but the app is framable and has no defense-in-depth. Whether Vercel's defaults add some of these depends on the deployment configuration I could not inspect.
3. **Client-side trust.** Authorization is enforced only by Firestore rules; every business rule (e.g. "end must be after start", "one habit log per day", "one note per day") is enforced in the browser. `habitLogs` in particular is *not* guaranteed unique per habit/day by the schema: `toggleHabit` does read-then-write with no transaction, so two devices toggling the same habit concurrently can create two `done` logs for the same day (a data-consistency issue, not a security one). The note-per-day invariant, by contrast, is enforced structurally by the document id.
4. **No account lifecycle.** Firestore rules permit the user's own data to be read only while authenticated; there is no data export and no deletion path (the "Delete account" button is inert, §7/§12), which is a GDPR/data-rights gap rather than a vulnerability — but it is worth stating plainly: a user cannot delete their account or their data from the product.

**Explicitly not claimed:** I found no evidence of an IDOR, no injected secrets, no XSS, no insecure storage of credentials (no password storage at all — Google-only), and no permissive rule that grants cross-user access. I did not perform any destructive or intrusive testing.

---

## 14. Performance audit (measured values only)

Environment: this checkout, `npm run build` then `next start -p 3100`, local network, no compression-as-measured separately noted. These are **payload** sizes, not rendering timings.

| Route | Script chunks | Total JS (uncompressed) | Largest chunk |
| --- | --- | --- | --- |
| `/ru` (guest landing) | 17 | **1,434,935 bytes** | `05kw2zgjsokwp.js` — **546,464 bytes** |
| `/ru/signin` | 12 | not summed | largest is `1j_9b-l0n6u-t.js` at 228,922 bytes; **the 546 KB chunk is not loaded** |

- With `Accept-Encoding: gzip` the 17 chunks of `/ru` total **≈434,542 bytes over the wire**; the `/ru` HTML is 34,331 bytes uncompressed and **8,970 bytes gzipped**.
- **Confirmed root cause:** `grep` on the built chunks shows `firestore.googleapis.com` inside `05kw2ztjsokwp.js` — the 546 KB chunk. The landing page renders *inside* `(admin)/AdminShell`, whose `AuthProvider` statically imports `@/lib/firebase` (→ `firebase/app`, `firebase/auth`, **`firebase/firestore`**). So the one page that should be the lightest public entry point ships the Firestore SDK, contradicting the deliberate lazy-loading design documented in `lib/authActions.ts` and applied to `/signin`. **This is a measured regression against the project's own performance intent**, and it is the single largest bundle problem.
- Positives: no charting/calendar/date-picker library in the bundle (charts are hand-rolled SVG, saving what the code comments put at ~940 KB; the icon set is SVGR-converted SVGs); fonts are self-hosted via `next/font` (no third-party font request); images are SVGs or `next/image`; `TodayView` is dynamically imported to keep Firestore out of `/` (per the commit history) — an intent that the `AdminShell` dependency then defeats.
- List rendering: all lists are unpaginated `.map()`; Analytics computes everything in memory over ≤30 days of tasks (fine); Notes renders the full history (unbounded, see §12); the habit grid renders 84 spans per habit plus `computeCurrentStreak`/`computeBestStreak` **per habit card** (each O(n) over up to 365 days) inside a `useMemo` — fine at 10 habits, but it is per-card work that `AnalyticsView` already does centrally.
- No caching layer beyond the service worker's shell caching; Firestore's own offline cache is not enabled explicitly (it is on by default in the web SDK, so repeated reads are served locally — an observation, not verified in this environment).
- **What I did not measure:** LCP/INP/CLS, time-to-interactive, real-network transfer sizes from Vercel's CDN, or Firestore query latency. No numbers are invented here.

---

## 15. QA / edge-case audit

Verified by running the production build and probing it; anything depending on a signed-in account is marked as inferred.

**Verified against the running build:**

| Case | Result |
| --- | --- |
| Unknown URL (`/ru/nonexistent-page`, `/fr`, `/xx/foo`, `/ru/dashboard`) | 404 with the global bilingual 404 page, correct `lang` attributes inside — **but the outer `<html lang>` is `en` for Russian paths** (there is no locale for this page, so this is a design trade-off, not an oversight). |
| Legacy `/en`, `/en/foo` | 307 → `/`, `/foo` (correct `as-needed` behaviour). |
| `/ru/` (trailing slash) | 308 redirect — consistent, no duplicate content from slashes. |
| `/robots.txt`, `/sitemap.xml` | **404** (missing). |
| `/images/error/404.svg`, `/images/error/404-dark.svg` | **404** — referenced by `[locale]/not-found.tsx` and rendered on the reachable `/ru/error-404` route (screenshot: broken-image icon, `naturalWidth === 0`). |
| `/ru/error-404` | HTTP **200** on a leftover demo route (indexable, contains a broken image). |
| `/favicon.ico`, `/manifest.webmanifest` | 200. |
| Empty states | All modules define one; the landing/auth pages render correctly with no user. |
| Refresh / deep link | Static prerender + client-side data fetch, so any route can be refreshed directly. |
| Browser back with a modal open | Navigates away instead of closing the modal (no history integration) — inferred, not observed. |

**Inferred from code (not observed):**

- **Midnight rollover** (see §12) — the most likely "QA bug a user will hit".
- **Timezone:** `date` and `startTime` are stored as local-time strings with no zone, so a user who travels west will see their plan shift; two devices in different zones will disagree about "today". For a personal single-device app this is acceptable, but it is a documented non-goal rather than a solved problem.
- **Concurrent edits:** two devices editing the same task produce last-write-wins per field; the Schedule's optimistic `pending` map protects the local view only. Two devices toggling the same habit can create two logs for one day (no transaction).
- **Double submit:** every create/edit path has an `isSubmitting`/`isDeleting` guard (TaskForm, ConfirmModal, ResetPasswordForm) — good; the habit toggle and the task checkbox have **no** in-flight guard, so rapid tapping issues repeated writes (idempotent for the checkbox via the snapshot value, but `toggleHabit` reads `logs` state and can compute a stale inversion).
- **Long strings / special characters:** task and goal titles are plain React text (escaped) and CSS-truncated; the schedule block truncates with `truncate`. No length limit is enforced server-side, so an extremely long title is stored and rendered truncated — acceptable.
- **Huge numbers of tasks:** the Analytics charts handle up to 30 days; nothing breaks, but the Notes full-history load and the per-list unpaginated render degrade linearly.
- **Deleted entities:** deleting a goal deletes its subtasks with it; deleting a habit deletes its logs (read-all-then-delete-many); there is no "deleted task still referenced" path because nothing references tasks.
- **Network failure:** `ErrorBanner` + retry exists everywhere, and hooks keep the previous data while showing the error; the service worker serves a cached shell offline, and cached pages then show loading states (no offline banner telling the user they are offline).
- **Expired session:** `onAuthStateChanged` flips the guard to redirect to `/signin`; any in-flight write will fail and surface as a hook error. Not observed.

---

## 16. Accessibility audit

**Serious barriers (would block or badly degrade an AT user):**

1. **No `aria-current` on the active sidebar link** (`AppSidebar.tsx`) — a screen-reader user navigating 7 links cannot tell which page they are on. Trivial to fix.
2. **Server-rendered pages have no content to announce**: `/` and `/ru` server HTML contains a spinner and **no `<h1>`**; every authenticated page has the same property (its data arrives client-side). For a no-JS/AT-sequential-reading user the product is empty. (This is also the SEO issue, §18.)
3. **Form error communication**: `TaskForm` renders validation errors as plain paragraphs, with no `aria-live`, no `aria-describedby`, and no `aria-invalid` on the inputs. The only programmatic feedback for AT users is thus absent — a keyboard/screen-reader user can submit and get silence.
4. **Unlabeled controls:** the task form's status `Select` has a visual `<Label>` with no `htmlFor`/`id` association, so it is announced without a name; the "Tasks completed"/"Time elapsed" progress bars have `role="progressbar"` with values but **no accessible name** (a user hears "50 percent" without knowing of what).
5. **Habit activity grid**: 84 × 12 px spans per habit whose only date information is a `title` attribute (`formatShortDay`) — `title` is not reliably exposed to screen readers and never appears on touch. The grid is effectively unreadable non-visually, and the habit card's status ("Done today") is the only accessible summary.
6. **No `prefers-reduced-motion` handling anywhere** (`grep` finds no media query in `globals.css`), while the UI animates `transition-all duration-300/500`, sidebar slides, sidebar/collapse transitions, modal fade and the drag "lift" effect.

**Minor improvements:**

- The `Modal` has `role="dialog"` + `aria-modal="true"` and implements a focus trap + focus restore (good), but it has **no accessible name** — no `aria-labelledby` pointing at the visible `<h3>`.
- The Schedule is the most accessible surface in the app and is worth praising: dnd-kit keyboard sensor with a custom coordinate getter, `screenReaderInstructions`, and localized drag announcements (`dragging`, `dropped`, `dragCancelled`).
- Contrast: light-grey `text-gray-400`-on-white (e.g. the sidebar group heading "Меню", habit-grid legend text) is likely below 4.5:1 for small text; the primary `brand-500` on white is ~3:1 for the link text in the landing's "Войти". I did not run a contrast analyzer, so this is an **observation** based on the token values, not a measured failure.
- Focus visibility: interactive elements use `focus:ring-3` tokens (present on inputs, schedule blocks, buttons via `focus:ring`); the plain icon buttons in the header rely on the browser default outline. Mixed.
- Language/switching: `<html lang>` is correct per locale (`ru`/`en`, verified), the direction attribute is present (`dir="ltr"`, RTL plumbing kept for future locales), and the 404 page sets per-block `lang` attributes for its two languages — a genuinely careful detail.

---

## 17. Bilingual / internationalization audit

**Architecture (confirmed):** `next-intl` v4, `locales: ["en","ru"]`, `defaultLocale: "en"`, `localePrefix: "as-needed"`; dictionaries in `src/messages/<locale>.json`; navigation primitives must come from `@/i18n/navigation` (enforced by an ESLint rule, verified working — no `next/link`/`next/navigation` imports exist outside the allowed spots); `setRequestLocale` is called in every layout/page to keep static rendering; `generateStaticParams` prerenders both locales for every route (build output: `/en/*` and `/ru/*`).

**Completeness (verified programmatically):** 290 leaf keys in `en.json`, 290 in `ru.json`, **identical key sets** — no key exists in one language only. This is a strong result: it means no missing-key fallback ever fires, and no screen silently mixes languages at the key level.

**Problems found:**

1. **Unused keys (confirmed by grep):** `header.searchPlaceholder`, `header.notifications.*` (title, requestsPermission, project, minAgo, hrAgo, viewAll), `common.filter`, `common.seeAll`, `auth.errors.google`, and — describing a feature that does not exist — `goals.archive`, `goals.archived`, `goals.archivedHint`, `goals.reactivate`. Carrying translated copy for a non-existent "archived goals" feature is the kind of residue that makes a translator's job impossible to verify.
2. **Terminology drift in both languages:**
   - "month grid" vs the real 12-week grid (`landing.modules.habits` in EN *and* RU, while `habits.activityTitle` says "Последние 12 недель" / "Last 12 weeks").
   - RU mixes "серия" (`habits.currentStreak` = "Текущая серия") and "стрик" (`analytics.habits.title` = "Стрики привычек", `analytics.metaDescription`), and the analytics page uses both in one screen.
   - RU mixes "Доля выполненных" (`analytics.stats.completionRate`) with "Процент выполнения" (landing card for the same metric).
   - `auth.backToDashboard` ("Вернуться на главную") points at the landing page for signed-out users, not a dashboard.
3. **Layout expansion:** no string overflow was found in the rendered pages (the sidebar has a fixed 290 px width with 7 short labels; buttons wrap; the landing's 4 cards stack). The riskiest strings are the long RU labels in the narrow mobile drawer and `profile`'s table labels in the mobile Profile layout — **not verified on a narrow viewport**; the container-level `flex-wrap`/`truncate` usage makes overflow unlikely, but "unlikely" is not "verified". RU is on average ~10–15 % longer than EN in the affected keys (`habits.currentStreak` "Текущая серия" vs "Current streak"), and the shortest supported width is 375 px.
4. **Date/time/number localization:** `Intl.DateTimeFormat` is used for day labels, short days, clocks and history dates with the active locale — correct and consistent (`lib/date.ts`). Hour labels come through `formatTime`, so the "productive hours" chart axis is localized too. **Observation:** the *day boundary* is the user's device local time; there is no locale-aware week start (the habit grid is hard-coded Sunday-first via `getDay()`), which is wrong for RU users (Monday-first) — a real, small localization defect visible in both languages.
5. **Pluralization:** both dictionaries use ICU plural forms with the correct Russian categories (`one/few/many/other`), verified in `habits.days`, `schedule.taskCount`, `goals.viewMore`, `notes.history.count`. `analytics.stats.ofTotal` uses a plain `{done} of {total}` placeholder (fine).
6. **Language switching:** the switcher uses `router.replace(pathname, { locale })`, so the current page is preserved (verified by code and by the URL after a switch); the locale is carried in the URL for RU and by cookie/`Accept-Language` for EN. Both switchers (header and user menu) duplicate the same logic.
7. **Metadata localization:** every page has a localized `title`/`description` from its own namespace (verified by fetching all 10 RU pages: "Вход | LifeOS", "Цели | LifeOS", …). **But** the home route's metadata describes the *dashboard*, while guests get a landing page (§18) — an EN/RU-inconsistent-in-both-languages problem.

---

## 18. Senior SEO specialist audit

Everything here is verified against the local production build **and** spot-checked against the live deployment.

### Technical SEO

| Item | Finding |
| --- | --- |
| `robots.txt` | **404 — missing** (`src/app/robots.ts` does not exist). |
| `sitemap.xml` | **404 — missing** (`src/app/sitemap.ts` does not exist). |
| Canonical tags | **None anywhere** (no `alternates`/`metadataBase` in any `generateMetadata`). |
| `hreflang` | **None** (0 occurrences in the served HTML for `/ru`). Nothing tells a search engine that `/` and `/ru` are translations of one document. |
| Language declaration | `<html lang="ru">` / `lang="en"` is correct per locale (verified). The global 404 page is `lang="en"` on Russian URLs. |
| Indexability of the public page | `/` and `/ru` return 200 and are indexable, **but contain no server-rendered content** (spinner only) — so both are thin/near-empty documents. |
| Locale URLs | `as-needed`: EN at `/`, RU at `/ru`; `/en` → 307 to `/`. Duplicate-URL risk exists precisely because no canonical or hreflang disambiguates them. |
| Trailing slash | `/ru/` → 308 to `/ru` — consistent. |
| Duplicate/leftover URLs | `/en/error-404` and `/ru/error-404` (HTTP 200, demo content, broken image) are indexable leftovers; `/en/*` duplicates every page as a redirect rather than a canonical. |
| Rendering | Content is client-rendered after a Firebase auth round trip; a crawler that executes JS will still see almost nothing useful until the auth check resolves. |
| HTTPS | Served over HTTPS on Vercel (verified). |
| Status codes | 200 for existing, 404 for unknown, 307/308 for locale redirects — correct. |

### Metadata

- Titles are present, localized and unique per route (verified for 10 RU routes). They follow `"{Page} | LifeOS"`.
- Descriptions are present and localized (100–160 chars).
- **Confirmed mismatch:** the home route's title/description describe the *Today dashboard* ("Сегодня | LifeOS" / "Ваш обзор дня — задачи, привычки и цели") while an anonymous visitor — i.e. every crawler — receives the *landing page*. The live deployment returns exactly this title and description. So the product's most important page is mislabelled in search results and in link previews.
- **No Open Graph, no Twitter card, no `og:image`, no `metadataBase`.** Sharing the app on Telegram/WhatsApp/X produces a bare link with the wrong title. Given a Russian-speaking audience, this matters more than the missing sitemap.
- No structured data at all. **Recommendation:** do *not* add `SoftwareApplication`/`FAQPage` markup merely to have markup. The only schema that would accurately describe the public page is a `SoftwareApplication`/`WebApplication` entity for the product itself — worth adding *only* once the landing page has real indexable content (see below).

### Headings

- Public pages: the landing page has **one `<h1>`** (the value proposition) and `<h2>` per module card — correct hierarchy, but **only after hydration**; the server HTML has no `<h1>` at all.
- App pages: `<h2>` page titles (from `PageBreadcrumb`) plus section `<h3>`/`<h4>` inside cards. There is **no `<h1>` on any app page** — acceptable for a dashboard, undesirable if those pages are ever meant to rank.
- Titles are duplicated in the breadcrumb (`<h2>` + the same string as the current crumb) — noise for both users and crawlers.

### Content

- **What can actually rank today: essentially nothing.** The only public document is the landing page, and an anonymous fetch returns a title, a description and no readable content. There is no pricing page, no feature page, no use-case page, no documentation, no blog, no FAQ, no "about", no legal pages. Search engines can crawl the app's routes but every one of them is an empty shell behind auth.
- The product communicates its value well *to a human with JS and a few seconds to wait*, and communicates nothing to search engines. The gap is content + server rendering, not keyword optimization.
- **SEO architecture:** the routing is ready for content (a locale-prefixed, statically-rendered App Router with metadata wired per route). What is missing is (a) server-rendered marketing content, (b) the technical plumbing (robots/sitemap/canonical/hreflang/og), and (c) an information architecture for content — e.g. one page per module (каждая функция), one page per audience, and a small set of guides. **Do not** mass-produce SEO pages; this product needs 6–10 substantive pages first.

### Core Web Vitals

Not measured (no Lighthouse/CrUX data collected). The one *payload* signal I have is directly relevant to LCP: the public landing route loads 17 script chunks totalling 1.43 MB uncompressed (~434 KB gzip). I make no claim about the resulting LCP number.

---

## 19. Senior product marketing audit

**Positioning as communicated (landing page):** "Plan the day, keep the habits, reach the goals" + "a personal life management system: one place for the daily schedule, habit streaks, goals and the numbers that show what is actually working." That is honest and specific — better than the generic "all-in-one productivity" claim, and notably it does *not* promise AI, collaboration, or integrations.

**What LifeOS actually is (from the audit):** a single-user day planner with time-boxed tasks, habit streaks, a small analytics page, a disconnected goals checklist and a daily journal. **Observation:** the landing's promise ("one place for … goals and the numbers that show what is actually working") over-claims relative to the product in exactly the places that matter: goals are not part of the daily loop, and the numbers cover tasks and habits only — you cannot see whether your *goals* are working.

**5–10 second test:** *what* it is — yes, mostly ("personal life management system" + 4 module cards). *Why it matters* — weakly: no pain statement, no before/after, no example day. *What I can do with it* — only via generic feature blurbs, and the primary action is below the fold at 638 px.

**Target segments (hypotheses, no evidence of actual users):**

| Segment | Problem | Value | Barrier | Why try | Why leave |
| --- | --- | --- | --- | --- | --- |
| Google-account solo planner (Notion/Google-Calendar refugee) | Scattered plan + habits | One place, no setup, real-time | Must adopt *their* model (mandatory times, today-only) | Zero-cost Google login, clean UI | Cannot plan ahead; leaves to export a week |
| Habit-tracker user | Streak accountability | Nice grid + streaks, archive-safe | Streaks are only reachable on one page; no reminders; no retro-fix | Habit module is genuinely good | Misses a day, cannot repair, streak lost |
| Personal-development / goal-setters | Big goals never become actions | Goals page with subtasks | Goals do not touch daily work | Attractive goal editing | Realizes the goal page is an island |
| Journaling / reflection user | Wants a short daily log | Autosaving daily note | No prompts, no search, no linking | Frictionless writing | History becomes an unsearchable list |
| Power user with many commitments | Needs a system that scales | — | No projects, priorities, filters, search, or bulk actions | Landing page sounds right | Immediately hits the ceiling |

**Cost of learning vs value:** the cost is low (Google login, no setup wizard, no empty configuration). The value ceiling is reached in days, not months — which is why "churn after one week" is a plausible risk and why the *first-week* experience (see §6) is the marketing problem, not the acquisition copy.

**Aha moment:** the best candidate is *planning the day hour-by-hour on the Schedule and dragging a block to a new slot* — it is the one interaction that demonstrates the product's thesis, and it exists only after the user has (a) signed in, (b) created 3+ timed tasks, and (c) navigated to Schedule. That is **~8–10 actions and 2 pages** after sign-in. The second candidate — the habit grid filling in — requires a week of use and cannot be the acquisition moment. Making the Schedule the post-signup destination for a user with a first task, or seeding a small example day, would collapse the distance to the aha moment considerably.

**Differentiation:** real but narrow — (1) time-boxed drag-and-drop planning that also has full keyboard support, (2) one Google login with owner-scoped data and no server, (3) no setup/configuration at all, (4) habits treated gently (archive, history preserved, current+best streaks). Everything else looks like the category default (TailAdmin-derived visual shell, sidebar + cards + charts).

**Funnel friction:** Discovery — the app is unfindable and unshareable (no OG, no content). Understanding — the landing is thin and its CTA is below the fold. Signup — one tap, excellent. Onboarding — absent. First value — the mandatory times block the fastest path. Habitual use — no reminders, no next-action cues, no weekly ritual. Retention — no recovery mechanism after a gap. **The funnel is strongest exactly where products usually fail (signup) and weakest where retention actually forms.**

**Trust:** mostly honest copy, no fake social proof, no invented statistics, a PWA manifest, an open GPL-3 license and a public repository — these are positive signals. Undermining trust: the landing has no privacy/terms link; **the header and profile show a stranger's name, email and phone number as "your" account** (a serious credibility and privacy signal); and four Profile controls (change password, 2FA, logout-all, delete account) pretend to work. Marketing must not promise what the product cannot do — the same principle applies to the *product's own interface*.

---

## 20. Consistency check: product vs interface vs marketing vs search engines

| Claim / source | What it says | Reality |
| --- | --- | --- |
| README | "My modules: Today, Habits, Schedule, Goals, Analytics, Notes, Profile" | Accurate. |
| README | "everything … behind one Google sign-in, with every document owner-scoped in Firestore" | Accurate and verified in `firestore.rules`. |
| Landing | "one place for the daily schedule, habit streaks, goals and the numbers that show what is actually working" | The daily schedule and streaks are one place; goals are a separate island never referenced by the schedule; the numbers cover tasks/habits only. **Partial over-claim.** |
| Landing (habits card) | "Track streaks on a month grid" / "на сетке месяца" | The grid is explicitly **12 weeks**. **False.** |
| Landing | 4 module cards | The app has 7 modules (Schedule and Notes are unadvertised). **Under-claim / inconsistency.** |
| Interface (Profile) | "Change Password", "Two-factor authentication", "Logout all devices", "Delete account", "Edit Personal Information", "Edit Address" | None of these do anything. **The interface promises six capabilities the product does not have.** |
| Interface (header) | The user's name, email and avatar | A hard-coded stranger's identity. |
| Search engines (`<title>`, description) | "Today | LifeOS" / "Your daily overview — tasks, habits and goals" | The visitor receives a landing page, not a dashboard. |
| Search engines (crawl) | — | Nothing to read: the landing is client-rendered and its server HTML is a spinner. |
| Interface (Goals) | Translation keys exist for Archived/Reactivate | No such feature exists. |

**Conclusion:** the product's *writing* is unusually careful and self-consistent, but four contradictions are visible to users — the Profile control surface, the false "month grid" claim, the invisible Schedule/Notes in the pitch, and the metadata that describes a page the visitor cannot see.

---

## 21. Simplification audit

### REMOVE

1. **Profile's inert control surface** ("Change Password", 2FA switch, "Logout all devices", "Delete account") — either implement or remove; as shipped it is pure noise that damages trust (§7, §20). Removing the 2FA toggle in particular costs nothing and removes a false security claim.
2. **Profile's Address table and its edit modal** (country/city/postal/Tax ID with the values "United States / Phoenix, Arizona / ERT 2489 / AS4568384") and the Social Links block (four `href="#"` icons) — a life-management app does not need a billing address, and the data is a template placeholder.
3. **`/reset-password`** — sign-in is Google-only, so a password reset cannot be needed; the page is unreachable from the UI anyway. Removing it also removes an indexable page in a product that has none.
4. **The leftover demo route `(error-pages)/error-404`** (HTTP 200, indexable, broken image) — `global-not-found` already covers 404s.
5. **Dead i18n keys and dead fields** (10+ keys listed in §17, `Note.aiSummary`, the "AI routes" comment in `sw.js`, `public/images/user/owner.*` once the real avatar is wired).
6. **`status: in_progress` as a UI concept** — keep the field for compatibility, but the middle state adds a third decision to the task form while the checkbox only ever writes `todo`/`done`. Either use it (e.g. "currently working on") or drop it from the form.
7. **The duplicated page title** (heading + breadcrumb crumb) on a 7-item flat navigation — the breadcrumb adds nothing without depth.

### SIMPLIFY

1. **Make task times optional.** One change removes the single biggest friction in the product, makes "capture" viable, and turns the Schedule into a *timed* view of the day rather than the place times must come from. (Keep `startTime`/`endTime` as fields; treat empty strings as "unscheduled". Today's list sorts untimed tasks last; the Schedule shows only timed ones plus an "unscheduled" rail.)
2. **One add-task flow with progressive disclosure** — title first (Enter to save), times/status behind "more". The Schedule already prefills a slot; the Today page should be able to create an untimed task in one field.
3. **Unify the two language switchers** (`LanguageSwitcher` in the header duplicates the sub-menu inside `UserDropdown`) and the three sign-in/sign-out code paths into `lib/authActions.ts`, which already exists for exactly this purpose.
4. **Merge the two progress cards** on Today into one "plan vs. reality" reading (completed % alongside elapsed % in one card), freeing the strongest visual slot for the next action.
5. **Extract the shared subscription scaffold** from the three hooks (loading/error/attempt/reload/run).

### MERGE

- **Today and Schedule** are already the same data — do not merge the pages, but merge their *entry points*: one "add" affordance whose times are optional, plus a link from a task to its Schedule position.
- **Notes and Review**: the daily note is the natural home of a weekly review; today they are unrelated surfaces.
- **Goals and Analytics**: a goal's progress belongs on the review surface; today Analytics ignores goals completely.

### AUTOMATE (without AI)

- Carry-over of unfinished tasks to today (a one-tap prompt at day start or day end) — purely deterministic.
- A "planned vs available hours" load readout from existing `startTime`/`endTime` data.
- Habit check-in reminder and a retroactive "mark yesterday" tap (both need only existing data + a reminder mechanism, §22).
- Week-start localization (Monday for RU) from the existing locale.

### KEEP

The Schedule (drag + keyboard + announcements + snap + "now" line + optimistic writes), the shared `Modal` (focus trap, focus restore, scroll lock, Escape), `ConfirmModal`, `ErrorBanner` + retry, the per-module empty states, the archive-instead-of-delete habit model, current+best streak pairing, the gaps-instead-of-zeros completion chart, the doc-id-as-date note invariant, the owner-scoped rules with no server, and the "no AI, no integrations, no configuration" restraint.

---

## 22. Future automation (what is genuinely worth automating, and when)

Rule applied: nothing goes on this list unless a concrete user problem is attached, and nothing is listed as "AI" that a deterministic rule can do.

| Problem | Automation | Needs AI? | Verdict |
| --- | --- | --- | --- |
| Unfinished tasks vanish and are counted as failures | Roll over to today with a prompt; or drop | No | **Do now** (Phase 1) — it is the product's central defect. |
| Repeated identical days (workday, gym, weekly review) | Recurring tasks / day templates | No | **Do now-ish** (Phase 1–2) — the highest-value "automation" and it is pure data modelling. |
| Habit check-ins forgotten | Reminder (needs a notification mechanism — none exists today) | No | Phase 2–3; requires a delivery channel (web push/PWA notifications) that has infrastructure cost. |
| Planning 8 tasks one by one | Duplicate yesterday / apply a template | No | Phase 2. |
| Overloaded day | Compute planned hours vs available; warn on save | No | Phase 1 — arithmetic on existing fields. |
| "What happened last week?" | Deterministic weekly summary from stored data | No | Phase 2. |
| Free text → structured plan (typing "gym at 7, report by 11") | Natural-language parsing | Yes (or brittle rules) | **Not now.** High cost, and the current bottleneck is that times are mandatory, not that typing is slow. |
| Stale tasks / forgotten goals | Deterministic "untouched for 30 days" surfacing | No | Phase 3, if at all. |
| Task→next-slot suggestion when something slips | Deterministic free-slot search over existing times | No | Phase 2, and only after times become optional. |
| Semantic search of notes | Embeddings | Yes | **Not now** — the notes corpus is tiny and the real gap is that notes are unlinked to data. |

**Explicit non-recommendation:** do not build an AI chat/assistant layer over a system whose core loop (goal → day → review) is not yet connected. It would add a surface without fixing a chain.

---

## 23. Gap hunter: ideal realistic system vs current LifeOS

Ideal = what a strong personal life-management system must do for a single motivated person, expressed in capabilities, not features.

| Capability | Current LifeOS |
| --- | --- |
| Capture anything in < 3 seconds | **Missing** (4 fields, times mandatory) |
| Keep unplanned commitments somewhere | **Missing** (no inbox/backlog) |
| Group life into areas/projects | **Missing** |
| Prioritize by importance, not only time | **Missing** |
| Plan a day at a glance, then adjust | **Covered** (Schedule) |
| Plan the coming week | **Missing** |
| See what is next right now | **Covered partially** (Schedule "now" line; nothing on Today) |
| Carry work forward / drop it consciously | **Missing** |
| Reflect on the day in writing | **Covered partially** (undirected note) |
| Review the week/month with real data | **Covered partially** (numbers only, no detail, no goals) |
| Track recurring commitments | **Covered** (habits) |
| Correct a missed habit check-in | **Missing** |
| Connect daily work to long-term goals | **Missing** (broken chain) |
| Close a goal, celebrate, archive it | **Missing** (no completion state) |
| Recover after days or weeks away | **Missing** |
| See progress over months/years | **Missing** |
| Work on a phone | **Covered partially** (drawer with a broken close button; unverified touch drag) |
| Work in Russian and English | **Covered** (290 = 290 keys, localized dates/plurals, metadata per page) |
| Be usable by keyboard and screen reader | **Covered partially** (great drag a11y, no `aria-current`, unnamed dialogs/progressbars, unannounced errors, 12 px grid cells) |
| Earn trust with account/data controls | **Contradictory** (inert controls + a stranger's identity) |
| Be found and understood | **Missing** (nothing indexable, no OG) |

---

## 24. Blind-spot audit (things a checklist would miss)

1. **The landing page is a spinner to every crawler and to any user on a slow connection.** Everyone spot-checks `/ru` in a browser and sees a nice hero; the server HTML has no `<h1>` and no copy. This is invisible in a visual review and fatal to acquisition.
2. **`/` is the dashboard route *and* the landing route.** The guest landing is rendered by the `(admin)` shell's auth guard, so the landing page inherits the dashboard's metadata, its providers, and the Firestore SDK. One architectural choice explains three separate findings (wrong title, empty content, 546 KB chunk). Any fix must move the landing out of `(admin)` (a separate route group/layout) rather than patch the metadata.
3. **The "one note per day" invariant, done well, hides a habit-log invariant done badly.** Notes are race-free by document id; `habitLogs` can be duplicated for one day by two devices, and the app reads "first match wins" (`logs.find`). The same author solved the same problem twice, once structurally and once not.
4. **The habit grid is decorative on a phone and silent for a screen reader** (12 px spans + `title`). Eight-four elements that *look* like data.
5. **Streak integrity depends on an invisible 365-day lookback.** `computeBestStreak` only sees the loaded window (`STREAK_LOOKBACK_DAYS = 365`), so "best streak" is silently wrong for a user who returns after a year — a year of history is truncated with no indication. The same is true of the 12-week grid: older history exists in Firestore but no surface can ever show it.
6. **The Schedule's stale comment about TouchSensor** (a comment describing code that isn't there) is exactly the kind of drift that will make a future developer believe touch drag was handled.
7. **Two independent caches of the Firebase app/auth instance** (`lib/firebase.ts` and `lib/firebaseConfig.ts`) that happen to converge because they import the same modules — an accidental invariant protected only by a comment.
8. **`completedAt` makes the "productive hours" chart unfixable for existing users**: every task completed before that field was added is excluded forever (the code says so honestly). A new user of a young product will read "Not enough data yet" for days — and the empty-state text is the only thing preventing that from looking broken.
9. **Analytics' pooled percentage is systematically unfair.** `summarizeTasks` divides all completed tasks by all planned tasks in the window, so six easy days plus one 20-task day reads as one number that describes no actual day. The per-day chart is the honest view; the headline card contradicts it.
10. **`suppressHydrationWarning` on the date/greeting lines** (Today, Schedule) and the theme script mean the first paint can differ from the hydrated DOM — correct engineering, but it means screenshots/SEO tools see a different page than the user.
11. **The migration-time bomb**: tasks created before `completedAt` existed will never appear in the histogram; habit logs from before the 365-day window will never be visible. Any future retention/long-term view must handle this explicitly.
12. **Nothing in the UI says the data is private**, and yet the most visible personal surface (the header) shows someone else's email address. The trust signal and the trust violation are on the same screen.
13. **The PWA shell caches `/ru/...` pages by URL, and the app has no offline indicator.** A user who opens the installed app offline sees a cached shell with a spinner and no explanation of *why* nothing loads. (The service worker's design is otherwise careful and correct.)
14. **`sw.js` precaches seven routes × two locales on install** — 14 navigations on the first visit, on the exact page (`/ru`) whose bundle is already heavy.

---

## 25. Final problem matrix

| # | Problem | Category | Evidence | User impact | Tech/Business impact | Priority | Recommended solution |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | A stranger's identity (name, personal Gmail, phone, city, photo) is shown to every user as "their" account | Trust / Privacy | `UserDropdown.tsx` (name, email, `owner.png`), `UserMetaCard.tsx` (name, email, phone, bio, location) | Users see someone else's data as theirs; privacy exposure of a third party | Credibility, GDPR/PII exposure, screenshots will be shared | **P0** | Wire the real Firebase user (`displayName`, `email`, `photoURL`) through a context/hook; delete the demo values |
| 2 | Profile's six controls are inert (edit personal info, edit address, change password, 2FA, logout-all, delete account) | Product / Trust | `UserMetaCard.tsx`/`UserAddressCard.tsx` `handleSave` = `console.log`; `Security.tsx` button has no handler; 2FA is local state; `DangerZone.tsx` buttons have no handlers | Users believe they changed a password or enabled 2FA; no way to delete an account | Fake functionality; data-rights gap; support burden | **P0** | Remove the inert surfaces now; implement account deletion/export later if required |
| 3 | The only public page renders a spinner server-side and has no indexable content; its metadata describes the dashboard, and the live deployment behaves identically | SEO / Marketing / Architecture | Local: `/ru` HTML contains `animate-spin`, 0 `<h1>`, copy only in the RSC payload. Live: `GET /ru` text = "Сегодня | LifeOS". Metadata comes from `(admin)/page.tsx` | New visitors wait on a blank screen; search engines index nothing | Zero organic acquisition; wrong link previews | **P0** | Move the landing out of `(admin)` into its own public route/group, server-render its hero copy, give it its own metadata |
| 4 | No robots.txt, sitemap.xml, canonical, hreflang, or Open Graph/Twitter metadata | SEO | `/robots.txt` 404, `/sitemap.xml` 404, 0 `hreflang`, 0 `og:` in the served HTML; no `alternates`/`metadataBase` in any `generateMetadata` | Shared links show the wrong title; `ru`/`en` pages are not related for search engines | Invisible product; duplicate-content ambiguity | **P1** | Add `robots.ts`, `sitemap.ts`, `metadataBase` + `alternates.languages` per route, OG/Twitter images |
| 5 | The public landing ships the Firestore SDK: 546,464-byte chunk containing `firestore.googleapis.com`, 1,434,935 bytes of JS (17 chunks) on `/ru` vs 12 chunks on `/ru/signin` | Performance | Measured on the local production build; `grep` of the built chunk | Slow first load on mobile; violates the project's own lazy-loading design | Largest single bundle problem; LCP risk unmeasured but real | **P1** | Move the landing out of the `(admin)` layout (same fix as #3), so `AuthProvider`/Firestore is not in the public entry |
| 6 | The mobile drawer's close (X) button does nothing | Mobile / Bug | `AppSidebar.tsx`: `onClick={() => setIsHovered(false)}` | Every phone user who taps X is stuck until they find the backdrop | Obvious first-day bug | **P1** | Call `toggleMobileSidebar()`; add a regression test |
| 7 | There is no way to view or plan any day other than today; unfinished tasks leave every list forever and reappear only as failures | Product core | `useTodayTasks` → `where("date","==",today)`; no date navigation in any component; only the goal deadline has a date input; Analytics pools `done/total` | Cannot plan ahead; missed work is invisible and unrecoverable | Breaks the core loop; retention risk | **P0** | Day navigation (prev/next/today) + carry-over/drop prompt for unfinished tasks |
| 8 | Goals have no connection to tasks or to any other module; there is no goal completion/archive state | Product core | `LifeTask` has no `goalId`; `Goal` has no status; `GoalsView` renders all goals; `goals.archived*` keys unused | Long-term goals cannot shape a day; finished goals stay forever | The "one system" promise is unmet | **P0** | Optional `goalId` on tasks (+ subtask→task), a goal `status` with archive, and goal progress on the review surface |
| 9 | Creating a task requires title + start + end (+ status); the same add flow is more convenient on Schedule than on Today | UX / Capture | `TaskForm.validate()` rejects missing times; `ScheduleView` prefills a snapped slot, `TodayView` does not | Highest-frequency action has the highest cost; blocks capture and planning | Directly depresses first-value and daily usage | **P0** | Make times optional, add one-field quick add on Today, sort untimed tasks last |
| 10 | No weekly/monthly review surface and no reflection structure; Analytics is numeric-only and goals are absent | Product core | `AnalyticsView` = tasks + habits over 7/30 days; 2 charts + 4 stat cards; notes are unrelated free text | Users cannot answer "how did the week go?" with detail, and cannot turn it into next week's plan | Review loop missing ⇒ habit formation weak | **P1** | A single read-only "week in review" panel (days, completions, habits, notes, goals) + prompts in the daily note |
| 11 | Landing/habits copy says the habit grid is a "month grid" / "сетка месяца" while it is 12 weeks; RU mixes "серия"/"стрик" and "Доля"/"Процент"; `auth.backToDashboard` points at the landing | Localization / Copy | `landing.modules.habits` (en+ru) vs `GRID_WEEKS = 12`; `habits.currentStreak` vs `analytics.habits.title`; `analytics.stats.completionRate` vs landing card | Users are told something false; terminology feels inconsistent | Erodes trust in a product about accuracy | **P2** | Correct the grid wording, standardize on "серия/привычка-seрия" (or "стрик") per screen, rename the back link |
| 12 | Habit check-in cannot be corrected retroactively; streaks cannot be repaired; a missed day is permanent | Product / Recovery | `toggleHabit` uses `today` only; `HabitActivityGrid` is read-only | One forgotten tap resets the user's motivation with no remedy | Churn driver for the habit audience | **P2** | Allow backfilling the last N days from the grid |
| 13 | Analytics' headline completion % pools all days into one number that contradicts the per-day chart | Product / Data | `summarizeTasks` → `done/total` over the window; `buildDailyCompletionSeries` is per-day | Misleading feedback; a 20-task day distorts the reading | Weakens the review loop's credibility | **P2** | Show a median/per-day average alongside the pooled number, or label it "tasks completed in range" |
| 14 | The 404 illustration is missing (`/images/error/404.svg`, `404-dark.svg` 404) on a reachable, indexable route (`/ru/error-404`, HTTP 200) | Quality / SEO | Verified: chunks reference the files, `naturalWidth === 0`, screenshot shows the broken-image icon | Broken page for anyone who lands there | Visible sloppiness on an error path | **P2** | Delete the demo route; fix or drop the image references |
| 15 | Notes loads the entire history on every visit and renders it unpaginated; analytics loads 30 days with no limit; habit deletion does one delete per log | Scalability / Data | `getNotes(uid)` with no `limit()`; `getTasksSince`; `deleteHabit` loops `deleteHabitLog` | Slower pages and more reads as history grows; partially failed deletes orphan logs | Cost grows with tenure — the opposite of a long-term system | **P2** | Paginate/limit the note history, batch the habit-log deletion |
| 16 | An app left open across midnight keeps writing yesterday's date (tasks, habit logs, notes) | Bug / QA | `todayKey()` captured in `useMemo(..., [])` in three hooks | Silent data misattribution for PWA users | Corrupts analytics and streaks | **P2** | Recompute the day key on visibility/focus and on a timer |
| 17 | Accessibility: no `aria-current` on the active nav link, unnamed dialogs and progress bars, form errors not announced, no `prefers-reduced-motion`, 12 px unlabeled grid cells | A11y | `AppSidebar.tsx`; `Modal` (no `aria-labelledby`); `DayProgress` progressbars; `TaskForm` error paragraphs; `globals.css` has no media queries | Screen-reader and reduced-motion users are degraded | Legal/quality risk; small effort to fix | **P2** | Add `aria-current`, label dialogs/progressbars, wire `aria-describedby`+`aria-invalid`, add a reduced-motion block |
| 18 | Touch drag on the Schedule is unverified and likely unreliable (only `PointerSensor`, stale TouchSensor comment, `touch-manipulation`) | Mobile / Risk | `ScheduleView` sensors; `ScheduleTaskBlock` comment | The app's signature interaction may not work on a phone | Undermines the best feature on the primary device | **P1** | Verify on a device; add `TouchSensor` with an activation delay and `touch-action` handling |
| 19 | No prioritization anywhere (no importance field, no sort/filter/group/search in any list) | Product / UX | `LifeTask` has no priority; no search UI (`header.searchPlaceholder` is unused); lists are plain `.map()` | Users with many commitments cannot decide what matters | Blocks the "too many responsibilities" segment | **P1** | One importance field (3 levels) + sort/filter on Today and Goals; defer full search |
| 20 | Dead code/residue: unused i18n keys (incl. the non-existent goals archive), `Note.aiSummary`, "AI routes" comment, `AGENTS.md` describing another template, `GoogleSignInButton.prefetch` burning an unused `AbortController` while warming Firestore, three duplicate auth code paths | Maintainability | §12, §17 greps | None directly; slows every future change and hides intent | Technical debt; misleads contributors | **P3** | Delete the residue; route all auth through `lib/authActions.ts` |
| 21 | No loading skeletons, no offline indicator, no undo for destructive actions, no bulk operations | UX polish | Text-only loading states; `deleteTask`/`deleteGoal` are immediate; SW serves a cached shell silently offline | Users cannot tell "working" from "broken"; mistakes are permanent | Feels unfinished; accident cost | **P3** | Skeleton for lists, an offline banner, a short undo window for deletes |
| 22 | The landing advertises 4 of 7 modules and no trust/content surface (no privacy/terms, no example, CTA below the fold at 638 px) | Marketing | `LandingView` modules array; measured CTA `top = 870` in an 868 px viewport; no legal links anywhere | The product undersells and under-explains itself; the primary action is hidden | Conversion loss on the only acquisition page | **P1** | Restructure the landing: hero + CTA above the fold, one concrete example day, all real modules, privacy/terms links |

**Priority reasons (summary):** P0 items are either a trust/privacy violation (#1, #2), the product's central structural gap (#7, #8), its highest-friction daily action (#9), or the total absence of a public presence (#3). P1 items block a specific large audience or a core promise (mobile drawer, goal-link review, prioritization, touch drag, SEO plumbing, performance). P2 items degrade quality, correctness or a subset of users. P3 items are debt and polish.

---

## 26. Keep / Remove / Improve / Add

### KEEP (verified strengths)

- The **Schedule**: drag & drop with 15-minute snapping, keyboard sensor with a custom coordinate getter, localized screen-reader announcements, collision-aware columns, a ticking "now" line, snap-to-relevant-hour on first paint, optimistic writes with rollback and stale-position pruning.
- The **shared UI primitives**: `Modal` (focus trap, focus restore, scroll lock, Escape, `role="dialog"`), `ConfirmModal`, `ErrorBanner` + retry, per-module empty states, `Badge`, `Button`.
- The **data layer discipline**: every Firestore call in one module, defensive mappers, owner-scoped rules, no server, single-field range queries that need no composite indexes, doc-id-as-date for notes, `completedAt` stamped in exactly one place.
- The **habit model**: archive instead of delete, history preserved, current+best streaks, honest empty states.
- The **review honesty**: days with no tasks are gaps in the chart, not 0 %; the "productive hours" chart explains why it is empty.
- The **i18n foundation**: 290 = 290 keys, ICU plurals incl. Russian `few/many`, localized dates/times/axes, per-route localized metadata, locale switch preserving the current page, ESLint-enforced navigation imports.
- The **engineering hygiene**: strict TS, no `any`/TODOs, passing tests for pure logic, clean lint, real comments explaining intent, no unnecessary dependencies, no AI bolted on.

### REMOVE

- Profile's inert controls and template content (address, socials, 2FA, delete account, logout-all, edit-personal-info) — or implement them; shipping them is not an option.
- The orphan `/reset-password` page (Google-only auth) and the leftover `/error-404` demo route.
- Unused translation keys (notifications, search placeholder, filter, seeAll, `auth.errors.google`, `goals.archived*`).
- `Note.aiSummary`, the "AI routes" comment, `public/images/user/owner.*`, the duplicated `owner.png` avatar wiring.
- The duplicated page title (heading + breadcrumb) in a flat 7-item app.
- `status: in_progress` from the task form unless the app actually uses it.

### IMPROVE

- **Task capture:** optional times, one-field quick add, times prefilled consistently on both Today and Schedule.
- **The landing page:** correct metadata, above-the-fold CTA, real module list, one concrete example, privacy/terms.
- **Today:** show what is next / what is late; merge the two progress cards; add sorting/filtering for large days.
- **Analytics:** per-day detail, a fairer headline metric, goals included, and an action ("plan tomorrow").
- **Notes:** prompts, linkage to the day's plan and habits, and a bounded/paginated history.
- **Goals:** completion/archive state, sorting, deadline awareness, and a visible link to today's work.
- **Habits:** retroactive check-in, week-start localization (Monday for RU), accessible grid cells.
- **Performance:** move the landing out of the authenticated shell; add limits to the unbounded reads.
- **A11y:** `aria-current`, dialog/progressbar names, announced validation, reduced-motion support.
- **Trust:** real user identity, an offline indicator, undo for deletions.

### ADD (each with the user problem it solves)

1. **Day navigation (yesterday / next day / today).** *Problem:* a user cannot plan tomorrow or look back at a day, so the plan can only ever be reactive. Minimal scope: a date control on Today and Schedule over the same `date`-keyed data that already exists.
2. **Carry-over / drop of unfinished tasks.** *Problem:* work the user did not finish disappears from view and is scored as failure; there is no way to consciously reschedule or abandon it. Minimal scope: a prompt listing yesterday's open tasks with "bring to today" / "drop".
3. **Task ↔ Goal link (one optional `goalId`, plus optional subtask→task conversion).** *Problem:* long-term goals cannot influence any day and no day can be shown to serve a goal. Minimal scope: a goal picker on the task form and a goal progress read-out on Today.
4. **A weekly review panel (read-only, over existing data).** *Problem:* users cannot reconstruct a week: what was planned, what slipped, which habits held, what they wrote. Minimal scope: one screen aggregating 7 days of tasks, habit logs, notes and goals, with a short written prompt.
5. **A single importance level on tasks (3 values) with sort/filter.** *Problem:* a user with 15+ tasks and no priority field cannot decide what matters; the product's own 30-task scenario has no answer. Minimal scope: one field, one sort control, one filter chip.

Explicitly **not** recommended now: AI features of any kind, collaboration/sharing, calendar sync, OKR/framework layers, gamification, a project-management suite, tags in addition to importance before importance is proven useful, and any new module before items 1–5 are done.

---

## 27. Top 10 improvements (ordered by expected impact, not preference)

1. **Remove the fake identity and the fake account controls; wire the real Google user.** Problem: #1/#2 in the matrix. Evidence: hard-coded name/email/phone; `console.log` handlers; handler-less buttons; a local-only 2FA switch. Impact: the app becomes trustworthy and usable for a second user; removes PII exposure. Complexity: low (a few hours). Dependencies: none (`AuthContext` already exposes `displayName`/`email`/`photoURL`). Priority reason: it is the only issue that is simultaneously a privacy exposure, a product defect, and a credibility risk.
2. **Make today's plan reachable across days (day navigation + carry-over).** Problem: #7. Evidence: `where("date","==",today)`; no date UI; missed tasks invisible. Impact: unlocks planning tomorrow and makes missed work recoverable instead of punitive. Complexity: medium (data already supports it; UI + one prompt flow). Dependencies: none. Priority reason: it is the difference between a daily tracker and a life-management system.
3. **Make task times optional and add one-field quick add.** Problem: #9. Evidence: `TaskForm.validate()`; the Schedule/Today asymmetry. Impact: the highest-frequency action drops from 4 decisions to 1; capture, backlog and planning all become possible. Complexity: low-medium (sorting rules for untimed tasks; Schedule must handle "untimed"). Dependencies: touches Today, Schedule, Analytics (untimed tasks in `total`). Priority reason: smallest change with the largest effect on daily use.
4. **Move the landing out of the authenticated shell: server-rendered content + its own metadata + a CTA above the fold.** Problem: #3 (plus #5 and part of #22). Evidence: spinner-only HTML, 0 `<h1>`, dashboard title live and locally, 546 KB Firestore chunk on the public route. Impact: the product becomes findable, shareable and fast to load. Complexity: medium (route-group move, metadata, hero copy). Dependencies: none. Priority reason: currently the product is invisible to acquisition and to search.
5. **Connect Goals to the daily loop (task→goal link + goal completion/archive).** Problem: #8. Evidence: no `goalId`; no goal status; unused `goals.archived*` keys. Impact: the "one system" promise becomes true; goals get closed instead of accumulating. Complexity: medium. Dependencies: the review surface benefits from it but does not block it. Priority reason: it is the largest broken chain in the requested architecture.
6. **A weekly review panel over existing data.** Problem: #10. Evidence: Analytics = 2 charts + 4 stat cards, goals absent; notes unlinked. Impact: closes the review→plan loop, which is the retention mechanism. Complexity: medium. Dependencies: day navigation and the goal link make it much stronger. Priority reason: without it the product has no ritual.
7. **Fix the mobile drawer close button and verify/patch touch dragging on the Schedule.** Problem: #6/#18. Evidence: `setIsHovered(false)`; `PointerSensor`-only sensors with a stale TouchSensor comment. Impact: the primary device becomes usable; the signature interaction works on a phone. Complexity: low (one function call) + medium (touch drag verification). Dependencies: device testing. Priority reason: mobile is where a daily system is actually used.
8. **SEO plumbing + share metadata (robots, sitemap, canonical, hreflang, OG, `metadataBase`).** Problem: #4. Evidence: `/robots.txt` 404, `/sitemap.xml` 404, 0 hreflang, 0 `og:`. Impact: crawlability and correct link previews for both languages. Complexity: low. Dependencies: best done together with #4 (the landing). Priority reason: cheap, and it is the difference between "indexable" and "invisible".
9. **Give the product a priority dimension (one field) with sort/filter.** Problem: #19. Evidence: no priority field; no search/sort/filter UI. Impact: the 15+ task and overloaded-day scenarios become workable. Complexity: low-medium. Dependencies: optional times (#3) make it far more useful. Priority reason: it is the missing "Prioritize" stage of the stated flow.
10. **Cap the unbounded reads and fix the midnight rollover.** Problem: #15/#16. Evidence: `getNotes` full history; no `limit()`; `todayKey()` in `useMemo([])`. Impact: the app stays fast as the user's history grows, and data stops being written to the wrong day. Complexity: low. Dependencies: notes history pagination needs a UI change. Priority reason: both are silent correctness/cost problems that worsen with tenure — the opposite of what a long-term system needs.

---

## 28. Roadmap

### Phase 0 — Critical (trust, correctness, visibility)

1. Real user identity everywhere; delete the demo name/email/phone/photo (#1).
2. Remove or implement the inert Profile controls; delete the fake address/socials (#2).
3. Move the landing page out of `(admin)`, server-render its copy, give it its own metadata (#3, and #5 as a side effect).
4. Restore the missing 404 assets / delete the `/error-404` demo route (#14).
5. Fix the mobile drawer close button (#6).
6. Fix the midnight rollover (#16).
7. Add robots/sitemap; stop indexing the app shell routes.

*Exit criteria:* no user sees another person's identity; no UI control is decorative; the public page has server-rendered content with its own title; 404s render; the drawer closes; a date written at 00:05 is correct.

### Phase 1 — Core UX

1. Optional times + one-field quick add on Today (#9).
2. Day navigation (prev/next/today) on Today and Schedule (#7).
3. Carry-over/drop prompt for unfinished tasks (#7).
4. "Now/next" highlighting on the Today list; one merged progress card.
5. Planned-vs-available hours readout.
6. Mobile verification pass: touch drag, touch targets, keyboard-over-modal.

*Exit criteria:* a user can capture in one field, plan tomorrow today, and never lose an unfinished task.

### Phase 2 — LifeOS core (connect the chain)

1. `goalId` on tasks + a goal picker; optional subtask→task.
2. Goal status + archive; deadline awareness; sorting/filtering on Goals.
3. One importance field + sort/filter on Today.
4. Weekly review panel (7 days of tasks/habits/notes/goals, read-only) + note prompts.
5. Goal progress on the review surface; daily note linked to the day's plan.

*Exit criteria:* today's work visibly moves a goal, and a week can be reviewed in one screen.

### Phase 3 — Long-term system

1. Habit backfill / streak repair; Monday-first weeks for RU.
2. Month/quarter views over existing data (progress over time, not new entities).
3. Recurring tasks / day templates (the highest-value deterministic automation).
4. Richer reflection: note search, links, and a monthly summary.
5. Offline indicator and honest offline behaviour.

*Exit criteria:* the system becomes more useful at month 3 than at week 1.

### Phase 4 — Scale / automation

1. A notification channel (web push) — only if habits have proven to need reminders.
2. Bounded reads: note pagination, analytics windows, batch deletion.
3. Guardrails on Firestore usage (budgets/alerts, App Check) and any schema validation in rules.
4. Account data export/deletion if required by the audience or by law.
5. Only then, explore automation that needs inference (e.g. natural-language day planning) — if the deterministic version has been exhausted.

**Do not build these phases simultaneously.** Phases 0–1 are days of work and change the product's usability more than anything in 3–4.

---

## 29. Final product analysis

1. **What is LifeOS today?** A single-user, Google-authenticated day planner: time-boxed tasks for today, shown as a list and a drag-and-drop timeline, with habit streaks, a 30-day numeric analytics page, a checklist-style goals page and a daily journal. It is well-engineered (strict TS, tests, real-time data, owner-scoped rules, no unnecessary dependencies) and honest in tone.
2. **Core value:** a low-setup daily execution loop — plan the day hour by hour, tick it off, keep habit streaks, and see a numeric summary at the end of the week. The Schedule is the strongest expression of that value.
3. **Largest product gap:** no continuity across time — you cannot plan tomorrow, cannot recover yesterday's unfinished work, and no goal ever touches a day. LifeOS is a *today* system, not a life system.
4. **Largest UX gap:** the cost of entry to the core object. A task requires two clock decisions, there is no quick capture, no prioritization, and no way to find anything (no search, sort or filter) once there are many items.
5. **Largest technical gap:** the public landing page renders inside the authenticated shell, so it is a spinner to crawlers, ships the Firestore SDK (546 KB chunk; 1.43 MB of JS on `/ru`), and carries the dashboard's metadata. Second: unbounded reads (full note history) and the midnight rollover bug.
6. **Largest marketing/positioning gap:** the product cannot be found or understood by a newcomer in under 10 seconds — the CTA is below the fold, there is no example, no trust surface, and the goal promise exceeds what the goal module delivers. What *is* special (the Schedule's interaction quality, zero-setup privacy) is never demonstrated.
7. **Largest SEO gap:** there is no indexable content at all, and no technical plumbing (robots, sitemap, canonical, hreflang, OG) to support it. This is not a tuning problem; it is a "the document is empty" problem.
8. **Largest mobile/responsive gap:** the drawer's close button is broken, and the app's signature interaction (time-box drag) was never verified on touch, with code that suggests it was assumed. Below 1280 px the whole app lives behind a hamburger, including tablets that have room for a rail.
9. **Largest bilingual gap:** the dictionaries are complete and consistent (290 = 290, correct Russian plurals, localized dates), so the gap is content, not architecture: a false "month grid" claim in both languages, RU terminology drift ("серия"/"стрик"), Sunday-first weeks for Russian users, and metadata that describes the dashboard on a guest-facing page.
10. **What is already strong?** The Schedule (drag, keyboard, announcements, now-line, optimistic writes), the shared modal/receipt/error/empty-state system, the data layer (owner-scoped, index-free queries, defensive mappers, doc-id-as-date), the honest review semantics (gaps not zeroes), the habit model (archive, streaks), the i18n foundation, and the engineering restraint (no AI, no integrations, no dead dependencies, passing tests).
11. **What is genuinely missing?** Capture without a schedule; a place for "later"; priorities; any horizon beyond today; a weekly review; a link between goals and days; a recovery path after absence; retroactive habit check-in; search; account/data controls (export/delete); and any public, indexable content.
12. **What should be simplified?** The task form (optional times), the Profile module (delete the template's tables and fake controls), the breadcrumb duplication, the duplicated auth paths and the duplicated subscription scaffold, the `in_progress` state, and the unused translation keys.
13. **What should NOT be built right now?** AI of any kind; collaboration/sharing; calendar sync; areas/OKR/framework layers; gamification; a project-management suite; new modules (finance, contacts, health…); and any expansion of the habit/goal models before the day→week→goal chain exists. The product does not have a feature shortage; it has a *connection* shortage.
14. **What should be the next development focus?** Phase 0 (trust + visibility), then the two changes that make LifeOS a system rather than a tracker: **optional times with one-field capture**, and **continuity across days (day navigation + carry-over)**. Everything else in the requested architecture follows from those.

---

## 30. The final LifeOS test

> If an ordinary person wants to bring their life into order, can the current LifeOS realistically help them move from **Chaos → Understanding → Organization → Priorities → Plan → Action → Result → Review → Adaptation** without making the management of LifeOS itself another burden?

**Partly — the flow's middle works, and both ends fail. Concretely:**

- **Chaos → Understanding:** no. There is no intake: nothing lets a person dump what is on their mind (tasks need a title *and* two times; habits need a name; goals need a title; notes need a day). A chaotic person's first act — write things down as they come — is the most expensive act in the app. *Evidence:* `TaskForm.validate()` requires start and end; there is no inbox, no backlog, no search, no tags.
- **Understanding → Organization:** no. There is nowhere to put structure: no areas, no projects, no contexts, no nesting beyond one flat subtask array, no ordering, no filters. *Evidence:* `src/types/lifeos.ts` contains five flat collections and no relational fields.
- **Organization → Priorities:** no. There is no importance signal anywhere in the model or UI. *Evidence:* `LifeTask.status ∈ {todo, in_progress, done}` is progress, not priority; no sort/filter controls exist in any list.
- **Priorities → Plan (today):** **yes, and this is the product's real strength.** The Schedule turns intentions into a realistic hour-by-hour day with drag, snap, keyboard support, collision layout and a live "now" line. *Evidence:* `ScheduleView`/`ScheduleGrid`/`ScheduleTaskBlock`, verified in code and rendered locally.
- **Plan → Action:** partly. Today's list, one-tap completion, habit toggles and real-time sync get the user acting. But nothing highlights the current or next block, times must have been decided in advance, and untimed intentions cannot exist. *Evidence:* `TaskItem` has no "now" state; `TaskForm` requires times.
- **Action → Result:** partly. Completed work moves a progress bar and is counted for 30 days. It never moves a goal. *Evidence:* no `goalId`; goal progress is subtask-only (`GoalCard`).
- **Result → Review:** partly, and lossy. Analytics gives a completion percentage, a peak hour and a streak table; the user's notes hold their own words. What actually happened yesterday cannot be listed, because no screen shows a past day. *Evidence:* `useTodayTasks` is today-only; `AnalyticsView` aggregates.
- **Review → Adaptation:** no. Reading "61 % last week" cannot change a single thing: the plan for tomorrow cannot be created, unfinished work cannot be carried or dropped, and no plan can be adjusted in bulk. *Evidence:* no day navigation, no rollover, one-block-at-a-time drags only.

**Does managing LifeOS become another job?** Not in maintenance — there is no setup, no configuration, no syncing, and the daily loop is 2–3 taps. It becomes a job in a different, sharper sense: **the user must do the system's missing work by hand.** They must invent their own priorities (the app cannot tell them what matters), keep their own memory of unfinished work (the app forgets it for them), maintain the goal↔day connection in their head (the app never shows it), decide when to review (the app never asks), and rebuild the plan manually after every interruption. That is not "another system to maintain"; it is **a system that quietly delegates the hard part back to the user** — and then records the consequence as a falling percentage.

**The honest verdict, with its boundaries:** for a person whose life is already orderly enough that a day-shaped, time-boxed plan is the right unit, LifeOS is a genuinely pleasant, unusually well-built tool for Plan → Execute, with a fair numerical review. For someone who is genuinely in chaos — the person the product's name and language address — the flow breaks twice: at the entrance (nothing is cheap to capture) and at the exit (nothing adapts, recovers, or looks beyond today). I cannot verify how either person behaves in reality: I had no authenticated account, no device testing and no users to observe. But the breakages are structural, not cosmetic — they are visible in the data model, in the queries and in the set of screens that exist, which is why the two changes at the top of the roadmap (one-field capture, continuity across days) matter more than any feature that could be added on top.

---

## Appendix A — Reproducible checks

```bash
npm test                              # 35 pass, 0 fail
npx eslint .                          # clean
npm run build                         # success (prebuild runs ESLint)
npx next start -p 3100                # production server, used for all HTTP probes

curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/robots.txt      # 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/sitemap.xml     # 404
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/en              # 307 → /
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/ru/             # 308
curl -s http://localhost:3100/ru | grep -c 'hreflang\|property="og:'            # 0
curl -s http://localhost:3100/ru | grep -c 'animate-spin'                       # 1 (the SSR body is a spinner)
curl -s http://localhost:3100/ru/error-404 | grep -o 'images/error/404[^"]*'    # broken asset referenced
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/images/error/404.svg  # 404
# largest public chunk contains Firestore:
grep -rl firestore.googleapis.com .next/static/chunks/ | head
# live deployment returns the dashboard metadata for the guest landing:
curl -s https://os-life-one.vercel.app/ru | grep -o '<title>[^<]*</title>'      # <title>Сегодня | LifeOS</title>
```

## Appendix B — Files with the most audit-relevant findings

| File | Findings |
| --- | --- |
| `src/components/header/UserDropdown.tsx` | Hard-coded name/email/avatar; a third sign-out implementation |
| `src/components/user-profile/{UserMetaCard,UserAddressCard,Security,DangerZone}.tsx` | Inert controls, `console.log` saves, fake address, dead 2FA switch |
| `src/app/[locale]/(admin)/AdminShell.tsx` + `(admin)/page.tsx` | Guest landing rendered inside the authenticated shell; dashboard metadata on the landing |
| `src/hooks/{useTodayTasks,useHabits,useNotes}.ts` | Today-only date captured once (midnight rollover); duplicated subscription scaffold |
| `src/types/lifeos.ts` | The whole structural gap: no goalId, no priority, no areas/projects, no recurrence |
| `src/lib/firestore.ts` | Unbounded reads (`getNotes`, `getTasksSince`); per-log habit deletion |
| `src/components/today/TaskForm.tsx` | Mandatory times; unannounced validation errors; unlabeled status select |
| `src/components/schedule/ScheduleView.tsx` | Pointer/Keyboard sensors only (no TouchSensor) despite the TouchSensor comment |
| `src/layout/AppSidebar.tsx` | Broken mobile close button; no `aria-current`; inline SVG |
| `src/components/habits/HabitActivityGrid.tsx` | 12 px cells, `title`-only dates, no accessible text |
| `src/i18n/routing.ts`, `src/proxy.ts`, `src/app/[locale]/layout.tsx` | Correct locale routing/static rendering; no canonical/hreflang/OG plumbing |
| `firestore.rules` | Correctly owner-scoped; no schema validation inside the owner's documents |
| `public/sw.js` | Careful caching rules; stale "AI routes" reference; offline has no user-facing signal |
| `AGENTS.md` | Documents a TailAdmin template that no longer matches the codebase |
