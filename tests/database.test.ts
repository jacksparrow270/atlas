import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import { beforeAll, beforeEach, afterAll, describe, it, expect } from "vitest";
import { defaults } from "../src/lib/engine";

let pg: PGlite;
const alice = "11111111-1111-4111-8111-111111111111";
const bob = "22222222-2222-4222-8222-222222222222";
async function asUser(id: string) {
  await pg.exec("reset role;");
  await pg.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await pg.exec("set role authenticated;");
}
beforeAll(async () => {
  pg = new PGlite();
  await pg.exec(
    [
      "create role authenticated nologin;",
      "create role anon nologin;",
      "create schema auth;",
      "create table auth.users(id uuid primary key);",
      "create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;",
      "grant usage on schema auth,public to authenticated,anon;",
      "grant execute on function auth.uid() to authenticated,anon;",
    ].join("\n"),
  );
  await pg.exec(await readFile("supabase/migrations/001_academy.sql", "utf8"));
}, 30000);
beforeEach(async () => {
  await pg.exec("reset role; truncate auth.users cascade;");
  await pg.query("insert into auth.users(id) values ($1),($2)", [alice, bob]);
  await asUser(alice);
});
afterAll(async () => {
  await pg?.close();
});
describe("real PostgreSQL migration, RLS and transactional imports", () => {
  it("allows an owner to persist and retrieve a profile and record", async () => {
    await pg.query(
      "insert into public.profiles(user_id,preferences) values($1,$2)",
      [alice, JSON.stringify(defaults())],
    );
    await pg.query(
      "insert into public.study_records(user_id,kind,id,data) values($1,'lesson','restart-01',$2)",
      [
        alice,
        JSON.stringify({ status: "completed", notes: "Evidence", link: "" }),
      ],
    );
    const records = await pg.query<{ data: { status: string } }>(
      "select data from public.study_records",
    );
    expect(records.rows[0].data.status).toBe("completed");
    const profile = await pg.query("select * from public.profiles");
    expect(profile.rows).toHaveLength(1);
  });
  it("prevents cross-user reads, updates and deletes", async () => {
    await pg.query(
      "insert into public.study_records(user_id,kind,id,data) values($1,'interview','private',$2)",
      [alice, '{"done":true}'],
    );
    await asUser(bob);
    expect(
      (await pg.query("select * from public.study_records")).rows,
    ).toHaveLength(0);
    expect(
      (
        await pg.query(
          "update public.study_records set data='{\"done\":false}' where id='private'",
        )
      ).affectedRows,
    ).toBe(0);
    expect(
      (await pg.query("delete from public.study_records where id='private'"))
        .affectedRows,
    ).toBe(0);
    await asUser(alice);
    expect(
      (
        await pg.query<{ data: { done: boolean } }>(
          "select data from public.study_records",
        )
      ).rows[0].data.done,
    ).toBe(true);
  });
  it("rejects forged ownership and ownership reassignment", async () => {
    await expect(
      pg.query(
        "insert into public.profiles(user_id,preferences) values($1,'{}')",
        [bob],
      ),
    ).rejects.toThrow(/row-level security/i);
    await pg.query(
      "insert into public.study_records(user_id,kind,id,data) values($1,'interview','own','{\"done\":true}')",
      [alice],
    );
    await expect(
      pg.query("update public.study_records set user_id=$1 where id='own'", [
        bob,
      ]),
    ).rejects.toThrow(/row-level security/i);
  });
  it("denies anonymous table access and import execution", async () => {
    await pg.exec("reset role; set role anon;");
    await expect(
      pg.query("select * from public.study_records"),
    ).rejects.toThrow(/permission denied/i);
    await expect(pg.query("select public.import_backup('{}')")).rejects.toThrow(
      /permission denied/i,
    );
  });
  it("merges backups atomically using authenticated ownership", async () => {
    const backup = {
      version: 1,
      preferences: defaults(),
      records: [
        {
          user_id: bob,
          kind: "interview",
          id: "imported",
          data: { done: true },
        },
      ],
    };
    await pg.query("select public.import_backup($1)", [JSON.stringify(backup)]);
    await pg.query("select public.import_backup($1)", [
      JSON.stringify({
        ...backup,
        records: [{ ...backup.records[0], data: { done: false } }],
      }),
    ]);
    const records = await pg.query<{
      user_id: string;
      data: { done: boolean };
    }>("select user_id,data from public.study_records");
    expect(records.rows).toHaveLength(1);
    expect(records.rows[0].user_id).toBe(alice);
    expect(records.rows[0].data.done).toBe(false);
  });
  it("rolls back the entire import when one record violates constraints", async () => {
    const backup = {
      version: 1,
      preferences: defaults(),
      records: [
        { kind: "interview", id: "valid", data: { done: true } },
        { kind: "unsupported", id: "invalid", data: {} },
      ],
    };
    await expect(
      pg.query("select public.import_backup($1)", [JSON.stringify(backup)]),
    ).rejects.toThrow();
    expect(
      (await pg.query("select * from public.study_records")).rows,
    ).toHaveLength(0);
    expect((await pg.query("select * from public.profiles")).rows).toHaveLength(
      0,
    );
  });
  it("enforces a unique focus identifier per owner", async () => {
    const sql =
      "insert into public.study_records(user_id,kind,id,data) values($1,'focus','same-id','{}')";
    await pg.query(sql, [alice]);
    await expect(pg.query(sql, [alice])).rejects.toThrow(/duplicate key/i);
  });
  it("cascades account deletion to owned data", async () => {
    await pg.query(
      "insert into public.profiles(user_id,preferences) values($1,'{}')",
      [alice],
    );
    await pg.query(
      "insert into public.study_records(user_id,kind,id,data) values($1,'interview','owned','{\"done\":true}')",
      [alice],
    );
    await pg.exec("reset role;");
    await pg.query("delete from auth.users where id=$1", [alice]);
    expect((await pg.query("select * from public.profiles")).rows).toHaveLength(
      0,
    );
    expect(
      (await pg.query("select * from public.study_records")).rows,
    ).toHaveLength(0);
  });
  it("rejects missing backup version before changing a profile", async () => {
    await expect(
      pg.query("select public.import_backup($1)", [
        JSON.stringify({ preferences: defaults(), records: [] }),
      ]),
    ).rejects.toThrow(/Invalid backup/i);
  });
});
