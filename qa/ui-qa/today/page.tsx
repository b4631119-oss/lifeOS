"use client";

/**
 * TEMPORARY QA screen (see `../page.tsx`).
 *
 * The Today composition with fixtures, rendered at the *document* level so the
 * harness can load it in an `<iframe>` of a given width: an iframe is a real
 * viewport for CSS, so `sm:`/`md:`/`lg:`/`xl:` apply exactly as they do on a
 * device of that width. Rendering the same components inside a fixed-width
 * `<div>` (what this harness used to do) does NOT do that — every media query
 * still answered for the outer browser window, which is how a phone layout was
 * once "verified" while never being rendered at all.
 *
 * The wrapper is the real shell (`../Shell`), so the width the page gets is the
 * width the product gives it: a drawer below `lg`, a sidebar at and above it.
 */
import DayProgress from "@/components/today/DayProgress";
import QuickAddTask from "@/components/today/QuickAddTask";
import TaskFormModal from "@/components/today/TaskFormModal";
import TaskList from "@/components/today/TaskList";
import TodayHeader from "@/components/today/TodayHeader";
import UnfinishedTasksPanel from "@/components/today/UnfinishedTasksPanel";
import { useState } from "react";
import Shell from "../Shell";
import { GOALS, TASKS, UNFINISHED } from "../fixtures";

export default function UiQaTodayPage() {
  const goalsById = Object.fromEntries(GOALS.map((goal) => [goal.id, goal]));
  // The detailed dialog really opens here, so the secondary action can be
  // clicked and looked at (the real page wires the same thing to Firestore).
  const [details, setDetails] = useState<{ open: boolean; title: string }>({
    open: false,
    title: "",
  });

  return (
    <Shell>
      <TodayHeader />

      <QuickAddTask
        onCreate={async () => undefined}
        onOpenDetails={(title) => setDetails({ open: true, title })}
      />

      <DayProgress tasks={TASKS} />

      <TaskList
        tasks={TASKS}
        loading={false}
        isToday
        goalsById={goalsById}
        goalsResolved
        highlightedId="t2"
        onToggle={() => undefined}
        onEdit={() => undefined}
        onDelete={() => undefined}
      />

      <div className="mt-8">
        <UnfinishedTasksPanel
          groups={UNFINISHED}
          dayKey="2026-09-16"
          onUpdate={async () => undefined}
        />
      </div>

      <TaskFormModal
        isOpen={details.open}
        onClose={() => setDetails({ open: false, title: "" })}
        task={null}
        defaultTitle={details.title}
        goals={GOALS}
        onSubmit={async () => undefined}
      />
    </Shell>
  );
}
