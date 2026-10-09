"use client";
import { useState } from "react";
import Link from "next/link";
import { Compass } from "lucide-react";
import { authenticate } from "@/app/auth/actions";
export function AuthForm({
  configured,
  update = false,
}: {
  configured: boolean;
  update?: boolean;
}) {
  const [mode, setMode] = useState(update ? "update" : "login");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="auth-page">
      <section className="auth-story">
        <Compass size={48} />
        <p className="eyebrow">ATLAS / PERSONAL AI ACADEMY</p>
        <h1>
          Build the skills.
          <br />
          <em>Prove the work.</em>
        </h1>
        <p>
          A clear path from your first line of Python to systems you can
          explain, test, and ship.
        </p>
        <div className="auth-stats">
          <div>
            <strong>52</strong>
            <span>weeks of direction</span>
          </div>
          <div>
            <strong>3</strong>
            <span>portfolio projects</span>
          </div>
          <div>
            <strong>25</strong>
            <span>minutes to begin</span>
          </div>
        </div>
      </section>
      <section className="card auth-card">
        <p className="eyebrow">YOUR NEXT CHAPTER</p>
        <h2>
          {mode === "signup"
            ? "Create your academy"
            : mode === "reset"
              ? "Reset your password"
              : mode === "update"
                ? "Choose a new password"
                : "Welcome back."}
        </h2>
        <p>Small sessions. Meaningful progress.</p>
        {!configured ? (
          <>
            <div className="alert">
              Account setup is not connected yet. Add your Supabase environment
              variables and run the database migration.
            </div>
            <Link className="btn btn-primary" href="/dashboard">
              Explore the academy
            </Link>
          </>
        ) : (
          <form
            action={async (fd) => {
              setBusy(true);
              try {
                const result = await authenticate(fd);
                if (result) setMessage(result.error || result.message || "");
              } finally {
                setBusy(false);
              }
            }}
          >
            <input type="hidden" name="mode" value={mode} />
            {mode !== "update" && (
              <label>
                Email
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                />
              </label>
            )}
            {mode !== "reset" && (
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  maxLength={128}
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  required
                />
              </label>
            )}
            <button className="btn btn-primary" disabled={busy}>
              {busy
                ? "Please wait…"
                : mode === "signup"
                  ? "Create account"
                  : mode === "reset"
                    ? "Send recovery link"
                    : mode === "update"
                      ? "Save password"
                      : "Sign in"}
            </button>
            <p role="status">{message}</p>
          </form>
        )}
        {!update && (
          <div className="auth-links">
            <button
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setMessage("");
              }}
            >
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "Create an account"}
            </button>
            <button
              onClick={() => {
                setMode("reset");
                setMessage("");
              }}
            >
              Forgot password?
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
