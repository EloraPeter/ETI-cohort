# Elora Tech Institute — Cohort Platform

The full student lifecycle for ETI's cohort-based programs: marketing
site, registration and payment (Paystack + bank transfer), automated
enrollment, student onboarding, cohort/curriculum management, an
instructor teaching portal, and an admin operations portal.

**Stack:** Next.js 15 (App Router) · TypeScript (strict) · Tailwind
CSS · React Hook Form + Zod · Supabase (Postgres, Auth, Storage) ·
Paystack REST API · Resend (optional, for email)

**Brand:** built to the ETI Brand Identity System v1.0 — ETI Navy
(`#0F172A`), ETI Royal Blue (`#1D4ED8`), ETI Gold (`#F59E0B`), ETI Sky
Blue (`#38BDF8`), Sora/Inter/JetBrains Mono. Tokens live in
`tailwind.config.ts`.

---

## Where this sits in the roadmap

This repo is **Milestone 1 through Milestone 4C, plus the full
Admin + Instructor Portal Redesign (Phases A–F)**. That's the
complete cohort-operations side of ETI: get someone enrolled, get
them onboarded, get an instructor assigned and teaching, give admin
full operational control over all of it — with both authenticated
portals sharing one consistent, accessible, responsive design system.

**Certificates are a separate repository** (`eti-certificates`),
sharing this project's Supabase database but deployed independently
on its own subdomain. See "Relationship to the certificates repo"
near the end of this file — that relationship, and specifically
whether/how admin and instructor login should be shared across the
two subdomains, is still an open design question, not yet resolved.

---

## 1. The core flows this app implements

### Enrollment
```
Visitor sees cohort
  → Registers (chooses Paystack or Bank Transfer)
  → Paystack: redirected to checkout → verified server-side → paid
  → Bank Transfer: shown account details + reference → uploads proof
    → admin approves → paid
  → "paid" automatically: creates a student record + Student ID,
     emails confirmation, and links to account setup
```
Both payment methods converge on one function, `finalizeEnrollment()`
in `lib/payments/finalize.ts` — idempotent, so retries (webhook +
callback page both firing, or an admin double-click) never create
duplicate students.

### Student onboarding
```
Paid → account setup email (one-time token, 30-min expiry)
  → sets password + profile (preferred name, timezone, laptop)
  → student dashboard: onboarding checklist, cohort resources,
    class schedule, handbook
```
A student who abandons the flow before finishing payment can recover
via `/recovery` — a hashed, single-use, expiring token re-opens their
existing (unpaid) registration rather than creating a duplicate.

### Instructor teaching
```
Admin creates instructor → invitation email → account setup
  → profile (bio, photo upload, expertise, links)
  → assigned to one or more cohorts
  → instructor dashboard: today's class (or "starts soon" + upcoming
    classes if the cohort hasn't started yet), progress, carry-over
  → teaching guide per class: outcome, what to teach, demo, practice,
    questions, assignment, resources, a persisted checklist, notes
  → mark class complete
```
Instructors can **view and teach** from the master curriculum; they
cannot edit it. That boundary is enforced server-side on every
request via `isInstructorAssignedToCohort()`, not just hidden in the
UI.

### Admin operations
Full control surface: registrations, payments, cohorts, curriculum
(28-class structure, reorderable, resource attachments), instructors
(invite/deactivate/reassign), onboarding resources per cohort
(handbook, WhatsApp/Telegram links, class schedule), and individual
student detail.

---

## 2. Two authenticated portals, one shared design system

Both `/admin/*` and `/instructor/*` are route-group-based shells
(`app/admin/(portal)/...`, `app/instructor/(portal)/...` — the
parentheses are invisible in the actual URL) that:

- check the Supabase session **once**, in a shared client context
  (`AdminAuthContext` / `InstructorAuthContext`), not per-page
- expose `authedFetch()` (auth header + automatic 401→login redirect)
  and `signOut()` to every page underneath
- render the portal chrome (nav, header, loading state) once, not
  duplicated per page

They are deliberately **not** visually identical, because the jobs
are different:

- **Admin** — a persistent sidebar (desktop), collapsing to an
  icon-only rail with `aria-label`s (tablet, 768–1023px), collapsing
  to an accessible slide-out drawer with full focus-trap and
  Escape-to-close (mobile, <768px). Destinations: Registrations,
  Payments, Instructors, Cohorts, Curriculum, Resources.
- **Instructor** — deliberately lighter. No sidebar, no multi-item
  nav — just a calm top bar (brand mark + a profile menu with
  Profile/Sign out) and each page's own contextual back-link.
  "Teaching-first," not "admin with fewer permissions."

**Critically, none of this is the security boundary.** Every API
route independently re-verifies the caller server-side
(`verifyAdminRequest` / `verifyInstructorRequest` /
`verifyStudentRequest`, plus `isInstructorAssignedToCohort` for any
cohort-scoped instructor route) regardless of what the client-side
shell shows or hides. A bug in the shell can, at worst, show a
spinner too long or redirect to the wrong page — it cannot grant
access to anything the server wouldn't already allow.

### Shared components
`components/ui/Card.tsx` (the `as` prop lets it render as a `<div>`
or a semantic `<section>` where that matters), `Badge`, `Button`
(primary/secondary/danger), `ConfirmDialog` (replaces
`window.confirm()` for destructive actions — deactivating an
instructor, marking a class complete — with a real accessible,
async, focus-managed dialog), `PageHeader`, `PageSkeleton`,
`EmptyState`, `StatCard` (admin-only), `Container`, `Field`. All
except `PageHeader`/`Card`/`Container`/`EmptyState`/`Field`
(under `components/ui/`) and `StatCard`/`AdminShell` (under
`components/admin/`) live directly under `components/`.

---

## 3. Folder structure

```
app/
  layout.tsx                          Root layout — fonts, SEO, JSON-LD
  page.tsx                            Landing page
  register/, register/success/         Registration
  pay/bank-transfer/[paymentId]/       Bank details + proof upload
  payments/callback/                   Paystack redirect target
  account/setup/                       Student password + profile setup
  recovery/, recovery/[token]/         Abandoned-registration recovery
  onboarding/[studentId]/              Post-payment landing
  dashboard/                           Student dashboard

  admin/
    page.tsx                          Admin sign-in (outside the shell)
    (portal)/                         Everything below shares AdminShell
      layout.tsx
      dashboard/                      Registrations: search/filter/export
      payments/                       Approve/reject/request-correction
      cohorts/, cohorts/[id]/progress/
      curriculum/, curriculum/[id]/   28-class editor, reorder, resources
      instructors/                    Invite, assign to cohorts, deactivate
      resources/                      Per-cohort schedule + onboarding links
      students/[id]/

  instructor/
    login/                            Instructor sign-in (outside the shell)
    account/setup/                    Invitation → password + profile
    (portal)/                         Everything below shares InstructorShell
      layout.tsx
      dashboard/                      Today's class / upcoming / progress
      profile/                        Bio, photo upload, links
      cohorts/[cohortId]/             Roster
      cohorts/[cohortId]/classes/[classId]/   Teaching guide

  api/
    register/, payments/*, admin/*, instructor/*, student/*, recovery/*
      — every route independently verifies the caller; see §4.

components/
  admin/            AdminShell, AdminNav (legacy, unused — see note below), StatCard
  instructor/       InstructorShell
  ui/               Card, PageHeader, Container, EmptyState, Field, SectionHeading
  Badge.tsx, Button.tsx, ConfirmDialog.tsx, PageSkeleton.tsx
  RegistrationForm.tsx, PaymentMethodSelector.tsx, BankTransferProofUpload.tsx

lib/
  admin/            AdminAuthContext, navItems (nav list + icons, shared by
                     the sidebar and the tablet rail)
  instructors/      InstructorAuthContext, profileCompletion, cohortAccess
                     (isInstructorAssignedToCohort)
  curriculum/       scheduleDates (today's-class computation from
                     starts_on + weekly_schedule + timezone),
                     completionChecklist
  supabase/         client.ts / admin.ts (anon vs service-role),
                     verifyAdmin.ts, verifyInstructor.ts, verifyStudent.ts,
                     types.ts
  checklist/        managedResources (onboarding checklist item definitions)
  calendar/         formatSchedule
  recovery/         token.ts (hashed, single-use, 30-min expiry)
  payments/         paystack.ts, finalize.ts
  email/            sendConfirmation, sendInstructorInvitation, sendRecoveryLink
  validations/      registration.ts (Zod), fileSignature.ts (magic-byte checks)
  csv.ts

supabase/
  migrations/       001 through 014 — see §5
```

**Note on `components/admin/AdminNav.tsx`:** this predates the
portal-shell redesign and is no longer imported anywhere — every
admin page now gets its nav from `AdminShell`. Left in place
deliberately rather than deleted mid-redesign; safe to remove in a
future cleanup pass, not required before tagging.

---

## 4. Authorization model

Every API route falls into exactly one of these patterns — checked
directly, not assumed:

| Caller | Verified by | Additional check |
|---|---|---|
| Admin | `verifyAdminRequest()` — bearer token → Supabase user → email on `NEXT_PUBLIC_ADMIN_EMAILS` allow-list | — |
| Instructor | `verifyInstructorRequest()` — bearer token → instructor row → **`status === "active"`** | Cohort-scoped routes additionally call `isInstructorAssignedToCohort()` |
| Student | `verifyStudentRequest()` — bearer token → student row → **`status === "active"`** | — |

A deactivated instructor or a withdrawn/inactive student loses API
access immediately on their next request, not just their next login
— status is checked fresh every time, never cached client-side. A
deactivated instructor's next `authedFetch()` call gets redirected to
`/instructor/login?reason=inactive`, which shows an explanatory
message rather than silently bouncing them with no explanation.

**RLS convention:** every table is RLS-**enabled** in the same
migration that creates it. Almost none have policies — access goes
exclusively through the service-role client on the server, gated by
the table above. The two deliberate exceptions: `registrations`
(public insert, so the registration form can work before any
account exists) and `cohorts` (public read of open cohorts, so the
landing/registration pages can show live cohort info without
authentication).

**Storage:** two private buckets (`payment-proofs`,
`onboarding-resources`) — no `storage.objects` policies exist for
either, which is correct: with none, direct client access is
denied by default, so all access genuinely goes through
server-generated signed URLs (5-minute expiry). One public bucket
(`instructor-avatars`) — public read is fine for a profile photo;
uploads still go exclusively through the service-role client,
scoped to the uploading instructor's own id.

---

## 5. Local setup

```bash
npm install
cp .env.example .env.local
# fill in the values described below
npm run dev
```

## 6. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run every migration in `supabase/migrations/`
   **in order, 001 through 014.** One exception: `002_payments_and_students.sql`
   must be run in the two steps marked inside the file — Postgres
   won't let a newly-added enum value be used in the same transaction
   that adds it.
3. Copy the **Project URL** and **anon public key** into
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy the **service_role key** into `SUPABASE_SERVICE_ROLE_KEY`.
   Never expose this to the client — every file that imports it is
   marked `server-only`.
5. Create at least one admin user (Authentication → Users → Add
   user), and add their email to `NEXT_PUBLIC_ADMIN_EMAILS`.
6. Instructor accounts are created from `/admin/instructors`, not
   directly in Supabase — that flow creates the Auth user and the
   `instructors` row together and sends the invitation email.
7. Confirm all three storage buckets exist (created by migrations
   002, 006, and 014): `payment-proofs`, `onboarding-resources`
   (both private), `instructor-avatars` (public).

## 7. Paystack setup

1. Get your **Secret Key** from the Paystack dashboard (Settings →
   API Keys & Webhooks). Use the test key while developing. Set it
   as `PAYSTACK_SECRET_KEY`.
2. Add a webhook pointing to:
   `https://<your-domain>/api/payments/paystack/webhook` — this is
   the source of truth for confirming payment; it verifies
   Paystack's HMAC-SHA512 signature (timing-safe comparison) before
   touching the database. The `/payments/callback` page independently
   re-verifies the same transaction, so the flow works correctly
   even if the webhook is delayed.
3. `NEXT_PUBLIC_SITE_URL` must be set correctly — used to build the
   Paystack `callback_url` and every link in confirmation/invitation
   /recovery emails.
4. Amounts are always read from `cohorts.fee_ngn` — a verified amount
   that doesn't match marks the payment `failed` rather than
   enrolling the student.

## 8. Email (optional)

Enrollment confirmation, instructor invitation, and recovery-link
emails send via [Resend](https://resend.com) if `RESEND_API_KEY` is
set. Without it, each email is logged to the server console instead
— nothing in any flow depends on delivery succeeding.

---

## 9. Environment variables

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Comma-separated list of emails allowed into /admin
NEXT_PUBLIC_ADMIN_EMAILS=you@eloratechinstitute.com

NEXT_PUBLIC_SITE_URL=https://cohort.eloratechinstitute.com

PAYSTACK_SECRET_KEY=

RESEND_API_KEY=
RESEND_FROM_EMAIL="Elora Tech Institute <admissions@eloratechinstitute.com>"
# Optional — falls back to eloratechinstitute@gmail.com if unset
RESEND_REPLY_TO_EMAIL=
```

---

## 10. Updating content

- **Copy** (headlines, curriculum overview, FAQ, testimonials,
  pricing): `lib/content.ts`.
- **Cohort dates/fee/schedule**: the `cohorts` row in Supabase —
  registration, Paystack amount, onboarding, and the instructor
  "today's class" computation all read from it live, never from a
  hardcoded value.
- **The 28-class curriculum**: `/admin/curriculum` — reorder,
  edit outcome/teaching-points/demo/practice/questions/assignment,
  attach resources. Instructors can view and teach from it; they
  cannot edit it.
- **Onboarding resources per cohort** (handbook, WhatsApp/Telegram,
  weekly schedule): `/admin/resources`.

---

## 11. Deploying to Vercel

1. Push to GitHub, import in [Vercel](https://vercel.com/new).
2. Add every variable from §9 in Project Settings (Production +
   Preview).
3. Deploy. Point your domain at the project and update
   `NEXT_PUBLIC_SITE_URL` to match exactly (no trailing slash).
4. Add the production webhook URL in Paystack once the domain is
   live.

---

## 12. Relationship to the certificates repo

`eti-certificates` is a **separate repository, separate codebase,
separate deployment**, on its own subdomain — not a package, module,
or dependency of this repo, and this repo has no code path that
calls it or imports from it.

What it *does* share: the same Supabase project/database. Its
migrations (`001`, `002` in that repo) reference this repo's
`students`, `cohorts`, `instructors`, `instructor_cohorts`, and
`curricula` tables by foreign key, read-only — it never creates,
alters, or writes to any table owned by this repo.

**Authentication is currently separate per app.** An admin or
instructor signs in once here, and separately once on the
certificates subdomain — same Supabase Auth project, same
email/password, but two independent browser sessions, because
Supabase's browser client persists sessions in `localStorage`,
which is strictly origin-scoped. True single-sign-on across the two
subdomains (one login, both apps recognize it) is an open question,
not yet decided or built — see that repo's README for the
investigation into why, and what changing it would require.

---

## 13. Quality checklist before tagging

- [x] All 14 migrations run, in order (002 in its two steps)
- [x] `npm run typecheck`, `npm run lint`, `npm run build` all clean
      (build fails only in network-isolated sandboxes on the Google
      Fonts fetch — not a code issue; confirmed clean on Vercel)
- [ ] Paystack secret key set, webhook registered and pointed at the
      deployed domain
- [ ] Test a full Paystack payment in test mode end-to-end
- [ ] Test a full bank transfer: submit → account details → upload
      proof → approve → same checks as above
- [ ] Test the full instructor flow: admin invites → instructor sets
      up account + profile (including photo upload) → assigned to a
      cohort → sees today's class / upcoming classes correctly for
      both a pre-start and an active cohort → completes a class
- [ ] Test deactivating an instructor mid-session — confirm the
      explanatory message on next login attempt, not a silent bounce
- [ ] Real testimonials/content in `lib/content.ts`
- [ ] `public/og-cover.jpg` added

---

## Roadmap

**Milestone 5 — Certificates** is in active development in the
separate `eti-certificates` repository. The admin/instructor login
unification question (§12) is being planned before that work
integrates further with this repo's portals.

Explicitly out of scope for both repos until their own milestones:
WhatsApp automation, Google Calendar/Meet automation, attendance
tracking, a full learning-management dashboard, assignments/grading,
SMS.
