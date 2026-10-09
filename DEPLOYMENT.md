# Deploy ATLAS on Vercel with Supabase

## 1. Create the database and authentication project

1. Sign in at https://supabase.com/dashboard and create a project.
2. Choose a region near the intended user. Save the database password privately.
3. In the project's SQL Editor, run the complete contents of `supabase/migrations/001_academy.sql` once.
4. Confirm `profiles` and `study_records` exist and Row Level Security is enabled on both.
5. Confirm both tables have owner policies with `auth.uid() = user_id` in USING and WITH CHECK.
6. In Connect / API keys, copy the Project URL and publishable key. Do not copy the secret/service-role key into this app.
7. Enable email/password authentication. Keep email confirmation enabled for ordinary use. Configure SMTP for reliable production email delivery; Supabase's default mail service has development-oriented restrictions and limits.

Alternatively, use the Supabase CLI with a linked project and `supabase db push`. Review the migration before applying it to a project containing existing data. The initial migration assumes these table/function names do not already exist.

## 2. Configure local development

Copy `.env.example` to `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

In Supabase Authentication → URL Configuration:

- Set Site URL to your production URL once known.
- Add `http://localhost:3000/auth/callback`.
- Add `http://localhost:3000/auth/callback?next=/auth/update` for recovery if your redirect allowlist requires the full URL.
- Add the corresponding exact HTTPS production callback and recovery URLs after deployment.
- Add preview deployment URLs only if intentionally testing auth there. Do not use an unnecessarily broad production wildcard.

The default confirmation email template must preserve Supabase's confirmation URL flow, which eventually returns a PKCE code to `/auth/callback`. The callback exchanges that code for a cookie-backed session. Test confirmation and recovery in the browser where the flow was initiated. If custom email templates use token hashes instead, restore the default confirmation URL template or implement and test a token-hash callback explicitly.

Run `npm install` and `npm run dev`. Restart after changing environment variables.

## 3. Create a GitHub repository

1. Create an empty private repository in your GitHub account.
2. Open a terminal in the ATLAS project folder.
3. Initialize and review the repository:

```bash
git init
git add .
git status
git commit -m "Build ATLAS personal AI academy"
git branch -M main
git remote add origin https://github.com/YOUR_ACCOUNT/atlas.git
git push -u origin main
```

Before committing, inspect the staged file list. `.env.local`, dependencies and build output are ignored. Never stage account credentials. The included package lockfile should be committed.

## 4. Import into Vercel

1. Sign in at https://vercel.com and choose Add New → Project.
2. Import your GitHub repository and choose the Next.js framework preset.
3. Set the root directory to the directory containing ATLAS's `package.json`.
4. Use the default Next.js build/output configuration. Build command: `npm run build`. Install command: `npm ci` (or the default npm install).
5. Choose a currently supported Node LTS version compatible with Next.js 16; Node 24 was used for local validation.
6. Add all three environment variables in Vercel Project Settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` set to the actual HTTPS deployment domain.
7. Deploy. If the final domain was not known at first deployment, update `NEXT_PUBLIC_SITE_URL` and redeploy.
8. Update the Supabase Site URL and exact redirect allowlist to match.

Public-prefixed variables are baked into the build. A saved environment-variable change alone does not update an existing deployment: redeploy from Vercel after any change.

## 5. Verify the actual deployment

Do not call the deployment production-ready until these checks succeed:

1. Open a private browser window and visit `/dashboard`: it should redirect to `/auth` when Supabase is configured.
2. Sign up using an address you control, confirm the email, and sign in.
3. Complete onboarding; reload and verify it is not requested again.
4. Open restart day 1, save notes, meet the criteria and complete the lesson.
5. Reload and verify the saved evidence and status.
6. Start a short focus session; pause, reload, resume and save it.
7. Confirm the analytics increase once only. Test a second open tab.
8. Add a custom task, a project milestone and a career application.
9. Sign out and back in; verify all records remain.
10. Sign in on a phone and verify the same records and preferences appear.
11. Test password recovery end-to-end, including an expired link.
12. Run `scripts/verify-rls.mjs` with two dedicated accounts. It checks private reads, cross-user writes and anonymous access.
13. Check Supabase logs and Vercel logs for errors, without logging private notes or auth tokens.
14. Export a backup, validate it, confirm a merge import, then verify the records.

No live credentials were available during the initial build, so these checks are not represented as passed.

## 6. Database changes and backups

- Add a new numbered migration for every schema change. Never rewrite a migration already applied to a live database.
- Test the migration against a non-production project, export/backup important data, then apply it before deploying code that requires it.
- Keep stable curriculum IDs when editing content. Renaming IDs requires an explicit progress migration.
- Backup format v1 contains preferences and per-kind records. Import is a transactional merge, not an account replacement. It cannot set user ownership.
- A profile and its progress records are deleted automatically when that user is deleted from Supabase Authentication.
- The initial app caps a workspace at 10,000 loaded records and fails explicitly rather than silently discarding history. Add server-side paginated analytics before supporting much larger accounts.

## Troubleshooting

- **Exploration-mode banner:** required Supabase variables were absent at build/runtime. Configure them and redeploy.
- **Cannot load workspace:** migration missing, wrong project URL, invalid key, or table permissions. Verify setup and retry.
- **Email link fails:** verify Site URL, allowlisted callbacks, SMTP delivery, and that the link is opened in the initiating browser.
- **Sign-in succeeds but data does not save:** inspect RLS ownership and the authenticated user's session; do not disable RLS as a workaround.
- **Old environment values:** redeploy after updating variables.
- **Windows EPERM when testing:** run from an accessible workspace outside protected Documents folders and allow the compiler/test runner in your local security setup.

## Official implementation references

- Next.js installation: https://nextjs.org/docs/app/getting-started/installation
- Supabase SSR clients and session refresh: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Vercel Next.js deployment: https://vercel.com/docs/frameworks/full-stack/nextjs
