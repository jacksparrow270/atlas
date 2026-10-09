"use client";
import { useState } from "react";
import { useAcademy } from "./store";
import { Heading, Metric } from "./learning";
import { Button } from "./ui/button";
import { interviewTopics } from "@/lib/content";
import { localDate } from "@/lib/engine";
import type { Payload } from "@/lib/schema";
const statuses = [
  "Interested",
  "Applied",
  "Online assessment",
  "Interview",
  "Offer",
  "Rejected",
  "Withdrawn",
] as const;
export function Career() {
  const s = useAcademy();
  const [edit, setEdit] = useState<string | null>(null);
  const applications = s.records.filter((r) => r.kind === "career");
  return (
    <>
      <Heading
        kicker="CAREER WORKSPACE"
        title="Turn learning into opportunity."
        description="Track the evidence, conversations, and applications that move your career forward."
      />
      <div className="metrics">
        {["Interested", "Applied", "Interview", "Offer"].map((status) => (
          <Metric
            key={status}
            label={status}
            value={String(
              applications.filter(
                (r) => (r.data as Payload["career"]).status === status,
              ).length,
            )}
            note="Applications in this stage"
          />
        ))}
      </div>
      <section className="card">
        <h2>Career roadmap</h2>
        <div className="stage-strip">
          {[
            [
              "Months 1–2",
              "Set up GitHub, practice explaining code, and document small projects.",
            ],
            [
              "Months 3–4",
              "Create a first resume, solve basic DSA and SQL tasks, and research internship requirements.",
            ],
            [
              "Months 5–8",
              "Publish project evidence, apply selectively, and practice technical conversations.",
            ],
            [
              "Months 9–12+",
              "Refine your portfolio, pursue referrals, run mock interviews, and keep applying through graduation.",
            ],
          ].map(([title, body]) => (
            <div className="stage-mini" key={title}>
              <h3>{title}</h3>
              <p>{body}</p>
            </div>
          ))}
        </div>
      </section>
      <div className="two-column">
        <section className="card">
          <h2>{edit ? "Update application" : "Add an opportunity"}</h2>
          <CareerForm
            key={edit || "new"}
            initial={edit ? s.get("career", edit) : undefined}
            date={localDate(new Date(), s.preferences.timezone)}
            onSave={async (data) => {
              const ok = await s.save(
                "career",
                edit || crypto.randomUUID(),
                data,
              );
              if (ok) setEdit(null);
              return ok;
            }}
          />
          {edit && (
            <button onClick={() => setEdit(null)}>Cancel editing</button>
          )}
        </section>
        <section className="card">
          <h2>Application pipeline</h2>
          {applications.map((r) => {
            const a = r.data as Payload["career"];
            return (
              <article className="application-card" key={r.id}>
                <div className="section-title">
                  <h3>{a.company}</h3>
                  <span className="pill">{a.status}</span>
                </div>
                <p>
                  {a.role} · {a.mode}
                </p>
                <p className="small">
                  {a.nextAction || "No next action recorded"}
                  {a.followUp ? " · Follow up " + a.followUp : ""}
                </p>
                <div className="button-row">
                  <button onClick={() => setEdit(r.id)}>
                    Edit application
                  </button>
                  {a.url && (
                    <a href={a.url} target="_blank" rel="noreferrer">
                      Open listing
                    </a>
                  )}
                  <button
                    className="danger-link"
                    onClick={() => {
                      if (confirm("Delete this application record?"))
                        void s.remove("career", r.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}
          {!applications.length && (
            <p className="empty">
              Start with a role you’re interested in. No application needs to be
              sent yet.
            </p>
          )}
        </section>
      </div>
      <section className="card">
        <h2>Interview practice & college requirements</h2>
        <p className="muted">
          Mark an area after an actual practice session. Self-study does not
          automatically fulfill formal internship credits.
        </p>
        <div className="two-column">
          {interviewTopics.map((t, i) => (
            <label className="choice" key={t}>
              <input
                type="checkbox"
                checked={s.get("interview", "topic-" + i)?.done || false}
                onChange={(e) =>
                  void s.save("interview", "topic-" + i, {
                    done: e.target.checked,
                  })
                }
              />
              {t}
            </label>
          ))}
        </div>
      </section>
    </>
  );
}
function CareerForm({
  initial,
  date,
  onSave,
}: {
  initial?: Payload["career"];
  date: string;
  onSave: (d: Payload["career"]) => Promise<boolean>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const v = (key: string) => String(f.get(key) || "");
        setBusy(true);
        try {
          if (
            await onSave({
              company: v("company"),
              role: v("role"),
              location: v("location"),
              mode: v("mode") as Payload["career"]["mode"],
              url: v("url"),
              date: v("date"),
              status: v("status") as Payload["career"]["status"],
              contact: v("contact"),
              salary: v("salary"),
              notes: v("notes"),
              nextAction: v("nextAction"),
              followUp: v("followUp"),
            })
          )
            form.reset();
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="two-column">
        {(["company", "role", "location", "contact", "salary"] as const).map(
          (k) => (
            <label key={k}>
              {k}
              <input
                name={k}
                required={k === "company" || k === "role"}
                maxLength={k === "salary" ? 100 : 150}
                defaultValue={initial?.[k]}
              />
            </label>
          ),
        )}
        <label>
          Work mode
          <select name="mode" defaultValue={initial?.mode || "Remote"}>
            <option>Remote</option>
            <option>Hybrid</option>
            <option>Onsite</option>
          </select>
        </label>
        <label>
          Status
          <select name="status" defaultValue={initial?.status || "Interested"}>
            {statuses.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </label>
        <label>
          Date added / applied
          <input
            name="date"
            type="date"
            required
            defaultValue={initial?.date || date}
          />
        </label>
      </div>
      <label>
        Application URL
        <input name="url" type="url" defaultValue={initial?.url} />
      </label>
      <label>
        Next action
        <input
          name="nextAction"
          maxLength={500}
          defaultValue={initial?.nextAction}
        />
      </label>
      <label>
        Follow-up date
        <input name="followUp" type="date" defaultValue={initial?.followUp} />
      </label>
      <label>
        Notes
        <textarea name="notes" defaultValue={initial?.notes} />
      </label>
      <Button disabled={busy}>
        {initial ? "Save application" : "Add opportunity"}
      </Button>
    </form>
  );
}
