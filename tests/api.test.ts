import { describe, it, expect, vi, beforeEach } from "vitest";
const state = vi.hoisted(() => ({
  user: null as null | { id: string },
  upsert: vi.fn(),
  rpc: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  delete: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({
  configured: () => true,
  db: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: () => ({
      upsert: state.upsert,
      select: state.select,
      delete: state.delete,
    }),
    rpc: state.rpc,
  }),
}));
import { POST, GET } from "../src/app/api/state/route";
const request = (data: unknown, origin = "http://localhost:3000") =>
  new Request("http://localhost:3000/api/state", {
    method: "POST",
    headers: { origin, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
beforeEach(() => {
  vi.clearAllMocks();
  state.user = null;
  state.upsert.mockResolvedValue({ error: null });
  state.rpc.mockResolvedValue({ error: null });
});
describe("state mutation boundary", () => {
  it("rejects unauthenticated reads and writes", async () => {
    expect((await GET()).status).toBe(401);
    expect((await POST(request({}))).status).toBe(401);
    expect(state.upsert).not.toHaveBeenCalled();
  });
  it("derives ownership from verified auth and discards incoming user_id", async () => {
    state.user = { id: "actual-owner" };
    const response = await POST(
      request({
        kind: "lesson",
        id: "restart-01",
        user_id: "someone-else",
        data: { status: "completed", notes: "Evidence", link: "" },
      }),
    );
    expect(response.status).toBe(200);
    expect(state.upsert.mock.calls[0][0].user_id).toBe("actual-owner");
  });
  it("rejects cross-origin mutations", async () => {
    state.user = { id: "owner" };
    expect((await POST(request({}, "https://attacker.example"))).status).toBe(
      403,
    );
    expect(state.upsert).not.toHaveBeenCalled();
  });
  it("rejects invalid payloads without writing", async () => {
    state.user = { id: "owner" };
    expect(
      (
        await POST(
          request({ kind: "task", id: "x", data: { title: "x", minutes: -5 } }),
        )
      ).status,
    ).toBe(400);
    expect(state.upsert).not.toHaveBeenCalled();
  });
  it("recomputes quiz grades server-side", async () => {
    state.user = { id: "owner" };
    const res = await POST(
      request({
        kind: "assessment",
        id: "attempt-1",
        data: {
          assessmentId: "foundation",
          answers: [0, 0, 2],
          quiz: 100,
          coding: null,
          problem: null,
          documentation: null,
          link: "",
          notes: "",
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(state.upsert.mock.calls[0][0].data.quiz).toBe(0);
  });
  it("deduplicates focus inserts using the stable composite key", async () => {
    state.user = { id: "owner" };
    const res = await POST(
      request({
        kind: "focus",
        id: "session-1",
        data: {
          task: "Study",
          subject: "Python",
          startedAt: "2026-01-01T00:00:00Z",
          endedAt: "2026-01-01T00:25:00Z",
          seconds: 1500,
          note: "",
        },
      }),
    );
    expect(res.status).toBe(200);
    expect(state.upsert.mock.calls[0][1]).toEqual({
      onConflict: "user_id,kind,id",
      ignoreDuplicates: true,
    });
  });
  it("rejects incompatible imports before calling the database", async () => {
    state.user = { id: "owner" };
    expect(
      (await POST(request({ action: "import", data: { version: 99 } }))).status,
    ).toBe(400);
    expect(state.rpc).not.toHaveBeenCalled();
  });
});
