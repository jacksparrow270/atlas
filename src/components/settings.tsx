"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Download, Compass } from "lucide-react";
import { useAcademy } from "./store";
import { Heading } from "./learning";
import { Button } from "./ui/button";
import {
  preferencesSchema,
  backupSchema,
  type Preferences,
} from "@/lib/schema";
export function Settings({ onboarding = false }: { onboarding?: boolean }) {
  const s = useAcademy();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("");
  const [backup, setBackup] = useState<z.infer<typeof backupSchema> | null>(
    null,
  );
  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof preferencesSchema>, unknown, Preferences>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: s.preferences,
  });
  const values = useWatch({ control });
  const days = values.studyDays || [];
  const name = values.name;
  async function submit(p: Preferences) {
    if (await s.setPreferences({ ...p, onboarded: true })) {
      setMessage("Your plan is saved.");
      if (onboarding) router.push("/dashboard");
    }
  }
  const sections = [
    <section key="welcome" className="onboarding-welcome">
      <Compass size={50} />
      <h2>Your academy. Your pace.</h2>
      <p>
        A 52-week roadmap gives you direction. Short sessions make it possible
        to begin. Your academic progress follows completed work, not the
        calendar.
      </p>
      <p>
        Start with roughly 50 minutes a day. You can change the plan whenever
        your circumstances change.
      </p>
    </section>,
    <section key="profile">
      <h2>Tell us where you’re starting.</h2>
      <div className="two-column">
        <label>
          Display name
          <input {...register("name")} />
        </label>
        <label>
          Education
          <input {...register("education")} />
        </label>
        <label>
          Graduation year
          <input type="number" {...register("graduation")} />
        </label>
        <label>
          Career target
          <input {...register("target")} />
        </label>
        <label>
          Programming experience
          <select {...register("proficiency")}>
            <option value="beginner">Beginner</option>
            <option value="some experience">Some experience</option>
            <option value="intermediate">Intermediate</option>
          </select>
        </label>
        <label>
          Timezone
          <input {...register("timezone")} placeholder="Asia/Kolkata" />
        </label>
      </div>
    </section>,
    <section key="availability">
      <h2>Make a realistic plan.</h2>
      <div className="two-column">
        <label>
          Daily focus capacity (minutes)
          <input
            type="number"
            min={25}
            max={480}
            {...register("dailyMinutes")}
          />
        </label>
        <label>
          Session length (minutes)
          <input
            type="number"
            min={1}
            max={120}
            {...register("sessionMinutes")}
          />
        </label>
        <label>
          Usual start time
          <input type="time" {...register("startTime")} />
        </label>
        <label>
          Rest / review day
          <select {...register("restDay")}>
            {[
              "Sunday",
              "Monday",
              "Tuesday",
              "Wednesday",
              "Thursday",
              "Friday",
              "Saturday",
            ].map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>Available study days</legend>
        <div className="day-picker">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
            <label className="choice" key={d}>
              <input
                type="checkbox"
                checked={days.includes(i)}
                onChange={(e) =>
                  setValue(
                    "studyDays",
                    e.target.checked
                      ? [...days, i]
                      : days.filter((n) => n !== i),
                    { shouldValidate: true },
                  )
                }
              />
              {d}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="muted">
        Suggested capacity: week 1 · 50 min; week 2 · 75; weeks 3–4 · 100; month
        2 · 125; month 3 onward · 150. These are options, not quotas. Your saved
        target never increases automatically.
      </p>
    </section>,
    <section key="start">
      <h2>Choose your starting point.</h2>
      <div className="two-column">
        <label>
          Program start date
          <input type="date" {...register("startDate")} />
        </label>
        <label>
          Active academic week
          <input type="number" min={1} max={52} {...register("activeWeek")} />
        </label>
      </div>
      <p>
        Start with the 14-day restart track, then work through the academic
        roadmap. You may preview any future week.
      </p>
    </section>,
    <section key="plan">
      <h2>Your first steps, {String(name)}.</h2>
      <p>
        {String(values.dailyMinutes)} minutes per study day, in{" "}
        {String(values.sessionMinutes)}-minute sessions.
      </p>
      <ol>
        <li>Set up Python, VS Code and Git.</li>
        <li>Write and run hello.py.</li>
        <li>Practice strings, numbers and type conversion.</li>
      </ol>
      <p>
        Your first milestone is an independently built small Python application.
        The roadmap provides 52 academic weeks; your finish date depends on
        completed work and available time.
      </p>
    </section>,
  ];
  return (
    <>
      <Heading
        kicker={onboarding ? "WELCOME TO ATLAS" : "YOUR PREFERENCES"}
        title={
          onboarding ? "A plan that fits your life." : "Make the academy yours."
        }
        description="Your progress stays intact when you adjust your schedule."
      />
      <form className="card settings-form" onSubmit={handleSubmit(submit)}>
        {onboarding ? (
          <>
            <div className="steps">
              {sections.map((_, i) => (
                <button
                  type="button"
                  key={i}
                  className={step === i ? "active" : ""}
                  onClick={() => setStep(i)}
                  aria-label={"Setup step " + (i + 1)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            {sections[step]}
          </>
        ) : (
          sections.slice(1, 4)
        )}
        {Object.entries(errors).map(([key, error]) => (
          <p role="alert" className="error-text" key={key}>
            {key}: {error?.message}
          </p>
        ))}
        <div className="button-row">
          {onboarding && step > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setStep((n) => n - 1)}
            >
              Back
            </Button>
          )}
          {onboarding && step < 4 ? (
            <Button type="button" onClick={() => setStep((n) => n + 1)}>
              Continue
            </Button>
          ) : (
            <Button disabled={isSubmitting}>
              {onboarding ? "Begin my journey" : "Save preferences"}
            </Button>
          )}
        </div>
        <p role="status">{message}</p>
      </form>
      {!onboarding && (
        <>
          <section className="card">
            <h2>Appearance</h2>
            <div className="two-column">
              <label>
                Color theme
                <select
                  defaultValue={
                    typeof window !== "undefined"
                      ? localStorage.getItem("atlas-theme") || "dark"
                      : "dark"
                  }
                  onChange={(e) => {
                    const t = e.target.value;
                    localStorage.setItem("atlas-theme", t);
                    document.documentElement.dataset.theme =
                      t === "system"
                        ? matchMedia("(prefers-color-scheme: light)").matches
                          ? "light"
                          : "dark"
                        : t;
                  }}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </label>
              <label>
                Layout density
                <select
                  defaultValue={
                    typeof window !== "undefined"
                      ? localStorage.getItem("atlas-density") || "comfortable"
                      : "comfortable"
                  }
                  onChange={(e) => {
                    localStorage.setItem("atlas-density", e.target.value);
                    document.documentElement.dataset.density = e.target.value;
                  }}
                >
                  <option>comfortable</option>
                  <option>compact</option>
                </select>
              </label>
            </div>
            <label className="choice">
              <input
                type="checkbox"
                defaultChecked={
                  typeof window !== "undefined" &&
                  localStorage.getItem("atlas-motion") === "reduced"
                }
                onChange={(e) => {
                  localStorage.setItem(
                    "atlas-motion",
                    e.target.checked ? "reduced" : "system",
                  );
                  document.documentElement.dataset.motion = e.target.checked
                    ? "reduced"
                    : "system";
                }}
              />
              Reduce motion
            </label>
            <p className="muted">
              Appearance is specific to this device. The academy also honors
              your operating system’s reduced-motion setting.
            </p>
          </section>
          <section className="card">
            <h2>Your data</h2>
            <p>
              Export a versioned backup. Imports merge records by ID and
              overwrite matching records only after your confirmation.
            </p>
            <Button
              variant="secondary"
              onClick={() => {
                const data = {
                  version: 1,
                  preferences: s.preferences,
                  records: s.records.map(({ id, kind, data }) => ({
                    id,
                    kind,
                    data,
                  })),
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], {
                  type: "application/json",
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "atlas-backup-v1.json";
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download size={16} />
              Export my progress
            </Button>
            <label>
              Validate a backup
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (e) => {
                  setBackup(null);
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5000000) {
                    setMessage("Backup is too large (5 MB maximum).");
                    return;
                  }
                  try {
                    const parsed = backupSchema.safeParse(
                      JSON.parse(await file.text()),
                    );
                    if (!parsed.success) {
                      setMessage("Backup validation failed. No data changed.");
                      return;
                    }
                    setBackup(parsed.data);
                    setMessage(
                      "Valid backup: " +
                        parsed.data.records.length +
                        " records.",
                    );
                  } catch {
                    setMessage("Could not read this JSON backup.");
                  }
                }}
              />
            </label>
            {backup && (
              <div className="alert">
                <p>
                  Import {backup.records.length} records and replace your
                  preferences? Matching record IDs will be overwritten. Export
                  your current data first.
                </p>
                <Button
                  onClick={async () => {
                    if (
                      confirm(
                        "Merge this backup into your account and overwrite matching records?",
                      )
                    ) {
                      if (await s.importBackup(backup)) {
                        setBackup(null);
                        setMessage("Backup imported.");
                      }
                    }
                  }}
                >
                  Confirm import
                </Button>
              </div>
            )}
            <p role="status">{message}</p>
            <h3>Clear selected progress</h3>
            <p className="muted">
              Use lesson “Reopen”, or delete individual tasks and focus sessions
              from their pages. Each deletion asks for confirmation.
            </p>
            <h3>Account</h3>
            <p>
              Use the sign-out icon above to end this browser session. Password
              recovery is available on the sign-in page. To delete the account
              and all associated data, delete the user in your Supabase
              Authentication dashboard; database records cascade automatically.
            </p>
          </section>
        </>
      )}
    </>
  );
}
