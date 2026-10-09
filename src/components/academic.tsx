"use client";
import { useState } from "react";
import Link from "next/link";
import { BookOpen, ExternalLink, Star, Plus, FolderCode } from "lucide-react";
import { useAcademy } from "./store";
import { Heading, Progress } from "./learning";
import { Button } from "./ui/button";
import { assessments, projects, resources } from "@/lib/content";
import { grade, analytics, localDate } from "@/lib/engine";
import type { Payload } from "@/lib/schema";
export function Assessments() {
  const s = useAcademy();
  const [selected, setSelected] = useState(assessments[0].id);
  return (
    <>
      <Heading
        kicker="ASSESSMENT CENTER"
        title="Show what you understand."
        description="Quizzes are scored automatically. Practical work uses an honest, explicitly labeled self-assessment."
      />
      <div className="tabs">
        {assessments.map((x) => (
          <button
            aria-pressed={selected === x.id}
            className={selected === x.id ? "active" : ""}
            onClick={() => setSelected(x.id)}
            key={x.id}
          >
            {x.title}
          </button>
        ))}
      </div>
      <AssessmentForm key={selected} id={selected} />
      <section className="card">
        <h2>Your report cards</h2>
        <p className="muted">
          Programming 40% · Independent problems 25% · Concepts 20% ·
          Documentation 15%. A provisional score includes only graded
          categories; passing is shown only after all four are assessed.
        </p>
        {s.records
          .filter((r) => r.kind === "assessment")
          .map((r) => {
            const d = r.data as Payload["assessment"];
            const g = grade(d);
            const definition = assessments.find((x) => x.id === d.assessmentId);
            return (
              <div className="report-card" key={r.id}>
                <div>
                  <h3>{definition?.title}</h3>
                  <small>
                    {new Date(r.updated_at).toLocaleString()} · Practical scores
                    are self-assessed
                  </small>
                  <p>
                    {g.complete
                      ? g.score! >= 85
                        ? "Excellence target met"
                        : g.score! >= 70
                          ? "Passing target met"
                          : "Revision recommended"
                      : "Provisional · " +
                        g.coverage +
                        "% of grading weight assessed"}
                  </p>
                  <p className="small">
                    {d.quiz < 70
                      ? "Review the concept explanations and retry with fresh examples."
                      : "Concept quiz target met. Verify the practical deliverable against the rubric."}
                  </p>
                  {d.link && (
                    <a href={d.link} target="_blank" rel="noreferrer">
                      Submission evidence
                    </a>
                  )}
                </div>
                <strong className="score">
                  {g.score ?? "—"}
                  <small>/ 100</small>
                </strong>
              </div>
            );
          })}
        {!s.records.some((r) => r.kind === "assessment") && (
          <p className="muted">
            Your first submitted assessment will appear here.
          </p>
        )}
      </section>
    </>
  );
}
function AssessmentForm({ id }: { id: string }) {
  const s = useAcademy();
  const a = assessments.find((x) => x.id === id)!;
  const [answers, setAnswers] = useState<number[]>(a.questions.map(() => -1));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  return (
    <form
      className="card"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const score = (key: string) =>
          f.get(key) === "" ? null : Number(f.get(key));
        setBusy(true);
        try {
          const quiz = Math.round(
            (a.questions.filter((q, i) => q.correct === answers[i]).length /
              a.questions.length) *
              100,
          );
          if (
            await s.save("assessment", crypto.randomUUID(), {
              assessmentId: a.id,
              answers,
              quiz,
              coding: score("coding"),
              problem: score("problem"),
              documentation: score("documentation"),
              link: String(f.get("link")),
              notes: String(f.get("notes")),
            })
          )
            setMessage(
              "Submitted. Concept score: " +
                quiz +
                "%. Your report card is below.",
            );
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className="eyebrow">WEEK {a.week} / PRACTICAL DELIVERABLE</p>
      <h2>{a.title}</h2>
      <p>{a.deliverable}</p>
      <div className="rubric">
        <h3>Self-assessment rubric</h3>
        <p>
          <strong>Programming:</strong> correctness 40, tests 25, structure 20,
          failure handling 15.
        </p>
        <p>
          <strong>Problem solving:</strong> independent approach 40, reasoning
          30, edge cases 30.
        </p>
        <p>
          <strong>Documentation:</strong> reproducible setup 40, evidence 30,
          limitations and reflection 30.
        </p>
        <p className="small muted">
          Leave scores blank until you have evidence. These are your
          evaluations, not automated judgments of code.
        </p>
      </div>
      {a.questions.map((q, i) => (
        <fieldset className="quiz-question" key={q.prompt}>
          <legend>
            {i + 1}. {q.prompt}
          </legend>
          {q.options.map((o, j) => (
            <label className="choice" key={o}>
              <input
                type="radio"
                name={"q" + i}
                required
                checked={answers[i] === j}
                onChange={() =>
                  setAnswers((old) => old.map((v, k) => (k === i ? j : v)))
                }
              />
              {o}
            </label>
          ))}
        </fieldset>
      ))}
      <div className="three-column">
        {["coding", "problem", "documentation"].map((key) => (
          <label key={key}>
            {key} score (0–100, optional)
            <input name={key} type="number" min={0} max={100} />
          </label>
        ))}
      </div>
      <label>
        Submission URL
        <input name="link" type="url" placeholder="https://github.com/…" />
      </label>
      <label>
        Skills demonstrated, weak topics and revision plan
        <textarea name="notes" rows={4} />
      </label>
      <Button disabled={busy || answers.includes(-1)}>Submit assessment</Button>
      <p role="status">{message}</p>
    </form>
  );
}
export function Projects() {
  const s = useAcademy();
  const custom = s.records.filter(
    (r) => r.kind === "project" && !projects.some((p) => p.id === r.id),
  );
  const all = [
    ...projects,
    ...custom.map((r) => ({
      id: r.id,
      title: (r.data as Payload["project"]).title,
      week: 0,
      description: "Your custom engineering project.",
      milestones: (r.data as Payload["project"]).milestones.map((m) => m.title),
    })),
  ];
  return (
    <>
      <Heading
        kicker="PROJECT LAB"
        title="Build something worth explaining."
        description="Three substantial projects. Evidence of design, implementation, testing, and judgment."
      />
      <div className="project-grid">
        {all.map((p, i) => {
          const saved = s.get("project", p.id);
          const total = saved?.milestones.length || p.milestones.length;
          const done = saved?.milestones.filter((m) => m.done).length || 0;
          return (
            <Link
              className="card project-card"
              key={p.id}
              href={"/projects/" + p.id}
            >
              <div className={"project-art art-" + (i % 3)}>
                <FolderCode size={54} />
                <span>0{i + 1}</span>
              </div>
              <p className="eyebrow">
                {p.week ? "RECOMMENDED FROM WEEK " + p.week : "CUSTOM PROJECT"}
              </p>
              <h2>{p.title}</h2>
              <p>{p.description}</p>
              <Progress
                value={total ? (done / total) * 100 : 0}
                label={p.title}
              />
              <small>
                {done} / {total} milestones complete
              </small>
            </Link>
          );
        })}
      </div>
      <form
        className="card inline-form"
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const f = new FormData(form);
          if (
            await s.save("project", crypto.randomUUID(), {
              title: String(f.get("title")),
              milestones: [],
              notes: "",
              github: "",
              demo: "",
              architecture: "",
              retrospective: "",
            })
          )
            form.reset();
        }}
      >
        <label>
          Custom project name
          <input name="title" required maxLength={200} />
        </label>
        <Button>
          <Plus size={16} /> Add project
        </Button>
      </form>
    </>
  );
}
export function ProjectDetail({ id }: { id: string }) {
  const s = useAcademy();
  const template = projects.find((p) => p.id === id);
  const initial = s.get("project", id) || {
    title: template?.title || "Custom project",
    milestones:
      template?.milestones.map((title, i) => ({
        id: "milestone-" + i,
        title,
        done: false,
      })) || [],
    notes: "",
    github: "",
    demo: "",
    architecture: "",
    retrospective: "",
  };
  const [draft, setDraft] = useState<Payload["project"]>(initial);
  const [newMilestone, setNewMilestone] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(value: Payload["project"]) {
    setBusy(true);
    try {
      if (await s.save("project", id, value)) setDraft(value);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Heading
        kicker="PROJECT WORKSPACE"
        title={draft.title}
        description={
          template?.description ||
          "Define a user need, build a small solution, and collect evidence."
        }
      />
      <div className="two-column">
        <section className="card">
          <h2>Engineering milestones</h2>
          {draft.milestones.map((m) => (
            <label className="choice milestone-choice" key={m.id}>
              <input
                disabled={busy}
                type="checkbox"
                checked={m.done}
                onChange={() =>
                  void save({
                    ...draft,
                    milestones: draft.milestones.map((x) =>
                      x.id === m.id ? { ...x, done: !x.done } : x,
                    ),
                  })
                }
              />
              {m.title}
            </label>
          ))}
          <form
            className="inline-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save({
                ...draft,
                milestones: [
                  ...draft.milestones,
                  { id: crypto.randomUUID(), title: newMilestone, done: false },
                ],
              }).then(() => setNewMilestone(""));
            }}
          >
            <label>
              New milestone
              <input
                required
                value={newMilestone}
                maxLength={200}
                onChange={(e) => setNewMilestone(e.target.value)}
              />
            </label>
            <Button disabled={busy} variant="secondary">
              <Plus size={16} /> Add
            </Button>
          </form>
          <h3>Evaluation</h3>
          <p>
            Check correctness, test coverage, reproducibility, security
            boundaries, and honest limitations. A checked milestone records your
            judgment; it does not certify the implementation.
          </p>
          <Link href="/assessments">Open assessment rubric</Link>
        </section>
        <form
          className="card"
          onSubmit={(e) => {
            e.preventDefault();
            void save(draft);
          }}
        >
          <h2>Project evidence</h2>
          {(["github", "demo"] as const).map((k) => (
            <label key={k}>
              {k === "github" ? "GitHub repository" : "Live demo"}
              <input
                type="url"
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              />
            </label>
          ))}
          {(["architecture", "notes", "retrospective"] as const).map((k) => (
            <label key={k}>
              {k}
              <textarea
                rows={5}
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              />
            </label>
          ))}
          <Button disabled={busy}>Save project evidence</Button>
        </form>
      </div>
    </>
  );
}
export function Library() {
  const s = useAcademy();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [favorites, setFavorites] = useState(false);
  const filtered = resources.filter(
    (r) =>
      (category === "All" || r.category === category) &&
      (r.name + " " + r.description + " " + r.provider)
        .toLowerCase()
        .includes(query.toLowerCase()) &&
      (!favorites || s.get("resource", r.id)?.favorite),
  );
  return (
    <>
      <Heading
        kicker="THE LIBRARY"
        title="Good sources. Less searching."
        description="Use one primary resource for a topic. Enrichment is optional, not another completion target."
      />
      <div className="filter-bar">
        <label>
          Search
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="A topic, course or provider"
          />
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["All", ...new Set(resources.map((r) => r.category))].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label className="choice">
          <input
            type="checkbox"
            checked={favorites}
            onChange={(e) => setFavorites(e.target.checked)}
          />{" "}
          Favorites only
        </label>
      </div>
      <div className="resource-grid">
        {filtered.map((r) => {
          const saved = s.get("resource", r.id) || {
            favorite: false,
            status: "unvisited" as const,
          };
          return (
            <article className="card resource-card" key={r.id}>
              <div className="section-title">
                <BookOpen />
                <button
                  aria-label={
                    (saved.favorite ? "Unfavorite " : "Favorite ") + r.name
                  }
                  className="icon-button"
                  onClick={() =>
                    void s.save("resource", r.id, {
                      ...saved,
                      favorite: !saved.favorite,
                    })
                  }
                >
                  <Star
                    size={18}
                    fill={saved.favorite ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <p className="eyebrow">{r.provider} · FREE LEARNING MATERIAL</p>
              <h2>{r.name}</h2>
              <p>{r.description}</p>
              <div className="tags">
                <span>{r.category}</span>
                <span>{r.difficulty}</span>
                <span>{r.optional ? "Optional" : "Primary"}</span>
              </div>
              <small>Relevant to weeks {r.weeks.join("–")}</small>
              <div className="button-row">
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  onClick={() =>
                    void s.save("resource", r.id, {
                      ...saved,
                      status:
                        saved.status === "completed" ? "completed" : "visited",
                    })
                  }
                >
                  Open resource <ExternalLink size={14} />
                </a>
                <button
                  onClick={() =>
                    void s.save("resource", r.id, {
                      ...saved,
                      status:
                        saved.status === "completed" ? "visited" : "completed",
                    })
                  }
                >
                  {saved.status === "completed"
                    ? "Completed ✓"
                    : "Mark complete"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
      {!filtered.length && (
        <p className="empty">No resources match. Try a broader search.</p>
      )}
    </>
  );
}
const prompts = [
  "What did you complete this week?",
  "What did you understand well?",
  "What confused you?",
  "What distracted you most?",
  "What project or assignment are you proud of?",
  "What should change next week?",
];
export function Reviews() {
  const s = useAcademy();
  const [reviewNow] = useState(() => Date.now());
  const [week, setWeek] = useState(s.preferences.activeWeek);
  const initial = s.get("review", "week-" + week);
  const [answers, setAnswers] = useState(initial?.answers || Array(6).fill(""));
  const [goal, setGoal] = useState(initial?.goal || "");
  const a = analytics(
    s.records,
    s.preferences.timezone,
    localDate(new Date(), s.preferences.timezone),
    s.preferences.studyDays.filter((d) => d !== s.preferences.restDay),
  );
  return (
    <>
      <Heading
        kicker="WEEKLY REVIEW"
        title="Pause. Notice. Adjust."
        description="A private reflection on what worked, what didn’t, and the next small change."
      />
      <section className="card review-summary">
        <h2>Last seven days</h2>
        <p>
          {a.weekly} focused minutes.{" "}
          {
            s.records.filter(
              (r) =>
                r.kind === "lesson" &&
                (r.data as Payload["lesson"]).status === "completed" &&
                Date.parse(r.updated_at) >= reviewNow - 7 * 86400000,
            ).length
          }{" "}
          lessons marked complete. Your reflection can add the context the
          numbers cannot.
        </p>
      </section>
      <form
        className="card"
        onSubmit={async (e) => {
          e.preventDefault();
          await s.save("review", "week-" + week, { week, answers, goal });
        }}
      >
        <label>
          Academic week
          <select
            value={week}
            onChange={(e) => {
              const n = Number(e.target.value);
              setWeek(n);
              const v = s.get("review", "week-" + n);
              setAnswers(v?.answers || Array(6).fill(""));
              setGoal(v?.goal || "");
            }}
          >
            {Array.from({ length: 52 }, (_, i) => (
              <option value={i + 1} key={i}>
                Week {i + 1}
              </option>
            ))}
          </select>
        </label>
        <div className="two-column">
          {prompts.map((p, i) => (
            <label key={p}>
              {p}
              <textarea
                rows={4}
                value={answers[i]}
                onChange={(e) =>
                  setAnswers((old) =>
                    old.map((v, j) => (i === j ? e.target.value : v)),
                  )
                }
              />
            </label>
          ))}
        </div>
        <label>
          One concrete next-week goal
          <textarea
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            maxLength={200}
          />
        </label>
        <div className="button-row">
          <Button>Save reflection</Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!goal.trim()}
            onClick={async () => {
              await s.save("task", "review-goal-" + week, {
                title: goal,
                minutes: s.preferences.sessionMinutes,
                done: false,
                due: localDate(
                  new Date(Date.now() + 7 * 86400000),
                  s.preferences.timezone,
                ),
                notes: "Goal from week " + week + " review",
                priority: "normal",
              });
            }}
          >
            Plan next week’s goal
          </Button>
        </div>
      </form>
    </>
  );
}
