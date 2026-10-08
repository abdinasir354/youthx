# Somali YouthUp Foundation

Website and platform for Somali YouthUp Foundation, which supports Somali youth (ages 15–35) with training, scholarships, mentorship and jobs.

**Core rule:** every opportunity with limited seats reserves **75% of seats for women and 25% for men**. The database enforces this through `accept_application()`. The UI only displays seat counts.

Stack: Next.js 16 (App Router), Supabase (Postgres, Auth, Storage, RLS, Realtime), Tailwind CSS 4, next-intl (Somali default, English), zod + react-hook-form, Recharts, Vitest.

---

## 1. Setup

### Requirements
- Node.js 20+
- A Supabase project ([supabase.com](https://supabase.com)), or Docker for a local stack
- [Supabase CLI](https://supabase.com/docs/guides/cli) (optional, recommended)

### Environment variables
Copy `.env.example` to `.env.local` and fill in the values from **Supabase → Project Settings → API**:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable (anon) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret (service_role) key. Server only, never commit it. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` locally, your domain in production |

### Run the database migrations
Migrations live in `supabase/migrations/` (one per section: enums, profiles, organizations, opportunities, applications, quota, courses, mentorship, content/forms, notifications/audit, storage).

**Option A: CLI (recommended)**
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option B: dashboard**
Open **SQL Editor** and run each file in `supabase/migrations/` in filename order.

### Load the seed data (optional, for demos and testing)
`supabase/seed.sql` creates 1 admin, 1 staff, 2 partners with verified organizations, 2 approved mentors, 10 youth (7 women, 3 men), 8 opportunities, 3 courses with 4 lessons each, 3 news posts and 3 success stories.

- Local stack: it runs automatically on `supabase db reset`.
- Hosted project: paste it into the SQL Editor **once**.

All seeded accounts use the password `YouthUp2026!` (for example `admin@youthup.so` or `youth01@youthup.so`). **Delete these accounts, or change their passwords, before going live.**

### Auth settings
In **Authentication → URL Configuration**, set the Site URL to `NEXT_PUBLIC_SITE_URL` and add `<site-url>/auth/callback` to the redirect URLs. Magic links and password resets need this.

### Start the app
```bash
npm install
npm run dev
```
Open http://localhost:3000. It redirects to `/so`, and `/en` is the English version.

### Create the first admin
Sign up through the site, then run this in the SQL Editor:
```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'you@example.com');
```
Users can never change their own role. After the first admin exists, roles are managed from **/admin/users**.

---

## 2. Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (no database needed) |
| `npm run test:db` | Security and quota tests against a real Supabase database (see below) |
| `npm run check:messages` | Checks that every translation key used in code exists in `so.json` and `en.json` |

### Database tests
`tests/db/security.test.ts` signs in as real users and checks that:
- a youth cannot read another youth's profile, application or CV
- a youth cannot change their own role or set their application to `accepted`
- a partner sees only applicants of their own organization's opportunities
- a partner cannot publish an opportunity or change `female_ratio`
- with capacity 20, the 16th woman and the 6th man are waitlisted
- two admins accepting at the same moment cannot exceed capacity
- anonymous visitors can read published content but not drafts, donations or messages

The tests create temporary users and data, and delete them when they finish. **Run them against a local stack, not production:**
```bash
supabase start          # needs Docker; prints a local URL and keys
supabase db reset       # applies migrations + seed
# put the printed URL, anon key and service_role key into .env.test.local
npm run test:db
```
If `.env.test.local` exists it is used; otherwise the tests fall back to `.env.local`.

---

## 3. How it is organized

```
src/
  app/[locale]/
    (public)/     home, about, programs, opportunities, courses, news, stories, partners, donate, contact
    (auth)/       login, signup, forgot-password, reset-password
    dashboard/    youth: profile wizard, applications, courses, saved, mentorship, notifications
    partner/      organization, opportunities, applicant review
    mentor/       mentor profile, requests
    admin/        users, opportunities, applications, courses, posts, donations, messages,
                  partner requests, reports (CSV export), audit log
  app/actions/    Server Actions (every mutation, validated with zod)
  components/     ui, layout, forms, opportunities, dashboard, partner, admin
  lib/            supabase clients, auth helpers, validations, rate limiting, sanitizing
  messages/       so.json, en.json
  proxy.ts        session refresh, locale routing, route protection
supabase/
  migrations/     schema, RLS, functions, storage
  seed.sql
tests/            unit + database tests
```

### Roles
| Role | Can do |
|---|---|
| `youth` | Profile, CV, apply, courses, mentorship requests (default for every signup) |
| `mentor` | Accept or decline mentorship requests (after admin approval) |
| `partner` | Manage their organization's opportunities and review its applicants |
| `staff` | Manage content and review all applications |
| `admin` | Everything, including roles, quota ratios and seat rollover |

### Quota rules
- `female_seats = ceil(capacity × female_ratio)` and `male_seats = capacity − female_seats`. The default ratio is 0.75.
- An application only becomes `accepted` through `accept_application()`. That function locks the opportunity row and moves the applicant to `waitlisted` when seats for their gender are full.
- `gender_snapshot` is copied at submission, so later profile edits don't change quota counts.
- `capacity = null` means unlimited seats. Gender is still tracked in reports.
- Rollover (releasing unfilled seats to the other gender after the deadline) is admin-only, opt-in per opportunity, and written to the audit log.

---

## 4. Deploy (Vercel)
1. Import the repository in Vercel.
2. Add the four environment variables. Set `NEXT_PUBLIC_SITE_URL` to the production domain.
3. Add the production `/auth/callback` URL to Supabase Auth redirect URLs.
4. Deploy.
