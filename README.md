# Elora Tech Institute — Web Development Cohort (September 2026)

Marketing site, registration flow, and admin dashboard for ETI's 7-week
Web Development Cohort.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS ·
Framer Motion · React Hook Form + Zod · Supabase (Postgres + Auth)

---

## 1. Folder structure

```
app/
  layout.tsx              Root layout — fonts, SEO metadata, JSON-LD
  page.tsx                Landing page (assembles all sections)
  globals.css              Tailwind + design-system utility classes
  sitemap.ts / robots.ts
  register/
    page.tsx               Registration form page
    success/page.tsx        Post-submit confirmation
  admin/
    page.tsx                Admin sign-in
    dashboard/page.tsx       Admin dashboard (client component)
  api/
    register/route.ts        Public registration endpoint (validated, inserts to Supabase)
    admin/
      registrations/route.ts  Search/filter/paginate/update registrations (admin-only)
      stats/route.ts           Aggregate stats (admin-only)

components/
  sections/                Landing page sections (Hero, Curriculum, Pricing, ...)
  admin/                   Admin dashboard pieces (StatCard)
  ui/                      Shared primitives (Container, SectionHeading, Field)
  RegistrationForm.tsx

lib/
  content.ts                All landing-page copy — edit here, not in JSX
  validations/registration.ts  Zod schema shared by client + API route
  supabase/
    client.ts               Browser client (anon key)
    admin.ts                 Server-only client (service role key)
    verifyAdmin.ts            Confirms a request's bearer token is an allow-listed admin
    types.ts                 Hand-written types mirroring supabase/schema.sql
  csv.ts                     CSV export used by the admin dashboard

supabase/
  schema.sql                 Full schema: tables, enums, indexes, RLS policies
```

---

## 2. Local setup

```bash
npm install
cp .env.example .env.local
# fill in the Supabase values (see step 3)
npm run dev
```

Visit `http://localhost:3000`.

---

## 3. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run `supabase/schema.sql` in full. It creates:
   - `cohorts` (seeded with the September 2026 cohort, ₦250,000, 7 weeks)
   - `registrations` (one row per applicant, with a `status` workflow:
     `pending → contacted → payment_pending → enrolled`, or `declined`)
   - RLS policies: the public `anon` role can only **insert** into
     `registrations` and **read** open cohorts. All reads/updates for
     the admin dashboard go through the service role key on the server.
3. Copy your project's **Project URL** and **anon public key** into
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy the **service_role key** (Settings → API) into
   `SUPABASE_SERVICE_ROLE_KEY`. Never expose this to the client —
   it's only read in `lib/supabase/admin.ts`, which is marked
   `server-only`.
5. Create at least one admin user: Authentication → Users → Add user
   (email + password). Add that email to `NEXT_PUBLIC_ADMIN_EMAILS`
   in `.env.local` (comma-separated for multiple admins).

### Regenerating types (optional)

If you have the Supabase CLI linked to your project:

```bash
supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
```

---

## 4. Updating content

- **Copy** (headlines, curriculum, FAQ, testimonials, pricing inclusions):
  edit `lib/content.ts`. Nothing else needs to change.
- **Cohort dates/fee**: update both `lib/content.ts` (display copy) and
  the `cohorts` row in Supabase (source of truth for registration).
- **Testimonials**: replace the placeholder quotes in `lib/content.ts`
  with real graduate quotes before launch.
- **OG image**: add `public/og-cover.jpg` (1200×630) for social previews.

---

## 5. Admin dashboard

- `/admin` — sign in with a Supabase Auth email/password account
  whose email is in `NEXT_PUBLIC_ADMIN_EMAILS`.
- `/admin/dashboard` — search, filter (status, laptop ownership),
  paginate, and export registrations to CSV. Status changes go
  through `PATCH /api/admin/registrations`.
- The dashboard is a client component; it's excluded from the
  sitemap and disallowed in `robots.ts`. For stronger protection in
  production, also add middleware-level auth or put `/admin` behind
  your hosting provider's access control.

---

## 6. Deploying to Vercel

1. Push this repo to GitHub.
2. Import it in [Vercel](https://vercel.com/new).
3. Add the environment variables from `.env.example` in the Vercel
   project settings (Production + Preview).
4. Deploy. Vercel auto-detects Next.js — no build config needed.
5. Point `eloratechinstitute.com` (or your chosen domain) at the
   Vercel project, and update `NEXT_PUBLIC_SITE_URL` accordingly.

---

## 7. Quality checklist before launch

- [ ] Real testimonials in `lib/content.ts`
- [ ] `public/og-cover.jpg` added
- [ ] Supabase schema applied + admin user created
- [ ] Env vars set in Vercel
- [ ] Test a full registration end-to-end, confirm the row appears in
      Supabase with `status = 'pending'`
- [ ] Test admin login, search, filter, CSV export
- [ ] Run `npm run typecheck` and `npm run lint`
