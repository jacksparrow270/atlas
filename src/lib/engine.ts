import { addDays, format, parseISO } from "date-fns";
import type { Preferences, StudyRecord, Payload } from "./schema";
export function localDate(now: Date, timezone: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function dayOfWeek(date: string) {
  return parseISO(date).getDay();
}
export const shiftDate = (date: string, n: number) =>
  format(addDays(parseISO(date), n), "yyyy-MM-dd");
export function defaults(): Preferences {
  return {
    name: "Student",
    education: "Third-year B.Tech",
    graduation: 2028,
    target: "AI Engineer",
    proficiency: "beginner",
    timezone: "Asia/Kolkata",
    startDate: localDate(new Date(), "Asia/Kolkata"),
    activeWeek: 1,
    studyDays: [1, 2, 3, 4, 5, 6],
    restDay: 0,
    dailyMinutes: 50,
    sessionMinutes: 25,
    startTime: "18:00",
    onboarded: false,
  };
}
export function completion(ids: string[], records: StudyRecord[]) {
  const done = new Set(
    records
      .filter(
        (r) =>
          r.kind === "lesson" &&
          (r.data as Payload["lesson"]).status === "completed",
      )
      .map((r) => r.id),
  );
  return { done: ids.filter((id) => done.has(id)).length, total: ids.length };
}
export type PlanTask = {
  id: string;
  title: string;
  minutes: number;
  href: string;
  reason: string;
  due?: string;
};
export function plan(
  date: string,
  p: Preferences,
  candidates: PlanTask[],
  completed: Set<string>,
): PlanTask[] {
  if (
    date < p.startDate ||
    dayOfWeek(date) === p.restDay ||
    !p.studyDays.includes(dayOfWeek(date))
  )
    return [];
  let remaining = p.dailyMinutes;
  const seen = new Set<string>();
  const out: PlanTask[] = [];
  for (const c of candidates) {
    if (c.due && c.due > date) continue;
    if (completed.has(c.id) || seen.has(c.id)) continue;
    seen.add(c.id);
    if (c.minutes > remaining) continue;
    out.push(c);
    remaining -= c.minutes;
  }
  return out;
}
export function grade(values: {
  coding: number | null;
  problem: number | null;
  quiz: number | null;
  documentation: number | null;
}) {
  const weights = {
    coding: 0.4,
    problem: 0.25,
    quiz: 0.2,
    documentation: 0.15,
  };
  let sum = 0,
    weight = 0;
  for (const k of Object.keys(weights) as (keyof typeof weights)[]) {
    if (values[k] !== null) {
      sum += values[k]! * weights[k];
      weight += weights[k];
    }
  }
  return {
    score: weight ? Math.round(sum / weight) : null,
    coverage: Math.round(weight * 100),
    complete: weight > 0.999,
  };
}
export type TimerState = {
  id: string;
  task: string;
  subject: string;
  startedAt: string;
  endAt: number | null;
  remaining: number;
  duration: number;
  phase: "focus" | "break";
};
export function remainingSeconds(t: TimerState, now: number) {
  return t.endAt === null
    ? t.remaining
    : Math.max(0, Math.ceil((t.endAt - now) / 1000));
}
export function focusSeconds(t: TimerState, now: number) {
  return Math.max(0, t.duration - remainingSeconds(t, now));
}
export function analytics(
  records: StudyRecord[],
  timezone: string,
  today: string,
  studyDays: number[],
) {
  const unique = new Map(
    records.filter((r) => r.kind === "focus").map((r) => [r.id, r]),
  );
  const sessions = [...unique.values()].map((r) => r.data as Payload["focus"]);
  const daily: Record<string, number> = {};
  const subjects: Record<string, number> = {};
  for (const s of sessions) {
    const d = localDate(new Date(s.endedAt), timezone);
    daily[d] = (daily[d] || 0) + s.seconds;
    subjects[s.subject] = (subjects[s.subject] || 0) + s.seconds;
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(today, i - 6);
    return { date, minutes: Math.round((daily[date] || 0) / 60) };
  });
  const planned = week.filter((d) => studyDays.includes(dayOfWeek(d.date)));
  const total = sessions.reduce((n, s) => n + s.seconds, 0);
  return {
    total,
    weekly: week.reduce((n, d) => n + d.minutes, 0),
    average: sessions.length ? total / sessions.length : 0,
    days: Object.keys(daily).length,
    consistency: planned.length
      ? Math.round(
          (planned.filter((d) => (daily[d.date] || 0) >= 60).length /
            planned.length) *
            100,
        )
      : 0,
    week,
    daily,
    subjects,
  };
}
