// Optional live integration verification. Use two dedicated test accounts.
import { createClient } from "@supabase/supabase-js";
import assert from "node:assert/strict";
const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "ATLAS_TEST_EMAIL_A",
  "ATLAS_TEST_PASSWORD_A",
  "ATLAS_TEST_EMAIL_B",
  "ATLAS_TEST_PASSWORD_B",
];
for (const key of required)
  if (!process.env[key])
    throw Error("Missing " + key + "; live RLS test was not run.");
const make = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false } },
  );
const a = make(),
  b = make(),
  anon = make();
const login = async (c, suffix) => {
  const { data, error } = await c.auth.signInWithPassword({
    email: process.env["ATLAS_TEST_EMAIL_" + suffix],
    password: process.env["ATLAS_TEST_PASSWORD_" + suffix],
  });
  if (error) throw error;
  return data.user.id;
};
const aid = await login(a, "A"),
  bid = await login(b, "B");
assert.notEqual(aid, bid, "Use different users");
const id = "rls-test-" + crypto.randomUUID();
try {
  let r = await a
    .from("study_records")
    .insert({ user_id: aid, kind: "interview", id, data: { done: true } });
  assert.equal(r.error, null);
  const own = await a.from("study_records").select("*").eq("id", id);
  assert.equal(own.data?.length, 1);
  const cross = await b.from("study_records").select("*").eq("id", id);
  assert.equal(cross.data?.length, 0);
  const foreign = await b.from("study_records").insert({
    user_id: aid,
    kind: "interview",
    id: id + "-foreign",
    data: { done: true },
  });
  assert.ok(foreign.error);
  await b
    .from("study_records")
    .update({ data: { done: false } })
    .eq("user_id", aid)
    .eq("id", id);
  const after = await a
    .from("study_records")
    .select("data")
    .eq("id", id)
    .single();
  assert.equal(after.data.data.done, true);
  const unauth = await anon.from("study_records").select("*");
  assert.ok(unauth.error || unauth.data?.length === 0);
  console.log(
    "PASS: own-user persistence, cross-user read/write isolation, anonymous access rejection.",
  );
} finally {
  await a.from("study_records").delete().eq("id", id);
  await a.auth.signOut();
  await b.auth.signOut();
}
