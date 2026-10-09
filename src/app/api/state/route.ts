import { NextResponse } from "next/server";
import { db, configured } from "@/lib/supabase/server";
import {
  mutationSchema,
  payloadSchemas,
  preferencesSchema,
  backupSchema,
} from "@/lib/schema";
import { assessments } from "@/lib/content";
export const dynamic = "force-dynamic";
async function context() {
  if (!configured()) return null;
  const client = await db();
  const {
    data: { user },
  } = await client.auth.getUser();
  return user ? { client, user } : null;
}
const fail = (message: string, status = 400) =>
  NextResponse.json({ error: message }, { status });
export async function GET() {
  const c = await context();
  if (!c) return fail("Please sign in.", 401);
  const profile = await c.client
    .from("profiles")
    .select("preferences")
    .eq("user_id", c.user.id)
    .maybeSingle();
  if (profile.error)
    return fail(
      "Unable to load your profile. Check the database migration.",
      500,
    );
  const records = [];
  // PostgREST commonly caps one response at 1,000 rows. Never silently truncate a year of study.
  for (let offset = 0; offset <= 10000; offset += 1000) {
    const page = await c.client
      .from("study_records")
      .select("id,kind,data,updated_at")
      .eq("user_id", c.user.id)
      .order("kind")
      .order("id")
      .range(offset, offset + 999);
    if (page.error)
      return fail("Unable to load your workspace. Please retry.", 500);
    if (offset === 10000 && page.data.length)
      return fail(
        "Your workspace exceeds 10,000 records. Export and archive older records before continuing.",
        409,
      );
    records.push(...page.data);
    if (page.data.length < 1000) break;
  }
  return NextResponse.json(
    {
      preferences: profile.data?.preferences ?? null,
      records: records.sort((a, b) => b.updated_at.localeCompare(a.updated_at)),
      userId: c.user.id,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(req: Request) {
  const c = await context();
  if (!c) return fail("Please sign in.", 401);
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return fail("Invalid origin.", 403);
  let body;
  try {
    const raw = await req.text();
    if (raw.length > 5000000)
      return fail("Request exceeds the 5 MB limit.", 413);
    body = JSON.parse(raw);
  } catch {
    return fail("Invalid JSON.");
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    return fail("Invalid request.");
  if (body.action === "preferences") {
    const p = preferencesSchema.safeParse(body.data);
    if (!p.success) return fail(p.error.issues[0].message);
    const { error } = await c.client
      .from("profiles")
      .upsert({ user_id: c.user.id, preferences: p.data });
    return error
      ? fail("Could not save preferences.", 500)
      : NextResponse.json({ ok: true });
  }
  if (body.action === "import") {
    const p = backupSchema.safeParse(body.data);
    if (!p.success) return fail("Backup failed validation.");
    const { error } = await c.client.rpc("import_backup", { backup: p.data });
    return error
      ? fail("Import failed; your existing data is unchanged.", 500)
      : NextResponse.json({ ok: true });
  }
  const p = mutationSchema.safeParse(body);
  if (!p.success) return fail("Invalid record.");
  if (body.action === "delete") {
    const { error } = await c.client
      .from("study_records")
      .delete()
      .eq("user_id", c.user.id)
      .eq("kind", p.data.kind)
      .eq("id", p.data.id);
    return error
      ? fail("Delete failed.", 500)
      : NextResponse.json({ ok: true });
  }
  const parsed = payloadSchemas[p.data.kind].safeParse(p.data.data);
  if (!parsed.success) return fail(parsed.error.issues[0].message);
  let data = parsed.data;
  if (p.data.kind === "assessment") {
    const a = data as import("@/lib/schema").Payload["assessment"];
    const definition = assessments.find((x) => x.id === a.assessmentId);
    if (!definition || a.answers.length !== definition.questions.length)
      return fail("Invalid assessment.");
    data = {
      ...a,
      quiz: Math.round(
        (definition.questions.filter((q, i) => q.correct === a.answers[i])
          .length /
          definition.questions.length) *
          100,
      ),
    };
  }
  const { error } = await c.client.from("study_records").upsert(
    { user_id: c.user.id, id: p.data.id, kind: p.data.kind, data },
    {
      onConflict: "user_id,kind,id",
      ignoreDuplicates: p.data.kind === "focus",
    },
  );
  return error
    ? fail("Save failed. Please retry.", 500)
    : NextResponse.json({ ok: true });
}
