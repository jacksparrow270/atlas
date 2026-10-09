"use client";
import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Play, Pause, RotateCcw, Check, Plus, Clock } from "lucide-react";
import { useAcademy } from "./store";
import { Heading, Agenda, usePlan, Metric } from "./learning";
import { Button } from "./ui/button";
import {
  focusSeconds,
  remainingSeconds,
  localDate,
  shiftDate,
  plan,
  analytics,
  type TimerState,
} from "@/lib/engine";
import type { Payload } from "@/lib/schema";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
export function Planner() {
  const s = useAcademy();
  const p = usePlan();
  const [edit, setEdit] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const tasks = s.records.filter((r) => r.kind === "task");
  return (
    <>
      <Heading
        kicker="TODAY’S PLAN"
        title="Make the next hour count."
        description={
          s.preferences.dailyMinutes +
          " minutes of planned focus. Unfinished work stays available."
        }
        action={
          <Button
            variant="secondary"
            onClick={async () => {
              await s.refresh();
              setMessage(
                "Rebalanced using your saved capacity and availability. Unfinished prerequisites and due custom tasks remain in the queue.",
              );
            }}
          >
            Rebalance my week
          </Button>
        }
      />
      {message && (
        <p role="status" className="alert">
          {message}
        </p>
      )}
      <section className="card">
        <h2>Recommended blocks</h2>
        <Agenda tasks={p.tasks} />
      </section>
      <div className="two-column">
        <section className="card">
          <h2>{edit ? "Edit task" : "Add a personal task"}</h2>
          <TaskForm
            key={edit || "new"}
            initial={edit ? s.get("task", edit) : undefined}
            onSave={async (data) => {
              const ok = await s.save(
                "task",
                edit || crypto.randomUUID(),
                data,
              );
              if (ok) setEdit(null);
              return ok;
            }}
            date={p.today}
          />
        </section>
        <section className="card">
          <h2>Your custom tasks</h2>
          {!tasks.length && (
            <p className="muted">
              Add an assignment, a practice problem, or a small next step.
            </p>
          )}
          {tasks.map((r) => {
            const t = r.data as Payload["task"];
            return (
              <div className="custom-task" key={r.id}>
                <label className="choice">
                  <input
                    type="checkbox"
                    checked={t.done}
                    onChange={() =>
                      void s.save("task", r.id, { ...t, done: !t.done })
                    }
                  />
                  <span>
                    <strong>{t.title}</strong>
                    <small>
                      {t.due} · {t.minutes} min · {t.priority}
                    </small>
                  </span>
                </label>
                <button onClick={() => setEdit(r.id)}>Edit / reschedule</button>
                <button
                  className="danger-link"
                  onClick={() => {
                    if (confirm("Delete this custom task?"))
                      void s.remove("task", r.id);
                  }}
                >
                  Delete
                </button>
              </div>
            );
          })}
        </section>
      </div>
    </>
  );
}
function TaskForm({
  initial,
  onSave,
  date,
}: {
  initial?: Payload["task"];
  onSave: (d: Payload["task"]) => Promise<boolean>;
  date: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        setBusy(true);
        try {
          if (
            await onSave({
              title: String(f.get("title")),
              minutes: Number(f.get("minutes")),
              due: String(f.get("due")),
              priority: f.get("priority") as Payload["task"]["priority"],
              notes: String(f.get("notes")),
              done: initial?.done || false,
            })
          )
            form.reset();
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Task title
        <input
          name="title"
          required
          maxLength={200}
          defaultValue={initial?.title}
        />
      </label>
      <div className="two-column">
        <label>
          Minutes
          <input
            name="minutes"
            type="number"
            min={1}
            max={480}
            required
            defaultValue={initial?.minutes || 25}
          />
        </label>
        <label>
          Due date
          <input
            name="due"
            type="date"
            required
            defaultValue={initial?.due || date}
          />
        </label>
      </div>
      <label>
        Priority
        <select name="priority" defaultValue={initial?.priority || "normal"}>
          <option>high</option>
          <option>normal</option>
          <option>low</option>
        </select>
      </label>
      <label>
        Notes
        <textarea name="notes" defaultValue={initial?.notes} />
      </label>
      <Button disabled={busy}>
        <Plus size={16} />
        {initial ? "Save changes" : "Add task"}
      </Button>
    </form>
  );
}
export function Schedule() {
  const s = useAcademy();
  const p = usePlan();
  const [offset, setOffset] = useState(0);
  const days = Array.from({ length: 7 }, (_, i) =>
    shiftDate(p.today, offset + i),
  );
  const allocated = new Set(p.done);
  const plans = days.map((date) => {
    const tasks = plan(date, s.preferences, p.candidates, allocated);
    tasks.forEach((t) => allocated.add(t.id));
    return { date, tasks };
  });
  return (
    <>
      <Heading
        kicker="YOUR SCHEDULE"
        title="A week with room to breathe."
        description="Suggested dates and academic progress are separate. A passed date never completes a lesson."
        action={
          <div className="button-row">
            <Button variant="secondary" onClick={() => setOffset((n) => n - 7)}>
              Previous
            </Button>
            <Button variant="secondary" onClick={() => setOffset((n) => n + 7)}>
              Next week
            </Button>
          </div>
        }
      />
      <div className="calendar-grid">
        {plans.map(({ date, tasks }) => (
          <section
            className={"card calendar-day " + (date === p.today ? "today" : "")}
            key={date}
          >
            <p className="eyebrow">
              {new Date(date + "T12:00:00").toLocaleDateString("en", {
                weekday: "long",
              })}
            </p>
            <h2>{date.slice(5)}</h2>
            {tasks.length ? (
              tasks.map((t) => (
                <Link className="calendar-task" href={t.href} key={t.id}>
                  <strong>{t.title}</strong>
                  <small>
                    {s.preferences.startTime} onward · {t.minutes} min
                  </small>
                  <span>{t.reason}</span>
                </Link>
              ))
            ) : (
              <p className="muted">Rest / open time</p>
            )}
          </section>
        ))}
      </div>
      <p className="muted">
        These are suggestions based on current completion, availability and
        capacity. Edit your plan in Settings or reschedule custom tasks in
        Today’s plan.
      </p>
    </>
  );
}
export function Focus() {
  const s = useAcademy();
  const query = useSearchParams();
  const key = "atlas-timer-" + s.userId;
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);
  const [minutes, setMinutes] = useState(s.preferences.sessionMinutes);
  const [task, setTask] = useState(query.get("task") || "Independent study");
  const [subject, setSubject] = useState("Programming");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const busy = useRef(false);
  useEffect(() => {
    const restore = () => {
      try {
        const value = localStorage.getItem(key);
        const parsed = value ? JSON.parse(value) : null;
        if (
          parsed &&
          typeof parsed.id === "string" &&
          typeof parsed.duration === "number" &&
          parsed.duration > 0 &&
          parsed.duration <= 7200 &&
          typeof parsed.remaining === "number" &&
          (parsed.endAt === null || typeof parsed.endAt === "number") &&
          ["focus", "break"].includes(parsed.phase)
        ) {
          setTimer(parsed);
        } else setTimer(null);
      } catch {
        setTimer(null);
      }
      setNow(Date.now());
      setReady(true);
    };
    restore();
    const sync = (e: StorageEvent) => {
      if (e.key === key) restore();
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [key]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, []);
  function commit(value: TimerState | null) {
    setTimer(value);
    setNow(Date.now());
    if (value) localStorage.setItem(key, JSON.stringify(value));
    else localStorage.removeItem(key);
  }
  async function locked(action: () => Promise<void> | void) {
    if (busy.current) return;
    busy.current = true;
    try {
      if (navigator.locks)
        await navigator.locks.request(key, async () => {
          const stored = localStorage.getItem(key);
          if (stored && timer && JSON.parse(stored).id !== timer.id) {
            setMessage("Another tab changed this session. Reload to continue.");
            return;
          }
          await action();
        });
      else await action();
    } finally {
      busy.current = false;
    }
  }
  function start(phase: "focus" | "break" = "focus", duration = minutes * 60) {
    void locked(() => {
      const existing = localStorage.getItem(key);
      if (existing && !timer) {
        setTimer(JSON.parse(existing));
        setMessage("Resumed the session from another tab.");
        return;
      }
      commit({
        id: crypto.randomUUID(),
        task,
        subject,
        startedAt: new Date().toISOString(),
        endAt: Date.now() + duration * 1000,
        remaining: duration,
        duration,
        phase,
      });
    });
  }
  const remaining = timer ? remainingSeconds(timer, now) : minutes * 60;
  const elapsed = timer ? focusSeconds(timer, now) : 0;
  async function finish() {
    if (!timer || timer.phase === "break") return;
    const snapshot = timer;
    if (
      remaining > 0 &&
      !confirm(
        "Save the " +
          Math.floor(elapsed / 60) +
          " minutes you focused and finish this session?",
      )
    )
      return;
    await locked(async () => {
      setSaving(true);
      try {
        const seconds = focusSeconds(snapshot, Date.now());
        if (seconds < 1) {
          setMessage("Focus for at least one second before logging.");
          return;
        }
        const endedAt = new Date(
          snapshot.endAt && snapshot.endAt < Date.now()
            ? snapshot.endAt
            : Date.now(),
        ).toISOString();
        const ok = await s.save("focus", snapshot.id, {
          task: snapshot.task,
          subject: snapshot.subject,
          startedAt: snapshot.startedAt,
          endedAt,
          seconds,
          note,
        });
        if (ok) {
          commit(null);
          setMessage("Session recorded. Take a short break when you’re ready.");
        }
      } finally {
        setSaving(false);
      }
    });
  }
  return (
    <>
      <Heading
        kicker="THE FOCUS ROOM"
        title="One thing at a time."
        description="Choose a small task. Give it your attention."
      />
      <section className="focus-workspace">
        <div className="focus-controls">
          <label>
            Your focus
            <input
              value={task}
              disabled={!!timer}
              onChange={(e) => setTask(e.target.value)}
              maxLength={200}
            />
          </label>
          <label>
            Subject
            <select
              value={subject}
              disabled={!!timer}
              onChange={(e) => setSubject(e.target.value)}
            >
              {[
                "Programming",
                "Mathematics",
                "DSA",
                "Machine Learning",
                "Deep Learning",
                "AI Engineering",
                "Project Development",
                "Career Preparation",
              ].map((x) => (
                <option key={x}>{x}</option>
              ))}
            </select>
          </label>
          <label>
            Session length
            <select
              disabled={!!timer}
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
            >
              {[
                ...new Set([
                  s.preferences.sessionMinutes,
                  1,
                  15,
                  25,
                  45,
                  50,
                  60,
                  90,
                ]),
              ]
                .sort((a, b) => a - b)
                .map((n) => (
                  <option key={n} value={n}>
                    {n} minutes
                  </option>
                ))}
            </select>
          </label>
        </div>
        <div
          className="timer-circle"
          style={
            {
              "--progress":
                (timer ? (elapsed / timer.duration) * 360 : 0) + "deg",
            } as React.CSSProperties
          }
        >
          <div>
            <span className="eyebrow">
              {timer?.phase === "break"
                ? "REST & RESET"
                : timer?.endAt
                  ? "IN FOCUS"
                  : timer
                    ? "PAUSED"
                    : "READY WHEN YOU ARE"}
            </span>
            <strong
              aria-label={
                Math.floor(remaining / 60) +
                " minutes " +
                (remaining % 60) +
                " seconds"
              }
            >
              {String(Math.floor(remaining / 60)).padStart(2, "0")}
              <span>:</span>
              {String(remaining % 60).padStart(2, "0")}
            </strong>
            <p>{timer?.task || task}</p>
          </div>
        </div>
        <div className="timer-buttons">
          {!timer ? (
            <Button disabled={!ready} onClick={() => start()}>
              <Play /> Begin focus
            </Button>
          ) : (
            <>
              {remaining > 0 && (
                <Button
                  onClick={() =>
                    void locked(() =>
                      commit({
                        ...timer,
                        endAt: timer.endAt
                          ? null
                          : Date.now() + timer.remaining * 1000,
                        remaining: remainingSeconds(timer, Date.now()),
                      }),
                    )
                  }
                >
                  {timer.endAt ? <Pause /> : <Play />}
                  {timer.endAt ? "Pause" : "Resume"}
                </Button>
              )}
              {timer.phase === "focus" ? (
                <Button
                  disabled={saving || elapsed < 1}
                  variant="secondary"
                  onClick={() => void finish()}
                >
                  <Check />
                  {remaining === 0 ? "Save completed session" : "Finish & save"}
                </Button>
              ) : (
                <Button onClick={() => commit(null)}>
                  Skip / finish break
                </Button>
              )}
              <Button
                variant="ghost"
                onClick={() => {
                  if (
                    confirm("Reset this session? Unlogged time will not count.")
                  )
                    void locked(() => commit(null));
                }}
              >
                <RotateCcw /> Reset
              </Button>
            </>
          )}
        </div>
        {!timer && (
          <div className="button-row centered">
            <button onClick={() => start("break", 300)}>5-minute break</button>
            <button onClick={() => start("break", 900)}>15-minute break</button>
          </div>
        )}
        <label className="focus-note">
          Session note
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional: what moved forward?"
          />
        </label>
        {remaining === 0 && timer?.phase === "focus" && (
          <p role="status" className="success">
            Your block is complete. Save the session to add it to your progress.
          </p>
        )}
        <p role="status">{message}</p>
        <p className="small muted">
          Your timer follows elapsed clock time, including background tabs and
          sleep. Pause before stepping away. Only saved focus time counts.
        </p>
      </section>
    </>
  );
}
export function Analytics() {
  const s = useAcademy();
  const today = localDate(new Date(), s.preferences.timezone);
  const a = analytics(
    s.records,
    s.preferences.timezone,
    today,
    s.preferences.studyDays.filter((d) => d !== s.preferences.restDay),
  );
  return (
    <>
      <Heading
        kicker="YOUR PROGRESS"
        title="Evidence of the work."
        description="Real sessions, completed work, and room to improve."
      />
      <div className="metrics">
        <Metric
          label="Focused time"
          value={(a.total / 3600).toFixed(1)}
          unit="hrs"
          note="Completed or explicitly saved"
        />
        <Metric
          label="Average session"
          value={Math.round(a.average / 60).toString()}
          unit="min"
          note="Across saved sessions"
        />
        <Metric
          label="Study days"
          value={String(a.days)}
          note="Dates with saved focus"
        />
        <Metric
          label="Weekly consistency"
          value={a.consistency + "%"}
          note="Planned days with ≥1 minute logged"
        />
      </div>
      <div className="two-column">
        <section className="card">
          <h2>Your last seven days</h2>
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={a.week}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(v) => v.slice(5)}
                  stroke="var(--muted)"
                />
                <YAxis stroke="var(--muted)" unit="m" />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface)",
                    borderColor: "var(--border)",
                    color: "var(--text)",
                  }}
                />
                <Bar
                  dataKey="minutes"
                  fill="var(--accent)"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="card">
          <h2>Where your attention goes</h2>
          {Object.entries(a.subjects).length ? (
            Object.entries(a.subjects).map(([name, seconds]) => (
              <div className="distribution" key={name}>
                <span>{name}</span>
                <strong>{Math.round(seconds / 60)} min</strong>
                <div className="progress">
                  <span style={{ width: (seconds / a.total) * 100 + "%" }} />
                </div>
              </div>
            ))
          ) : (
            <div className="empty">
              <Clock />
              <p>Log a session with a subject to see your distribution.</p>
            </div>
          )}
        </section>
      </div>
      <section className="card">
        <h2>84 days of practice</h2>
        <div className="heatmap">
          {Array.from({ length: 84 }, (_, i) => shiftDate(today, i - 83)).map(
            (date) => (
              <div
                key={date}
                title={
                  date + ": " + Math.round((a.daily[date] || 0) / 60) + " min"
                }
                style={{
                  background: a.daily[date]
                    ? "color-mix(in srgb, var(--accent) " +
                      Math.min(100, 20 + a.daily[date] / 60) +
                      "%, var(--surface))"
                    : "var(--surface)",
                }}
              >
                <span className="sr-only">
                  {date}: {Math.round((a.daily[date] || 0) / 60)} minutes
                </span>
              </div>
            ),
          )}
        </div>
        <p className="small muted">
          Blank days are part of the record, not a penalty.
        </p>
      </section>
      <section className="card">
        <h2>Session history</h2>
        {s.records
          .filter((r) => r.kind === "focus")
          .slice(0, 30)
          .map((r) => {
            const f = r.data as Payload["focus"];
            return (
              <div className="list-row" key={r.id}>
                <div>
                  <strong>{f.task}</strong>
                  <small>
                    {localDate(new Date(f.endedAt), s.preferences.timezone)} ·{" "}
                    {f.subject} · {Math.round(f.seconds / 60)} min
                  </small>
                </div>
                <button
                  className="danger-link"
                  onClick={() => {
                    if (
                      confirm(
                        "Delete this session? Analytics will be recalculated.",
                      )
                    )
                      void s.remove("focus", r.id);
                  }}
                >
                  Delete
                </button>
              </div>
            );
          })}
        {!a.total && <p className="muted">No saved sessions yet.</p>}
      </section>
    </>
  );
}
