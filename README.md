# LCC Palaro Management System

A React + Vite single-page application for Lipa City Colleges Palaro, backed by Supabase Auth, PostgreSQL, Storage, and Realtime. It includes a public event hub, an authenticated admin console, database schema/security policies, match and standings utilities, and Netlify deployment configuration.

> **Reference project note:** The implementation brief referenced an `LCC–ICpEP Chapter Portal` ZIP, but that ZIP was not included with the files available for this build. This is a separate Palaro application; it was not possible to inspect or compare the referenced portal.

## Requirements

- Node.js 20.19+ or 22.12+ recommended
- npm 10+
- A Supabase project for live authentication, database, image uploads, and Realtime

## 1. Install and run locally

```bash
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`. Edit `.env` and set:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
```

Use the project's public/publishable (or legacy anon) key only. **Never put a service-role key, database password, or other privileged secret in a `VITE_` variable.** Restart Vite after changing environment variables.

Without valid environment variables the site starts in a disconnected state and presents empty states or configuration messages rather than invented event data. Writes and login will not work until Supabase is configured.

## 2. Set up Supabase

1. Create a Supabase project and keep its URL and public key available.
2. Open **SQL Editor** and run `supabase/schema.sql` on a new project. The schema is an initial migration and should not be blindly rerun over an existing installation.
3. If desired, run `supabase/seed.sql` for a starter event-settings record. No fake teams, scores, athletes, or results are seeded.
4. In Supabase **Authentication → URL Configuration**, set the local development URL and the production Netlify URL as appropriate.
5. In **Authentication → Providers**, enable Email/password. Keep public sign-up disabled if your project does not need public accounts.
6. Create the first administrator account in **Authentication → Users → Add user**. Use an email address you control and set a strong password.
7. Copy that user's UUID. In the SQL Editor, grant the role to that exact UUID (replace the example value):

```sql
insert into public.profiles (id, email, display_name, role, is_active)
select id, email, 'Palaro Administrator', 'super_admin', true
from auth.users
where id = 'REPLACE-WITH-AUTH-USER-UUID'
on conflict (id) do update set role='super_admin', is_active=true;
```

Do **not** create an open administrator registration page. Only a trusted project owner should assign `admin` or `super_admin` roles. The application checks the profile role and database RLS independently.

8. Confirm the `palaro-media` Storage bucket and its policies were created by `schema.sql`. If your Supabase role cannot create storage policies or the bucket already exists with conflicting policies, review **Storage → Policies** and apply the equivalent admin-only insert/update/delete and public-read rules.
9. Check **Database → Publications** for the `supabase_realtime` publication. The schema adds `matches`, `score_events`, and `standings` to it.
10. Set the same URL and public key in your local `.env`, then restart the dev server.

## 3. Build and deploy to Netlify

```bash
npm run build
npm run preview
```

The production output is `dist/`. `netlify.toml` sets `npm run build`, publishes `dist`, and redirects SPA routes to `index.html`. To deploy:

1. Push the project to a GitHub repository.
2. In Netlify, choose **Add new site → Import an existing project** and select the repository.
3. Confirm build command `npm run build` and publish directory `dist`.
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in **Site configuration → Environment variables**.
5. Trigger a fresh deploy after saving variables.
6. Add the Netlify URL to Supabase Auth's allowed redirect URLs.
7. Test public routes, admin login, database reads/writes, Storage upload, and Realtime in the deployed site.

## What is implemented

- Responsive public homepage, sports, team, athlete, schedule, match detail, bracket/stage listing, standings, results, news, about, and not-found routes.
- Supabase email/password login, session restoration, logout, protected admin routes, and role check based on `profiles`.
- Admin dashboard with database-derived counts and upcoming fixtures.
- Admin resource interfaces for sports, teams, athletes, matches/schedules, tournament stages, standings, Best Player, announcements, event settings, and audit-log viewing.
- Supabase Storage image upload helper, image preview, file-type and 5 MB size validation.
- Supabase Realtime subscription helper and live match detail refresh behavior.
- Round-robin and single-elimination bracket preview utilities; round-robin schedule generation; standings calculation utility.
- SQL schema with RLS, storage policies, audit tables, score-event RPC, result-finalization/winner-advancement RPC, and a bracket-generation RPC.
- Netlify SPA routing and deployment instructions.

## Important implementation boundaries

This is a production-oriented foundation, but a live production rollout still needs integration and competition-specific verification. The current admin UI is a generic CRUD editor for several areas, not a fully specialized match clock or sport-by-sport scorekeeping station. The database RPC for bracket generation creates round-robin fixtures or a first-round single-elimination fixture set; full double-elimination and group-stage-to-knockout generation, complete multi-round dependency wiring, byes that auto-advance, venue/team conflict validation, calendar UI, and full sport-specific score validation need further implementation before claiming every requested feature is complete. Standings calculation is available as a service utility, but automatic persisted recalculation after each finalized match must be wired into a tested database transaction/job. Automatic Best Player scoring currently has a utility and manual-selection table, but sport-specific stat entry/weight configuration needs further UI work. Password recovery, public news scheduling jobs, audit triggers for every mutation, and browser-to-browser Realtime acceptance tests need to be completed against a live project.

No live Supabase project credentials were provided, so real authentication, RLS behavior, uploads, Realtime, and deployed operation cannot be truthfully reported as tested here. The schema should be reviewed and exercised in a staging Supabase project before it holds official competition data.

## Troubleshooting

- **`npm install` errors:** Use Node 20.19+ or 22.12+, remove `node_modules` only if necessary, and rerun `npm install`. Check that `package.json` is in the project root.
- **App says Supabase is not configured:** Ensure `.env` is at the root beside `package.json`, values are correct, and restart Vite.
- **Login succeeds but admin access is denied:** Check that the authenticated user's UUID has a matching active row in `public.profiles` with role `admin` or `super_admin`.
- **Queries return permission errors:** Inspect RLS policies and ensure the relevant public record is published. Never solve this by disabling RLS.
- **Storage uploads fail:** Check bucket name `palaro-media`, file size/type, admin profile role, and Storage object policies.
- **Realtime does not update:** Verify the table is in `supabase_realtime`, the public SELECT policy allows that row, and the browser is connected to the intended Supabase project.
- **Netlify deep links return 404:** Confirm `netlify.toml` and `public/_redirects` are included in the deployed root and that publish directory is `dist`.
- **Missing public content:** The site intentionally avoids sample results. Create and publish the relevant sports, teams, matches, announcements, and settings from the admin area.

## Security reminders

- The frontend anon/publishable key is designed to be public; RLS is the security boundary.
- Never ship a service-role key to the browser.
- Limit administrator role assignment to trusted project owners.
- Keep private athlete information in fields that are not exposed through public SELECT policies.
- Review SQL functions, policies, retention, and backup practices before production use.
