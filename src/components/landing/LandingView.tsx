import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import GridShape from "@/components/common/GridShape";
import { ThemeToggleButton } from "@/components/common/ThemeToggleButton";
import LanguageSwitcher from "@/components/header/LanguageSwitcher";
import { Link } from "@/i18n/navigation";
import {
  CalenderIcon,
  CheckCircleIcon,
  DocsIcon,
  GridIcon,
  PieChartIcon,
  ShootingStarIcon,
  TimeIcon,
} from "@/icons";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

/**
 * What a signed-out visitor sees on `/`.
 *
 * A Server Component on purpose: the value proposition has to exist in the
 * served HTML (for a visitor on a slow connection, and for anything that reads
 * the page without running its JavaScript), and this page must stay free of
 * Firebase and of the authenticated shell. The interactive parts are the three
 * client islands inside it — the language switcher, the theme toggle and the
 * Google button — none of which import the SDK until they are used.
 *
 * The module titles come from their own namespaces rather than being duplicated
 * here, so the sidebar labels, the page titles and these cards cannot drift
 * apart.
 */
export default async function LandingView({ locale }: { locale: string }) {
  const t = await getTranslations({ locale, namespace: "landing" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tToday = await getTranslations({ locale, namespace: "today" });
  const tWeek = await getTranslations({ locale, namespace: "week" });
  const tHabits = await getTranslations({ locale, namespace: "habits" });
  const tGoals = await getTranslations({ locale, namespace: "goals" });
  const tSchedule = await getTranslations({ locale, namespace: "schedule" });
  const tNotes = await getTranslations({ locale, namespace: "notes" });
  const tAnalytics = await getTranslations({ locale, namespace: "analytics" });
  const tAuth = await getTranslations({ locale, namespace: "auth" });

  const modules = [
    { key: "tasks", title: tToday("title"), text: t("modules.tasks"), icon: <GridIcon /> },
    { key: "week", title: tWeek("title"), text: t("modules.week"), icon: <CalenderIcon /> },
    { key: "schedule", title: tSchedule("title"), text: t("modules.schedule"), icon: <TimeIcon /> },
    { key: "habits", title: tHabits("title"), text: t("modules.habits"), icon: <CheckCircleIcon /> },
    { key: "goals", title: tGoals("title"), text: t("modules.goals"), icon: <ShootingStarIcon /> },
    { key: "analytics", title: tAnalytics("title"), text: t("modules.analytics"), icon: <PieChartIcon /> },
    { key: "notes", title: tNotes("title"), text: t("modules.notes"), icon: <DocsIcon /> },
  ];

  return (
    <main className="relative min-h-screen bg-white dark:bg-gray-900">
      {/* Public tools: the app header (and its language switcher) is part of the
          authenticated shell, so the landing carries its own pair. */}
      {/* Stacked on the narrowest phones (below `2xsm`, 375px), where a row of
          controls would run into the logo beside it, and a row everywhere
          else. */}
      <div className="fixed top-6 end-6 z-50 flex flex-col items-end gap-3 2xsm:flex-row 2xsm:items-center">
        <LanguageSwitcher />
        <ThemeToggleButton />
      </div>

      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-12 px-6 py-12 lg:flex-row lg:items-center lg:gap-16">
        <section className="w-full lg:w-1/2">
          <Link href="/" className="inline-block">
            <Image
              className="dark:hidden"
              src="/images/logo/logo.svg"
              alt={tCommon("logoAlt")}
              width={150}
              height={40}
              priority
              // The intrinsic size, not the rendered one: without it Next warns
              // that only one of width/height was overridden by CSS (the same
              // treatment the sidebar logo gets).
              style={{ width: "auto", height: "auto" }}
            />
            <Image
              className="hidden dark:block"
              src="/images/logo/logo-dark.svg"
              alt={tCommon("logoAlt")}
              width={150}
              height={40}
              priority
              style={{ width: "auto", height: "auto" }}
            />
          </Link>

          <h1 className="mt-8 text-3xl font-semibold text-gray-900 lg:text-4xl dark:text-white">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-xl text-theme-sm text-gray-500 dark:text-gray-400">
            {t("subtitle")}
          </p>

          {/* The one action that matters, directly under the promise it acts
              on, instead of below four feature cards. */}
          <div className="mt-8 max-w-sm">
            <GoogleSignInButton />
            <p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
              {t("privacyNote")}
            </p>
          </div>

          <p className="mt-4 max-w-sm text-theme-xs text-gray-500 dark:text-gray-400">
            <Link
              href="/today"
              className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              {t("openApp")}
            </Link>
          </p>

          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {modules.map((module) => (
              <li
                key={module.key}
                className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-white/3"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-400">
                  {module.icon}
                </span>
                <h2 className="mt-3 text-theme-sm font-medium text-gray-800 dark:text-white/90">
                  {module.title}
                </h2>
                <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                  {module.text}
                </p>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-theme-sm text-gray-500 dark:text-gray-400">
            {t("signInPrompt")}{" "}
            <Link
              href="/signin"
              className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
            >
              {t("signInLink")}
            </Link>
          </p>
        </section>

        {/* The dark decorative panel mirrors the auth pages. */}
        <aside className="hidden w-1/2 items-center justify-center rounded-3xl bg-brand-950 p-10 lg:flex dark:bg-white/5">
          {/* `z-1` makes this a stacking context, like the auth pages: without
              it the `-z-1` grid shape is painted behind the panel's background
              and the decoration never appears. */}
          <div className="relative z-1 flex items-center justify-center">
            <GridShape />
            <p className="max-w-xs text-center text-gray-400 dark:text-white/60">
              {tAuth("tagline")}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
