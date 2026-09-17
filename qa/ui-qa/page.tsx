"use client";

/**
 * TEMPORARY visual QA harness (archived in `qa/`, not part of the product — there
 * is no link to it anywhere, and it can be deleted at any time).
 *
 * The real screens live behind Google sign-in, so components are rendered with
 * fixtures. Two ways, and they are not equivalent:
 *
 *  - `<Viewport>` loads a whole screen into an iframe of a given width, so the
 *    page sees a real viewport of that size and its media queries apply for
 *    real. This is how any responsive claim is checked.
 *  - `<Frame>` renders components inside a fixed-width box, scaled down to fit.
 *    Useful to look at a populated composition (the fixture cards have no
 *    viewport-dependent classes of their own), useless for breakpoints — the
 *    media queries still answer for the outer browser window. It is *not* how a
 *    responsive claim is checked, and its box is clipped so it cannot make the
 *    harness itself scroll sideways.
 */
import GoalCard from "@/components/goals/GoalCard";
import ScheduleAgenda from "@/components/schedule/ScheduleAgenda";
import TodayEmptyState from "@/components/today/TodayEmptyState";
import UnscheduledTasks from "@/components/schedule/UnscheduledTasks";
import WeekBulkBar from "@/components/week/WeekBulkBar";
import WeekDayCard from "@/components/week/WeekDayCard";
import WeekNavigator from "@/components/week/WeekNavigator";
import WeekReview from "@/components/week/WeekReview";
import { getPathname } from "@/i18n/navigation";
import {
  summarizeWeek,
  weekDayKeys,
  weekStartFor,
  weekStartsOnFor,
} from "@/lib/week";
import type { LifeTask } from "@/types/lifeos";
import { useLocale, useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { GOALS, TASKS, TODAY } from "./fixtures";

/**
 * The widths a responsive claim has to cover: three phones, a tablet in both
 * orientations, the sidebar's own breakpoint and up, and a desktop.
 */
const VIEWPORTS = [360, 390, 430, 768, 834, 1024, 1280, 1440];

/**
 * Scales a frame down to fit the (narrow) preview pane. The iframe keeps its
 * true width, so what is being checked — which breakpoints apply — is untouched
 * by the scaling; only the picture gets smaller.
 */
function scaleFor(width: number): number {
  return Math.min(1, 300 / width);
}

function Frame({
  label,
  width,
  scale = scaleFor(width),
  children,
}: {
  label: string;
  width: number;
  scale?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-theme-sm font-semibold">{label}</h2>
      <div
        className="overflow-hidden rounded-xl border border-dashed border-brand-500"
        style={{ width: width * scale }}
      >
        <div
          className="rounded-xl border border-dashed border-brand-500 p-3"
          style={{
            width: `${width}px`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

function Viewport({
  label,
  width,
  height,
  src,
}: {
  label: string;
  width: number;
  height: number;
  src: string;
}) {
  const scale = scaleFor(width);

  return (
    <section className="space-y-2">
      <h2 className="text-theme-sm font-semibold">
        {label} · {width}×{height}
        {scale !== 1 && ` · scaled ${scale}`}
      </h2>
      <div
        className="overflow-hidden rounded-xl border border-dashed border-brand-500"
        style={{ width: width * scale, height: height * scale }}
      >
        <iframe
          title={label}
          src={src}
          width={width}
          height={height}
          style={{
            border: 0,
            display: "block",
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </section>
  );
}

export default function UiQaPage() {
  const locale = useLocale();
  const t = useTranslations("today");
  const weekStartsOn = weekStartsOnFor(locale);
  const startKey = weekStartFor(TODAY, 0, weekStartsOn);
  const dayKeys = useMemo(() => weekDayKeys(startKey), [startKey]);
  const summary = useMemo(
    () => summarizeWeek(TASKS, dayKeys, TODAY),
    [dayKeys],
  );
  const [targetDate, setTargetDate] = useState("2026-09-21");
  const goalsById = Object.fromEntries(GOALS.map((goal) => [goal.id, goal]));

  // English is the prefix-free locale, so the hrefs go through the router's own
  // path builder instead of being concatenated by hand.
  const hrefFor = (pathname: string) =>
    getPathname({ href: pathname, locale: locale as "en" | "ru" });
  const todaySrc = hrefFor("/ui-qa/today");
  const statesSrc = hrefFor("/ui-qa/today/states");
  const weekSrc = hrefFor("/ui-qa/week");
  const habitsSrc = hrefFor("/ui-qa/habits");
  const analyticsSrc = hrefFor("/ui-qa/analytics");
  const analyticsStatesSrc = hrefFor("/ui-qa/analytics/states");
  const inTheDay = (item: LifeTask) => item.date === TODAY;

  return (
    <div className="space-y-8 p-4">
      <h1 className="text-xl font-semibold">UI QA — responsive compositions</h1>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Today — real viewports (iframe) — {t("title")}
        </h2>
        {VIEWPORTS.map((width) => (
          <Viewport
            key={width}
            label="Today"
            width={width}
            height={900}
            src={todaySrc}
          />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Week — real viewports (iframe) — {t("title")}
        </h2>
        {VIEWPORTS.map((width) => (
          <Viewport
            key={width}
            label="Week"
            width={width}
            height={1100}
            src={weekSrc}
          />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Analytics — real viewports (iframe)
        </h2>
        {VIEWPORTS.map((width) => (
          <Viewport
            key={width}
            label="Analytics"
            width={width}
            height={1500}
            src={analyticsSrc}
          />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Analytics — data states (iframe @ 360 and 1280)
        </h2>
        {[360, 1280].map((width) => (
          <Viewport
            key={width}
            label="Analytics states"
            width={width}
            height={2600}
            src={analyticsStatesSrc}
          />
        ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Today — row states</h2>
        {[360, 1280].map((width) => (
          <Viewport
            key={width}
            label="Today states"
            width={width}
            height={640}
            src={statesSrc}
          />
        ))}
      </section>

      {/* No breakpoint inside this card, so a fixed-width frame is honest here. */}
      <Frame label="Today empty state @ 360" width={360}>
        <TodayEmptyState isToday />
      </Frame>

      <Frame label="Week day cards @ 768 (2 cols)" width={768}>
        <div className="grid grid-cols-2 gap-4">
          {dayKeys.slice(0, 4).map((date) => (
            <WeekDayCard
              key={date}
              date={date}
              tasks={TASKS.filter((item) => item.date === date)}
              goalsById={goalsById}
              goalsResolved
              isToday={date === TODAY}
              selectedIds={date === TODAY ? ["t2"] : []}
              highlightedId={date === TODAY ? "t4" : null}
              onToggleSelect={() => undefined}
              onOpenDay={() => undefined}
              onAddTask={async () => undefined}
              onMove={() => undefined}
              onDrop={() => undefined}
              onRestore={() => undefined}
            />
          ))}
        </div>
      </Frame>

      <Frame label="Week header + review + day card @ 360" width={360}>
        <WeekNavigator
          startKey={startKey}
          offset={0}
          onPreviousWeek={() => undefined}
          onNextWeek={() => undefined}
          onThisWeek={() => undefined}
        />
        <div className="mt-4">
          <WeekReview summary={summary} isFutureWeek={false} />
        </div>
        <div className="mt-4">
          <WeekDayCard
            date={TODAY}
            tasks={TASKS.filter(inTheDay)}
            goalsById={goalsById}
            goalsResolved
            isToday
            selectedIds={["t2"]}
            highlightedId="t4"
            onToggleSelect={() => undefined}
            onOpenDay={() => undefined}
            onAddTask={async () => undefined}
            onMove={() => undefined}
            onDrop={() => undefined}
            onRestore={() => undefined}
          />
        </div>
        <div className="mt-6">
          <WeekBulkBar
            selectedCount={2}
            targetDate={targetDate}
            onTargetDateChange={setTargetDate}
            onMove={() => undefined}
            onDrop={() => undefined}
            onClear={() => undefined}
            busy={false}
            result={{ updated: 1, failed: 1, total: 2, action: "drop" }}
          />
        </div>
      </Frame>

      <Frame label="Schedule agenda @ 360" width={360}>
        <ScheduleAgenda
          tasks={TASKS.filter((item) => item.startTime)}
          goalsById={goalsById}
          goalsResolved
          onEdit={() => undefined}
        />
        <div className="mt-2">
          <UnscheduledTasks
            tasks={TASKS.filter((item) => !item.startTime)}
            onEdit={() => undefined}
          />
        </div>
      </Frame>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">
          Habits — real viewports (iframe), day cells pressable
        </h2>
        {VIEWPORTS.map((width) => (
          <Viewport
            key={width}
            label="Habits"
            width={width}
            height={1100}
            src={habitsSrc}
          />
        ))}
      </section>

      <Frame label="Goal card @ 360" width={360}>
        <ul>
          <GoalCard
            goal={GOALS[0]}
            tasks={TASKS.filter((item) => item.goalId === "g1")}
            today={TODAY}
            tasksLoaded
            onEditRequest={() => undefined}
            onDeleteRequest={() => undefined}
            onStatusChange={() => undefined}
          />
        </ul>
      </Frame>

      <Frame label="Week day cards @ 1280" width={1280}>
        <div className="grid grid-cols-4 gap-4">
          {dayKeys.slice(0, 4).map((date) => (
            <WeekDayCard
              key={date}
              date={date}
              tasks={TASKS.filter((item) => item.date === date)}
              goalsById={goalsById}
              goalsResolved
              isToday={date === TODAY}
              selectedIds={[]}
              onToggleSelect={() => undefined}
              onOpenDay={() => undefined}
              onAddTask={async () => undefined}
              onMove={() => undefined}
              onDrop={() => undefined}
              onRestore={() => undefined}
            />
          ))}
        </div>
      </Frame>
    </div>
  );
}
