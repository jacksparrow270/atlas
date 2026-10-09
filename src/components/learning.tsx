"use client";
import { useState } from "react";
import foundations from "@/data/foundations.json";
import Link from "next/link";
import {
  Check,
  Clock,
  Play,
  ArrowUpRight,
  Code2,
  BookOpen,
  Target,
  Layers,
  Timer,
  Flame,
  CalendarDays,
  GraduationCap,
  Activity,
} from "lucide-react";
import { motion } from "motion/react";
import { useAcademy } from "./store";
import { weeks, stages, restart, lessonIds, resources } from "@/lib/content";
import {
  analytics,
  completion,
  localDate,
  plan,
  type PlanTask,
} from "@/lib/engine";
import type { Payload } from "@/lib/schema";
import { Button } from "./ui/button";
import { CodeExample } from "./code-example";
export function Heading({
  kicker,
  title,
  description,
  action,
}: {
  kicker: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{kicker}</p>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: Math.min(100, value) + "%" }} />
    </div>
  );
}
export function usePlan() {
  const s = useAcademy();
  const today = localDate(new Date(), s.preferences.timezone);
  const done = new Set(
    s.records
      .filter(
        (r) =>
          (r.kind === "lesson" &&
            (r.data as Payload["lesson"]).status === "completed") ||
          (r.kind === "task" && (r.data as Payload["task"]).done),
      )
      .map((r) => r.id),
  );
  const candidates: PlanTask[] = [
    ...s.records
      .filter((r) => r.kind === "task")
      .sort((a, b) => {
        const ranks = { high: 0, normal: 1, low: 2 };
        return (
          ranks[(a.data as Payload["task"]).priority] -
          ranks[(b.data as Payload["task"]).priority]
        );
      })
      .map((r) => {
        const t = r.data as Payload["task"];
        return {
          id: r.id,
          title: t.title,
          minutes: t.minutes,
          due: t.due,
          href: "/focus?task=" + encodeURIComponent(t.title),
          reason:
            t.due < today
              ? "Unfinished custom task from " + t.due
              : "Your custom task",
        };
      }),
    ...restart
      .filter((d) => d.day !== 7)
      .map((d) => ({
        id: d.id,
        title: d.title,
        minutes: Math.min(
          s.preferences.sessionMinutes,
          s.preferences.dailyMinutes,
        ),
        href: "/academy/restart/" + d.day,
        reason: "Restart program · day " + d.day,
      })),
    ...weeks
      .filter((w) => w.week <= s.preferences.activeWeek)
      .flatMap((w) =>
        w.days.map((d) => ({
          id: d.id,
          title: d.title,
          minutes: Math.min(
            s.preferences.sessionMinutes,
            s.preferences.dailyMinutes,
          ),
          href: "/academy/week/" + w.week + "/day/" + d.day,
          reason:
            w.week < s.preferences.activeWeek
              ? "Catch-up: unfinished prerequisite from week " + w.week
              : "Week " + w.week + " · day " + d.day,
        })),
      ),
  ];
  return {
    today,
    done,
    candidates,
    tasks: plan(today, s.preferences, candidates, done),
  };
}
export function Dashboard() {
  const s = useAcademy();
  const p = usePlan();
  const metrics = analytics(
    s.records,
    s.preferences.timezone,
    p.today,
    s.preferences.studyDays.filter((d) => d !== s.preferences.restDay),
  );
  const progress = completion(lessonIds, s.records);
  const week = weeks[s.preferences.activeWeek - 1];
  const next = p.tasks[0] || p.candidates.find((t) => !p.done.has(t.id));
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: s.preferences.timezone,
      hour: "numeric",
      hourCycle: "h23",
    }).format(new Date()),
  );
  return (
    <>
      <Heading
        kicker={new Intl.DateTimeFormat("en", {
          timeZone: s.preferences.timezone,
          weekday: "long",
          month: "long",
          day: "numeric",
        }).format(new Date())}
        title={
          "Good " +
          (hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening") +
          ", " +
          s.preferences.name +
          "."
        }
        description="A little focus. Something real to show for it."
        action={
          <Link className="btn btn-secondary" href="/schedule">
            <CalendarIcon /> View schedule
          </Link>
        }
      />
      <div className="dashboard-grid">
        <div className="main-column">
          <motion.section
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="hero-card"
          >
            <div className="hero-top">
              <span className="pill">YOUR LEARNING JOURNEY</span>
              <span className="mono">
                WEEK {String(week.week).padStart(2, "0")} / 52
              </span>
            </div>
            <p className="eyebrow">{stages[week.stage].name}</p>
            <h2>{next?.title || "Make room for your next idea."}</h2>
            <p>
              {p.tasks.length
                ? "Your next study block is ready. Start small and leave a clear record of what you learn."
                : "Today has room for rest and reflection. Your unfinished work is safely waiting."}
            </p>
            <div className="hero-buttons">
              <Button asChild>
                <Link href={next?.href || "/academy"}>
                  <Play size={17} /> Continue learning
                </Link>
              </Button>
              <Button asChild variant="secondary">
                <Link href="/focus">
                  <Clock size={17} /> Start focus session
                </Link>
              </Button>
            </div>
            <div className="hero-bottom">
              <span>{progress.done} lessons completed</span>
              <span>{s.preferences.dailyMinutes} min daily target</span>
            </div>
            <Progress
              value={(progress.done / progress.total) * 100}
              label="Overall curriculum progress"
            />
            <div className="orbit" aria-hidden="true">
              <CompassMark />
            </div>
          </motion.section>
          <div className="metrics">
            <Metric
              label="Total focus"
              value={(metrics.total / 3600).toFixed(1)}
              unit="hrs"
              note="Time you’ve actually logged"
            />
            <Metric
              label="This week"
              value={String(metrics.weekly)}
              unit="min"
              note="Across the last seven days"
            />
            <Metric
              label="Study days"
              value={String(metrics.days)}
              unit="days"
              note="A record of showing up"
            />
            <Metric
              label="Curriculum"
              value={Math.round((progress.done / progress.total) * 100) + "%"}
              note={progress.done + " / " + progress.total + " lessons"}
            />
          </div>
          <section className="card">
            <div className="section-title">
              <div>
                <p className="eyebrow">ONE BLOCK AT A TIME</p>
                <h2>Today’s agenda</h2>
              </div>
              <Link href="/today">
                Open planner <ArrowUpRight size={15} />
              </Link>
            </div>
            <Agenda tasks={p.tasks} />
          </section>
          <section className="card">
            <div className="section-title">
              <h2>Your learning path</h2>
              <Link href="/academy">
                Full roadmap <ArrowUpRight size={15} />
              </Link>
            </div>
            <div className="stage-strip">
              {stages.map((stage, i) => {
                const ids = weeks
                  .filter((w) => w.stage === i)
                  .flatMap((w) => w.days.map((d) => d.id));
                const c = completion(ids, s.records);
                return (
                  <Link
                    href={"/academy#stage-" + i}
                    className={"stage-mini " + stage.color}
                    key={stage.name}
                  >
                    <span className="stage-number">0{i + 1}</span>
                    <h3>{stage.name}</h3>
                    <small>Weeks {stage.range.join("–")}</small>
                    <Progress
                      value={(c.done / c.total) * 100}
                      label={stage.name}
                    />
                    <span>
                      {c.done} / {c.total} lessons
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
        <div className="context-column">
          <section className="card focus-invite">
            <div className="section-title">
              <TimerIcon />
              <span className="pill">FOCUS ROOM</span>
            </div>
            <h2>Just {s.preferences.sessionMinutes} minutes.</h2>
            <p>
              One task. A little less noise.
              <br />
              Begin where you are.
            </p>
            <div className="mini-clock">
              {s.preferences.sessionMinutes}
              <span>:00</span>
            </div>
            <Link className="btn btn-secondary full" href="/focus">
              Enter focus room
            </Link>
          </section>
          <section className="card">
            <div className="section-title">
              <h3>Weekly rhythm</h3>
              <span className="muted">min</span>
            </div>
            <div className="bars">
              {metrics.week.map((d) => (
                <div key={d.date}>
                  <div className="bar-track">
                    <span
                      style={{
                        height:
                          Math.max(
                            2,
                            (d.minutes /
                              Math.max(
                                1,
                                ...metrics.week.map((x) => x.minutes),
                              )) *
                              100,
                          ) + "%",
                      }}
                      title={d.minutes + " minutes"}
                    />
                  </div>
                  <small>
                    {new Date(d.date + "T12:00:00").toLocaleDateString("en", {
                      weekday: "narrow",
                    })}
                  </small>
                  <span className="sr-only">
                    {d.date}: {d.minutes} minutes
                  </span>
                </div>
              ))}
            </div>
            <p className="small muted">
              {metrics.weekly
                ? metrics.weekly + " focused minutes this week."
                : "Your first session will bring this chart to life."}
            </p>
          </section>
          <section className="card milestone">
            <span className="eyebrow">NEXT CHECKPOINT</span>
            <GraduationIcon />
            <h3>
              {s.preferences.activeWeek <= 12
                ? "Foundations examination"
                : s.preferences.activeWeek <= 24
                  ? "Machine learning examination"
                  : s.preferences.activeWeek <= 36
                    ? "AI engineering examination"
                    : "Capstone presentation"}
            </h3>
            <p>Demonstrate what you can build, explain, and test.</p>
            <Link href="/assessments">
              See the deliverable <ArrowUpRight size={15} />
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}
function CalendarIcon() {
  return <Layers size={16} />;
}
function TimerIcon() {
  return <Clock size={22} />;
}
function GraduationIcon() {
  return <Target size={28} />;
}
function CompassMark() {
  return (
    <svg viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="84" />
      <circle cx="100" cy="100" r="63" />
      <path d="M100 8v30m0 124v30M8 100h30m124 0h30M100 42l18 76-76 40 40-76z" />
      <circle cx="100" cy="100" r="8" />
    </svg>
  );
}
export function Metric({
  label,
  value,
  unit,
  note,
}: {
  label: string;
  value: string;
  unit?: string;
  note: string;
}) {
  const Icon = label.toLowerCase().includes("focus")
    ? Timer
    : label.toLowerCase().includes("week")
      ? Flame
      : label.toLowerCase().includes("day")
        ? CalendarDays
        : label === "Curriculum"
          ? GraduationCap
          : Activity;
  return (
    <div className="metric">
      <div className="metric-heading">
        <span className="metric-icon" aria-hidden="true">
          <Icon size={16} />
        </span>
        <span>{label}</span>
      </div>
      <strong>
        {value} <small>{unit}</small>
      </strong>
      <p>{note}</p>
    </div>
  );
}
export function Agenda({ tasks }: { tasks: PlanTask[] }) {
  return tasks.length ? (
    <div className="agenda">
      {tasks.map((t, i) => (
        <div className="agenda-row" key={t.id}>
          <span className="task-index">{String(i + 1).padStart(2, "0")}</span>
          <div>
            <h3>
              <Link href={t.href}>{t.title}</Link>
            </h3>
            <p>{t.reason}</p>
          </div>
          <span className="duration">{t.minutes} min</span>
          <Link
            className="icon-button"
            aria-label={"Open " + t.title}
            href={t.href}
          >
            <Play size={17} />
          </Link>
        </div>
      ))}
    </div>
  ) : (
    <div className="empty">
      <BookOpen />
      <h3>No scheduled blocks today.</h3>
      <p>
        Rest, reflect, or choose a lesson from your roadmap. Incomplete tasks
        stay available.
      </p>
      <Link href="/academy">Browse lessons</Link>
    </div>
  );
}
export function Roadmap() {
  const s = useAcademy();
  const [q, setQ] = useState("");
  return (
    <>
      <Heading
        kicker="THE ACADEMY"
        title="A map for the work ahead."
        description="52 weeks. Four stages. Progress at a pace you can sustain."
      />
      <section className="restart-banner">
        <div>
          <span className="eyebrow">START HERE / 14-DAY RESTART</span>
          <h2>Build the habit before the intensity.</h2>
          <p>
            A gentle, practical Python introduction. Separate from your academic
            week.
          </p>
        </div>
        <Link className="btn btn-primary" href="/academy/restart/1">
          Begin day one
        </Link>
      </section>
      <div className="restart-days">
        {restart.map((d) => (
          <Link
            href={"/academy/restart/" + d.day}
            key={d.id}
            className={
              s.get("lesson", d.id)?.status === "completed" ? "done" : ""
            }
          >
            Day {d.day}
            {d.day === 7 ? " · Rest" : ""}
          </Link>
        ))}
      </div>
      <label className="search-field">
        Find a week
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search topics or a week number"
        />
      </label>
      {stages.map((stage, i) => (
        <section className="roadmap-stage" id={"stage-" + i} key={stage.name}>
          <div className="stage-heading">
            <span className={"stage-number " + stage.color}>0{i + 1}</span>
            <div>
              <p className="eyebrow">WEEKS {stage.range.join("–")}</p>
              <h2>{stage.name}</h2>
            </div>
          </div>
          <div className="week-grid">
            {weeks
              .filter(
                (w) =>
                  w.stage === i &&
                  (w.title + " " + w.week + " " + w.topics.join(" "))
                    .toLowerCase()
                    .includes(q.toLowerCase()),
              )
              .map((w) => {
                const c = completion(
                  w.days.map((d) => d.id),
                  s.records,
                );
                return (
                  <Link
                    className={
                      "week-card " +
                      (w.week === s.preferences.activeWeek ? "current" : "")
                    }
                    href={"/academy/week/" + w.week}
                    key={w.id}
                  >
                    <div>
                      <span className="mono">
                        W{String(w.week).padStart(2, "0")}
                      </span>
                      <span className="small">
                        {c.done === 6
                          ? "Completed"
                          : c.done
                            ? "In progress"
                            : w.week === s.preferences.activeWeek
                              ? "Current week"
                              : "Available"}
                      </span>
                    </div>
                    <h3>{w.title}</h3>
                    <p>{w.outcome}</p>
                    <Progress value={(c.done / 6) * 100} label={w.title} />
                    <small>
                      {c.done} / 6 lessons{" "}
                      {[12, 24, 36, 52].includes(w.week)
                        ? " · Major assessment"
                        : ""}
                    </small>
                  </Link>
                );
              })}
          </div>
        </section>
      ))}
    </>
  );
}
export function WeekView({ weekNumber }: { weekNumber: number }) {
  const s = useAcademy();
  const w = weeks[weekNumber - 1];
  return (
    <>
      <Heading
        kicker={"STAGE " + (w.stage + 1) + " / WEEK " + w.week}
        title={w.title}
        description={w.outcome}
        action={
          <Button
            variant="secondary"
            onClick={() =>
              void s.setPreferences({ ...s.preferences, activeWeek: w.week })
            }
          >
            {s.preferences.activeWeek === w.week
              ? "Current active week"
              : "Make active week"}
          </Button>
        }
      />
      <p className="muted">
        Prerequisites:{" "}
        {w.week === 1
          ? "none — begin here."
          : "complete or review week " +
            (w.week - 1) +
            ". Future lessons remain available."}
      </p>
      <div className="day-list">
        {w.days.map((d) => (
          <Link
            className="card day-card"
            key={d.id}
            href={"/academy/week/" + w.week + "/day/" + d.day}
          >
            <span className="day-label">DAY {d.day}</span>
            <div>
              <h2>{d.title}</h2>
              <p>{d.exercise}</p>
            </div>
            <span className="pill">
              {s.get("lesson", d.id)?.status || "not-started"}
            </span>
            <span>{d.minutes} min</span>
          </Link>
        ))}
      </div>
      <section className="card">
        <h3>Day 7 · Rest & review</h3>
        <p>
          Your rest day is configurable. Reflect on what you understood and
          carry unfinished work forward.
        </p>
        <Link href="/reviews">Write a weekly reflection</Link>
      </section>
    </>
  );
}
export function Lesson({
  weekNumber,
  day,
  restartDay,
}: {
  weekNumber?: number;
  day?: number;
  restartDay?: number;
}) {
  const s = useAcademy();
  const r = restartDay ? restart[restartDay - 1] : undefined;
  const w = weekNumber ? weeks[weekNumber - 1] : undefined;
  const d = w?.days[(day || 1) - 1];
  const id = r?.id || d!.id;
  const saved = s.get("lesson", id);
  const [notes, setNotes] = useState(saved?.notes || "");
  const [link, setLink] = useState(saved?.link || "");
  const [answer, setAnswer] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [criteria, setCriteria] = useState<string[]>([]);
  const title = r?.title || d!.title;
  const exercise = r?.exercise || d!.exercise;
  const checks = r?.criteria || d!.criteria;
  const related = resources.filter((x) =>
    w ? w.week >= x.weeks[0] && w.week <= x.weeks[1] : x.id === "cs50",
  );
  async function save(status: Payload["lesson"]["status"]) {
    setBusy(true);
    try {
      await s.save("lesson", id, { status, notes, link });
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        kicker={
          r
            ? "RESTART PROGRAM / DAY " + r.day
            : "WEEK " + w!.week + " / DAY " + d!.day
        }
        title={title}
        description={
          (r?.minutes || d!.minutes) +
          " minutes · " +
          (r ? "Beginner" : stages[w!.stage].name)
        }
        action={
          <Link
            className="btn btn-secondary"
            href={"/focus?task=" + encodeURIComponent(title)}
          >
            Focus on this lesson
          </Link>
        }
      />
      <div className="lesson-layout">
        <article className="card lesson-body">
          <p className="eyebrow">01 / UNDERSTAND</p>
          <h2>
            {r ? "A small idea, made practical." : "Today’s learning objective"}
          </h2>
          <p>
            {r?.explanation ||
              (w!.week <= 12
                ? foundations[w!.week - 1][d!.day - 1]
                : d!.objective)}
          </p>
          {!r && (
            <>
              <p>
                {w!.outcome} Begin by writing what the key terms mean in your
                own words. Use the primary reference below for the exact method,
                then close it before attempting the independent task.
              </p>
              <h3>Suggested session plan</h3>
              <ol>
                <li>
                  10 minutes: study the relevant reference section and write
                  input/output expectations.
                </li>
                <li>25 minutes: complete the concrete exercise below.</li>
                <li>
                  15 minutes: test the result and explain one limitation in your
                  own words.
                </li>
              </ol>
            </>
          )}
          {r && (
            <>
              <h3>Session plan</h3>
              <p>
                {r.day === 7
                  ? "Optional five-minute reflection, then rest."
                  : "Start with 10 minutes reading and tracing the example. Use your first focus block to implement a small version. Take a break, then test and extend it in a second block."}
              </p>
              <div className="code-header">
                <span>PYTHON / EXAMPLE</span>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(r.code);
                    setCopied(true);
                  }}
                >
                  {copied ? "Copied" : "Copy code"}
                </button>
              </div>
              <CodeExample code={r.code} />
              <p className="small muted">
                Run examples in your own Python environment. This page does not
                execute code.
              </p>
            </>
          )}
          <hr />
          <p className="eyebrow">02 / PRACTICE</p>
          <h2>Your independent assignment</h2>
          <p>{exercise}</p>
          <details>
            <summary>Hint 1 · Start smaller</summary>
            <p>
              Write down the inputs, expected outputs and one simplest valid
              example. Implement only that case before expanding.
            </p>
          </details>
          <details>
            <summary>Hint 2 · Check the boundaries</summary>
            <p>
              Try empty input, the smallest valid value and an invalid value.
              For experiments, hold the data and random seed fixed so
              comparisons are meaningful.
            </p>
          </details>
          <h3>Evidence & approach</h3>
          <label>
            What did you build, test, and learn?
            <textarea
              rows={6}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Explain your approach, test cases, results and remaining questions."
            />
          </label>
          <label>
            Repository or artifact link
            <input
              type="url"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://github.com/…"
            />
          </label>
          <div className="button-row">
            <Button
              disabled={busy}
              variant="secondary"
              onClick={() => void save("in-progress")}
            >
              Save my work
            </Button>
            <Button
              disabled={busy}
              variant="ghost"
              onClick={() => void save("needs-revision")}
            >
              Mark for revision
            </Button>
          </div>
          {r && (
            <>
              <hr />
              <p className="eyebrow">03 / CHECK YOUR UNDERSTANDING</p>
              <h3>{r.question.prompt}</h3>
              <fieldset>
                {r.question.options.map((o, i) => (
                  <label className="choice" key={o}>
                    <input
                      type="radio"
                      name="knowledge"
                      checked={answer === i}
                      onChange={() => {
                        setAnswer(i);
                        setChecked(false);
                      }}
                    />
                    {o}
                  </label>
                ))}
              </fieldset>
              <Button
                variant="secondary"
                disabled={answer === null}
                onClick={() => setChecked(true)}
              >
                Check answer
              </Button>
              {checked && (
                <p
                  role="status"
                  className={
                    answer === r.question.correct ? "success" : "muted"
                  }
                >
                  {answer === r.question.correct
                    ? "Correct. Now explain why in your own words."
                    : "Review this idea: " +
                      r.question.options[r.question.correct] +
                      ". Revisit the explanation and try another example."}
                </p>
              )}
            </>
          )}
          <hr />
          <h3>Before marking complete</h3>
          {checks.map((c) => (
            <label className="choice" key={c}>
              <input
                type="checkbox"
                checked={criteria.includes(c) || saved?.status === "completed"}
                onChange={(e) =>
                  setCriteria((old) =>
                    e.target.checked ? [...old, c] : old.filter((x) => x !== c),
                  )
                }
              />
              {c}
            </label>
          ))}
          <div className="button-row">
            <Button
              disabled={
                busy ||
                (criteria.length !== checks.length &&
                  saved?.status !== "completed")
              }
              onClick={() =>
                void save(
                  saved?.status === "completed" ? "in-progress" : "completed",
                )
              }
            >
              <Check size={17} />
              {saved?.status === "completed"
                ? "Reopen lesson"
                : "Mark lesson complete"}
            </Button>
            <span className="muted small">
              {saved?.status || "Not started"}
            </span>
          </div>
        </article>
        <aside className="lesson-aside">
          <section className="card">
            <Code2 />
            <h3>The deliverable</h3>
            <p>{exercise}</p>
            <h3>Reflection</h3>
            <p>
              {r?.reflection ||
                "What evidence shows this works, and where could it fail?"}
            </p>
          </section>
          <section className="card">
            <BookOpen />
            <h3>Learning materials</h3>
            {related.slice(0, 4).map((x) => (
              <a
                className="resource-link"
                key={x.id}
                href={x.url}
                target="_blank"
                rel="noreferrer"
              >
                {x.name}
                <small>
                  {x.optional ? "Optional enrichment" : "Primary reference"} ·{" "}
                  {x.provider}
                </small>
              </a>
            ))}
          </section>
          <Link
            className="btn btn-secondary full"
            href={
              r
                ? r.day < 14
                  ? "/academy/restart/" + (r.day + 1)
                  : "/assessments"
                : d!.day < 6
                  ? "/academy/week/" + w!.week + "/day/" + (d!.day + 1)
                  : "/reviews"
            }
          >
            Next step
          </Link>
        </aside>
      </div>
    </>
  );
}
