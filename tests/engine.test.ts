import { describe, it, expect } from "vitest";
import {
  defaults,
  plan,
  grade,
  localDate,
  shiftDate,
  remainingSeconds,
  focusSeconds,
  completion,
  analytics,
  type TimerState,
} from "../src/lib/engine";
import { weeks, restart, lessonIds } from "../src/lib/content";
import {
  preferencesSchema,
  payloadSchemas,
  backupSchema,
  dateKey,
  type StudyRecord,
} from "../src/lib/schema";
describe("curriculum integrity", () => {
  it("contains 52 complete weeks and unique stable lesson IDs", () => {
    expect(weeks).toHaveLength(52);
    expect(weeks.flatMap((w) => w.days)).toHaveLength(312);
    expect(new Set(lessonIds).size).toBe(lessonIds.length);
    for (const w of weeks) {
      expect(w.days).toHaveLength(6);
      for (const d of w.days) {
        expect(d.exercise.length).toBeGreaterThan(35);
        expect(d.title.length).toBeGreaterThan(0);
      }
    }
  });
  it("authors all 14 restart days", () => {
    expect(restart).toHaveLength(14);
    for (const d of restart) {
      expect(d.explanation.length).toBeGreaterThan(180);
      expect(d.exercise.length).toBeGreaterThan(100);
      expect(d.question.options[d.question.correct]).toBeTruthy();
    }
  });
});
describe("scheduling", () => {
  const p = {
    ...defaults(),
    startDate: "2026-01-01",
    dailyMinutes: 50,
    restDay: 0,
    studyDays: [1, 2, 3, 4, 5, 6],
  };
  const tasks = [1, 2, 3].map((n) => ({
    id: "t" + n,
    title: "Task " + n,
    minutes: 25,
    href: "/today",
    reason: "Test",
  }));
  it("keeps future custom tasks off today and includes them on their due date", () => {
    const future = { ...tasks[0], due: "2026-01-06" };
    expect(plan("2026-01-05", p, [future], new Set())).toHaveLength(0);
    expect(plan("2026-01-06", p, [future], new Set())).toHaveLength(1);
  });
  it("honors capacity", () =>
    expect(plan("2026-01-05", p, tasks, new Set())).toHaveLength(2));
  it("does not repeat completed or duplicate tasks", () =>
    expect(
      plan(
        "2026-01-05",
        p,
        [tasks[0], tasks[0], tasks[1]],
        new Set(["t2"]),
      ).map((t) => t.id),
    ).toEqual(["t1"]));
  it("respects rest and dates before enrollment", () => {
    expect(plan("2026-01-04", p, tasks, new Set())).toEqual([]);
    expect(plan("2025-12-31", p, tasks, new Set())).toEqual([]);
  });
  it("keeps incomplete work despite elapsed calendar time", () =>
    expect(plan("2026-05-04", p, tasks, new Set())[0].id).toBe("t1"));
  it("does not exceed capacity for oversized tasks", () =>
    expect(
      plan("2026-01-05", p, [{ ...tasks[0], minutes: 90 }], new Set()),
    ).toEqual([]));
});
describe("grading", () => {
  it("uses the specified weights", () =>
    expect(
      grade({ coding: 100, problem: 80, quiz: 50, documentation: 100 }),
    ).toEqual({ score: 85, coverage: 100, complete: true }));
  it("labels partial grades and does not turn missing work into zero", () =>
    expect(
      grade({ coding: null, problem: null, quiz: 80, documentation: null }),
    ).toEqual({ score: 80, coverage: 20, complete: false }));
  it("handles no grades and actual zeros", () => {
    expect(
      grade({ coding: null, problem: null, quiz: null, documentation: null })
        .score,
    ).toBeNull();
    expect(
      grade({ coding: 0, problem: 0, quiz: 0, documentation: 0 }).score,
    ).toBe(0);
  });
});
describe("dates and focus", () => {
  const t: TimerState = {
    id: "abc",
    task: "Learn",
    subject: "Python",
    startedAt: "2026-01-01T00:00:00Z",
    endAt: 1500000,
    remaining: 1500,
    duration: 1500,
    phase: "focus",
  };
  it("uses Kolkata calendar boundaries", () =>
    expect(localDate(new Date("2026-01-01T19:00:00Z"), "Asia/Kolkata")).toBe(
      "2026-01-02",
    ));
  it("handles DST calendar dates without adding 24-hour assumptions", () =>
    expect(shiftDate("2026-03-08", 1)).toBe("2026-03-09"));
  it("recovers after sleeping past the end without overcounting", () => {
    expect(remainingSeconds(t, 2000000)).toBe(0);
    expect(focusSeconds(t, 2000000)).toBe(1500);
  });
  it("does not count paused wall time", () =>
    expect(
      remainingSeconds({ ...t, endAt: null, remaining: 1200 }, 9000000),
    ).toBe(1200));
  it("validates session duration", () =>
    expect(
      payloadSchemas.focus.safeParse({
        task: "x",
        subject: "y",
        startedAt: "2026-01-01T00:00:00Z",
        endedAt: "2026-01-01T00:01:00Z",
        seconds: 1500,
        note: "",
      }).success,
    ).toBe(false));
});
describe("progress and analytics", () => {
  const r: StudyRecord = {
    id: "session-1",
    kind: "focus",
    data: {
      task: "x",
      subject: "Python",
      startedAt: "2026-01-01T18:30:00Z",
      endedAt: "2026-01-01T18:55:00Z",
      seconds: 1500,
      note: "",
    },
    updated_at: "2026-01-01T18:55:00Z",
  };
  it("deduplicates sessions and attributes to the local date", () => {
    const a = analytics(
      [r, r],
      "Asia/Kolkata",
      "2026-01-02",
      [1, 2, 3, 4, 5, 6],
    );
    expect(a.total).toBe(1500);
    expect(a.daily["2026-01-02"]).toBe(1500);
    expect(a.days).toBe(1);
  });
  it("handles empty data", () => {
    const a = analytics([], "Asia/Kolkata", "2026-01-02", []);
    expect(a.total).toBe(0);
    expect(a.average).toBe(0);
    expect(a.consistency).toBe(0);
  });
  it("completion depends on IDs and explicit status", () =>
    expect(
      completion(
        ["x", "y"],
        [
          {
            id: "x",
            kind: "lesson",
            data: { status: "completed", notes: "", link: "" },
            updated_at: "",
          },
          {
            id: "y",
            kind: "lesson",
            data: { status: "in-progress", notes: "", link: "" },
            updated_at: "",
          },
        ],
      ),
    ).toEqual({ done: 1, total: 2 }));
});
describe("mutation and backup validation", () => {
  it("accepts editable valid preferences", () =>
    expect(preferencesSchema.safeParse(defaults()).success).toBe(true));
  it("rejects malformed dates and timezones", () => {
    expect(dateKey.safeParse("tomorrow").success).toBe(false);
    expect(
      preferencesSchema.safeParse({ ...defaults(), timezone: "Nowhere/Fake" })
        .success,
    ).toBe(false);
  });
  it("rejects script URLs", () =>
    expect(
      payloadSchemas.lesson.safeParse({
        status: "completed",
        notes: "",
        link: "javascript:alert(1)",
      }).success,
    ).toBe(false));
  it("requires versioned valid backups without duplicate IDs", () => {
    const r = { kind: "interview", id: "x", data: { done: true } };
    expect(
      backupSchema.safeParse({
        version: 1,
        preferences: defaults(),
        records: [r],
      }).success,
    ).toBe(true);
    expect(
      backupSchema.safeParse({
        version: 1,
        preferences: defaults(),
        records: [r, r],
      }).success,
    ).toBe(false);
    expect(
      backupSchema.safeParse({
        version: 2,
        preferences: defaults(),
        records: [],
      }).success,
    ).toBe(false);
  });
});
