# Youthup Foundation

*Empowering Somali Youth. Building a Better Future.*

Website, CMS and youth platform for Youthup Foundation: programs, opportunities, events, mentorship, projects, resources, stories, volunteer and mentor applications. Everything on the public site is managed from the admin CMS.

**Core rule:** every opportunity with limited seats reserves **75% of seats for women and 25% for men**. The database enforces this through `accept_application()`. The UI only displays seat counts.

Stack: Next.js 16 (App Router, Cache Components), Supabase (Postgres, Auth, Storage, RLS, Realtime), Tailwind CSS 4, next-intl (English now; Somali translations kept for later), zod + react-hook-form, dnd-kit (drag and drop), Recharts, Vitest.

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
| `NEXT_PUBLIC_SITE_URL` | Public address, `https://www.youthupfoundation.org` (the default if unset) |
| `CRON_SECRET` | Any long random string. Vercel sends it to the daily job that closes expired opportunities. |

The newer Supabase names `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` are accepted too.

### Run the database migrations
Migrations live in `supabase/migrations/` (one per section: enums, profiles, organizations, opportunities, applications, quota, courses, mentorship, content/forms, notifications/audit, storage).

**Option A: CLI (recommended)**
```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

**Option B: dashboard**
Run `python scripts/bundle-migrations.py`, open the generated `supabase/setup-all.sql`, paste it into **SQL Editor** and click **Run** once.

The migrations also create the starting content: site settings, navigation, the Home, About, Programs, Opportunities, Events, Get Involved, Contact, Privacy and Terms pages, and the eight programs. It is real content only; there are no invented people, events, statistics or partners.

### Seed data
`supabase/seed.sql` is intentionally empty: the real starting content lives in the migrations.

### Auth settings
In **Authentication → URL Configuration**, set the Site URL to `NEXT_PUBLIC_SITE_URL` and add `<site-url>/auth/callback` to the redirect URLs. Magic links and password resets need this.

### Start the app
```bash
npm install
npm run dev
```
Open http://localhost:3000. It redirects to `/so`, and `/en` is the English version.

### Admin access
- The admin sign-in page is **hidden** at `/xbh-ctrl-cakel/auth` (see `ADMIN_LOGIN_PATH` in `src/lib/permissions.ts`). It isn't linked anywhere, is excluded from search engines and the sitemap, and `/admin` shows a normal 404 to anyone who isn't an admin. The URL is not the protection; Supabase Auth, the admin role check and RLS are.
- The account `youthxfoundation@gmail.com` becomes **Super Admin** automatically when the migrations run (if it exists in Supabase Auth by then). To make another account a super admin, run in the SQL Editor:
  ```sql
  insert into public.admin_users (user_id, role)
  select id, 'super_admin' from auth.users where email = 'you@example.com';
  ```
- After that, Super Admins grant and remove admin access on **Admin → Users**. Nobody can change their own access, and the last Super Admin can't be removed.

| Admin role | Can manage |
|---|---|
| Super Admin | Everything: users and roles, site settings, audit log |
| Content Admin | Pages, programs, opportunities, events, projects, resources, stories, media, navigation, SEO, inbox |
| Program Manager | Programs, events, opportunities, all applications (youth, volunteer, mentor), inbox |
| Editor | Edits content and saves drafts, but cannot publish, and has no access to settings, users or applications |

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

`tests/db/cms.test.ts` checks the CMS rules: anonymous users can't modify content or read applications, messages, subscribers, admin users or the audit log; editors can draft but not publish and can't reach super-admin features; nobody can promote themselves; and changes are written to the audit log.

The tests create temporary users and data, and delete them when they finish. **Run them against a local stack, not production:**
```bash
supabase start          # needs Docker; prints a local URL and keys
supabase db reset       # applies migrations + seed
# put the printed URL, anon key and service_role key into .env.test.local
npm run test:db
```
If `.env.test.local` exists it is used; otherwise the tests fall back to `.env.local`.

---

## 3. The CMS

- **Pages:** every page is a list of sections (hero, rich text, image + text, cards, program/opportunity/event/story/project/resource grids, call to action, FAQ, statistics, gallery, video, partner logos). Drag to reorder, show or hide, duplicate, delete, and preview before publishing.
- **Content:** programs, opportunities, events (with speakers), projects, resources, stories, FAQs, partners and categories, each with a draft → published → archived workflow, featured flags, SEO fields and drag-and-drop ordering where it applies. Stories can only be published once consent is recorded.
- **Media library:** drag and drop images and documents anywhere; files are checked for type, extension, size and real file signature (no SVG or executables). Add alt text, search, filter and reuse files in any image field.
- **Inbox:** volunteer and mentor applications (with private CV downloads through 60-second links), contact messages, partner and sponsor requests, donations and newsletter subscribers.
- **Site:** navigation menus (drag and drop), SEO per page, and site settings (contact details, social links, header button, defaults).
- **Statistics** only ever show live counts from the database, or numbers an admin enters from their own records.

## 4. How it is organized

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

### Platform roles
Every account has one platform role. Back-office access is separate (see *Admin access* above).

| Role | Can do |
|---|---|
| `youth` | Profile, CV, apply, courses, mentorship requests (default for every signup) |
| `mentor` | Accept or decline mentorship requests (after approval) |
| `partner` | Manage their organization's opportunities and review its applicants (submissions go to admin review before publishing) |

### Quota rules
- `female_seats = ceil(capacity × female_ratio)` and `male_seats = capacity − female_seats`. The default ratio is 0.75.
- An application only becomes `accepted` through `accept_application()`. That function locks the opportunity row and moves the applicant to `waitlisted` when seats for their gender are full.
- `gender_snapshot` is copied at submission, so later profile edits don't change quota counts.
- `capacity = null` means unlimited seats. Gender is still tracked in reports.
- Rollover (releasing unfilled seats to the other gender after the deadline) is admin-only, opt-in per opportunity, and written to the audit log.

---

## 5. Deploy (Vercel)
1. Import the repository in Vercel.
2. Add the environment variables, including `CRON_SECRET`. `vercel.json` schedules the daily job that closes expired opportunities. Set `NEXT_PUBLIC_SITE_URL` to the production domain.
3. Add the production `/auth/callback` URL to Supabase Auth redirect URLs.
4. Deploy.
