import { z } from "zod";
export const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const date = new Date(v + "T00:00:00Z");
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === v
    );
  }, "Invalid date");
export const url = z.union([
  z.literal(""),
  z.url().refine((v) => /^https?:/.test(v), "Use an HTTP or HTTPS URL"),
]);
export const preferencesSchema = z.object({
  name: z.string().trim().min(1).max(80),
  education: z.string().max(100),
  graduation: z.coerce.number().int().min(2026).max(2100),
  target: z.string().max(100),
  proficiency: z.enum(["beginner", "some experience", "intermediate"]),
  timezone: z.string().refine((v) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: v });
      return true;
    } catch {
      return false;
    }
  }, "Invalid timezone"),
  startDate: dateKey,
  activeWeek: z.coerce.number().int().min(1).max(52),
  studyDays: z.array(z.number().int().min(0).max(6)).min(1).max(7),
  restDay: z.coerce.number().int().min(0).max(6),
  dailyMinutes: z.coerce.number().int().min(25).max(480),
  sessionMinutes: z.coerce.number().int().min(1).max(120),
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  onboarded: z.boolean(),
});
export type Preferences = z.infer<typeof preferencesSchema>;
export type RecordKind =
  | "lesson"
  | "task"
  | "focus"
  | "assessment"
  | "project"
  | "resource"
  | "review"
  | "career"
  | "interview";
const text = z.string().max(20000);
export const payloadSchemas = {
  lesson: z.object({
    status: z.enum([
      "not-started",
      "in-progress",
      "completed",
      "needs-revision",
    ]),
    notes: text,
    link: url,
  }),
  task: z.object({
    title: z.string().min(1).max(200),
    minutes: z.number().int().min(1).max(480),
    done: z.boolean(),
    due: dateKey,
    notes: text,
    priority: z.enum(["high", "normal", "low"]),
  }),
  focus: z
    .object({
      task: z.string().max(200),
      subject: z.string().max(100),
      startedAt: z.iso.datetime(),
      endedAt: z.iso.datetime(),
      seconds: z.number().int().min(1).max(7200),
      note: text,
    })
    .refine(
      (v) =>
        Date.parse(v.endedAt) >= Date.parse(v.startedAt) &&
        v.seconds <=
          Math.ceil((Date.parse(v.endedAt) - Date.parse(v.startedAt)) / 1000) +
            1,
      "Invalid session duration",
    ),
  assessment: z.object({
    assessmentId: z.string().max(100),
    answers: z.array(z.number().int().min(-1).max(10)).max(20),
    quiz: z.number().min(0).max(100),
    coding: z.number().min(0).max(100).nullable(),
    problem: z.number().min(0).max(100).nullable(),
    documentation: z.number().min(0).max(100).nullable(),
    link: url,
    notes: text,
  }),
  project: z.object({
    title: z.string().min(1).max(200),
    milestones: z
      .array(
        z.object({
          id: z.string().max(100),
          title: z.string().max(200),
          done: z.boolean(),
        }),
      )
      .max(100),
    notes: text,
    github: url,
    demo: url,
    architecture: text,
    retrospective: text,
  }),
  resource: z.object({
    favorite: z.boolean(),
    status: z.enum(["unvisited", "visited", "completed"]),
  }),
  review: z.object({
    week: z.number().int().min(1).max(52),
    answers: z.array(text).length(6),
    goal: text,
  }),
  career: z.object({
    company: z.string().min(1).max(150),
    role: z.string().min(1).max(150),
    location: z.string().max(150),
    mode: z.enum(["Remote", "Hybrid", "Onsite"]),
    url,
    date: dateKey,
    status: z.enum([
      "Interested",
      "Applied",
      "Online assessment",
      "Interview",
      "Offer",
      "Rejected",
      "Withdrawn",
    ]),
    contact: z.string().max(200),
    salary: z.string().max(100),
    notes: text,
    nextAction: z.string().max(500),
    followUp: z.union([dateKey, z.literal("")]),
  }),
  interview: z.object({ done: z.boolean() }),
};
export type Payload = {
  [K in RecordKind]: z.infer<(typeof payloadSchemas)[K]>;
};
export type StudyRecord<K extends RecordKind = RecordKind> = {
  id: string;
  kind: K;
  data: Payload[K];
  updated_at: string;
};
export const mutationSchema = z.object({
  kind: z.enum([
    "lesson",
    "task",
    "focus",
    "assessment",
    "project",
    "resource",
    "review",
    "career",
    "interview",
  ]),
  id: z.string().regex(/^[a-zA-Z0-9_-]{1,120}$/),
  data: z.unknown(),
});
export const backupSchema = z
  .object({
    version: z.literal(1),
    preferences: preferencesSchema,
    records: z.array(mutationSchema).max(10000),
  })
  .superRefine((v, ctx) => {
    const ids = new Set();
    for (const r of v.records) {
      if (!payloadSchemas[r.kind].safeParse(r.data).success)
        ctx.addIssue({
          code: "custom",
          message: "Invalid " + r.kind + " record",
        });
      const key = r.kind + ":" + r.id;
      if (ids.has(key))
        ctx.addIssue({ code: "custom", message: "Duplicate record" });
      ids.add(key);
    }
  });
