# ATLAS — Your Personal AI Academy

Build the skills. Prove the work.

ATLAS is a Next.js App Router learning workspace for a beginning AI engineering student. It combines a 52-week curriculum, a separately paced 14-day restart track, short focus sessions, engineering evidence, and career preparation.

## Start locally

Requirements: Node.js 22 LTS or newer (development verified with Node 24), npm, and optionally a Supabase project.

```bash
npm install
npm run dev
```

Open http://localhost:3000. Without Supabase variables, ATLAS opens a clearly labeled exploration mode. This mode is in-memory: it does not save progress across reloads. Only temporary timer state and appearance preferences use localStorage. Never treat preview as your permanent learning account.

For persistent use, copy `.env.example` to `.env.local`, configure Supabase, apply the migration, and restart the server. See [DEPLOYMENT.md](DEPLOYMENT.md).

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

A publishable key is designed to be public. Do not use a secret or service-role key. The site URL sets email confirmation and recovery redirects.

## Implemented workflows

- Email/password signup, login, recovery and password update using Supabase SSR cookies; protected application layout and authenticated mutation API.
- Five-step onboarding and editable profile, timezone, start date, availability, rest day, active academic week, and focus capacity.
- All 52 canonical weeks, 312 distinct daily exercises, original teaching paragraphs for weeks 1–12, and 14 more detailed restart days. Day 7 of the restart track is optional rest.
- Lesson evidence, repository links, explicit completion criteria and four progress states.
- Deterministic planner and seven-day schedule, capacity bounds, unfinished prerequisites, custom tasks, priority, due dates, editing and deletion.
- Timestamp-based timer with pause/resume/reset, explicit finish, 5/15-minute breaks, recovery after reload, cross-tab state notifications, Web Locks where supported, and idempotent session records.
- Actual-data dashboard, focus chart, 84-day heatmap, subject distribution, session history and weekly consistency.
- Five assessments with server-recomputed multiple-choice scores, manual rubric scores, weighted provisional/final report cards and submission history.
- Three portfolio projects, custom projects, editable milestones, repository/demo links, architecture notes and retrospectives.
- 19 centrally managed free learning resources with search, filters, favorites, visited/completed states.
- Weekly reflections with an idempotent next-week goal task.
- Career applications with status, next action, follow-up date, interview practice and college administration checklist.
- Dark/light/system themes, mobile navigation, keyboard search, focus indicators, reduced-motion handling, JSON export and validated confirmed merge import.

## Architecture

Next.js Server Components enforce account access before rendering the shared academy shell. Client components handle interactive learning views. The central provider reads and writes a same-origin route handler. Every request derives ownership from a verified Supabase user, validates mutations with Zod, and uses the user's session for database queries. RLS independently enforces ownership.

The database uses two owner-related tables: `profiles` and `study_records`. The latter stores individually addressable, discriminated records with a composite primary key `(user_id, kind, id)`. This is an intentional compact alternative to seventeen near-identical progress tables. It avoids whole-workspace overwrites while allowing type-specific validation in the application. Curriculum definitions remain version-controlled with stable IDs. This is not a fully normalized analytics warehouse.

There is no paid AI dependency and no code execution or automated grading of free-form code. Practical scores are explicitly self-assessed.

```text
src/
  app/
    (academy)/          protected application routes
    api/state/          authenticated reads, mutations, imports
    auth/               auth actions, callback, password update
  components/
    learning.tsx        dashboard, roadmap, weekly/daily lessons
    productivity.tsx    planner, schedule, focus, analytics
    academic.tsx        assessments, projects, library, reviews
    career.tsx          applications and interview preparation
    settings.tsx        onboarding, preferences, backup controls
    store.tsx           client state and persistence boundary
    shell.tsx           responsive navigation and search
    ui/button.tsx       reusable Radix Slot / shadcn-style button
  data/                 stable curriculum and teaching content
  lib/
    content.ts          typed curriculum, resources and rubrics
    engine.ts           pure scheduling, grading, time, analytics
    schema.ts           mutation and backup validation
    supabase/server.ts  SSR database client
  proxy.ts              Supabase session refresh
supabase/migrations/    schema, constraints, RLS, atomic import
tests/                 logic, API boundary and browser tests
scripts/               screenshots, URL validation, live RLS check
artifacts/             screenshots and link-check evidence
```

## Verification commands

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

Browser tests automatically start an isolated exploration preview on port 3001 with Supabase variables cleared and a separate `.next-test` build directory. Your configured app on port 3000 and `.env.local` remain untouched. API tests mock the verified session/database boundary; they do not prove deployed database policy behavior.

The test suite also runs the real migration in embedded PostgreSQL using the development-only PGlite dependency. It verifies RLS, grants, owner persistence, unique keys, transactional import/rollback and deletion cascades using a local auth shim. No database server, Docker or credentials are needed for these tests. Run the optional live test below as well before using a deployed Supabase project.

Optional live isolation test:

```bash
node --env-file=.env.local scripts/verify-rls.mjs
```

Use two dedicated confirmed accounts via `ATLAS_TEST_EMAIL_A`, `ATLAS_TEST_PASSWORD_A`, `ATLAS_TEST_EMAIL_B`, `ATLAS_TEST_PASSWORD_B`. Store these only in an ignored local environment file. The script creates a uniquely identified interview record and removes its own test data.

## Content and data semantics

The requested stage boundaries are preserved exactly: weeks 1–12, 13–24, 25–36, 37–52. The restart track is separate because its accelerated topic order differs from the canonical first four weeks. A rest date does not complete unfinished work. Academic week changes only when the learner changes it.

Planner blocks are bounded study recommendations, not claims that an entire 50-minute lesson takes 25 minutes. Split a lesson across sessions as needed and complete it only after its criteria are met. Custom tasks remain in the queue if they cannot fit; edit their estimated duration or split them explicitly.

The timer measures elapsed clock time, including laptop sleep. Pause before stepping away; on return, explicitly confirm logging. It cannot detect actual human attention. Breaks never contribute focus minutes. Existing focus IDs cannot be inserted twice.

Weekly consistency means planned days in the last seven calendar days with at least one minute of saved focus. Theme settings are device-local; learning preferences and records are account-persisted. Simultaneous edits to the same record use last-write-wins; separate records do not overwrite one another.

## Scope and limits

See [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md) for verification results and remaining work. Weeks 13–52 provide unique objectives/exercises and primary references, not full textbook-length instruction. Major exams have short concept quizzes plus substantive practical deliverables; their question banks can be expanded.

No push infrastructure, offline synchronization, accreditation, guaranteed employment, browser Python execution, or AI tutor is claimed. No automatic Vercel deployment or live Supabase verification occurred without account credentials.
