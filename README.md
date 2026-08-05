# Elora Tech Institute — Web Development Cohort (September 2026)

Marketing site, registration, payment (Paystack + bank transfer),
automated enrollment, and admin dashboard for ETI's 7-week Web
Development Cohort.

**Stack:** Next.js 15 (App Router) · TypeScript · Tailwind CSS ·
Framer Motion · React Hook Form + Zod · Supabase (Postgres, Auth,
Storage) · Paystack REST API · Resend (optional, for email)

**Brand:** built to the ETI Brand Identity System v1.0 — ETI Navy
(`#0F172A`), ETI Royal Blue (`#1D4ED8`), ETI Gold (`#F59E0B`), ETI Sky
Blue (`#38BDF8`), Sora/Inter/JetBrains Mono. Tokens live in
`tailwind.config.ts`.

---

## 1. The enrollment flow this app implements

```
Visitor sees cohort
  → Registers (chooses Paystack or Bank Transfer)
  → Paystack: redirected to Paystack checkout → verified server-side → paid
  → Bank Transfer: shown account details + reference → uploads proof → admin approves → paid
  → "paid" automatically: creates a student record + Student ID, emails
     confirmation, and shows/links to the onboarding page
```

Both payment methods converge on one function, `finalizeEnrollment()`
in `lib/payments/finalize.ts` — the single place that marks a payment
paid, creates the student, and sends the email. It's idempotent, so
retries (Paystack webhook + callback page both firing, or an admin
double-click) never create duplicate students.

---

## 2. Folder structure

```
app/
  layout.tsx                    Root layout — fonts, SEO metadata, JSON-LD
  page.tsx                      Landing page
  register/page.tsx              Registration form (name, details, payment method)
  pay/bank-transfer/[paymentId]/  Bank details + proof upload
  payments/callback/page.tsx      Paystack redirect target — verifies + finalizes
  onboarding/[studentId]/page.tsx Congrats page after payment is confirmed
  admin/
    page.tsx                      Admin sign-in
    dashboard/page.tsx            Registrations: search, filter, export
    payments/page.tsx             Payment Management: approve/reject/request correction
  api/
    register/route.ts                          Creates registration + payment row
    payments/paystack/initialize/route.ts        Starts a Paystack checkout
    payments/paystack/webhook/route.ts            Paystack → server (signature-verified)
    payments/bank-transfer/upload-proof/route.ts  Proof upload to Storage
    admin/
      registrations/route.ts     Search/filter/paginate/update registrations
      stats/route.ts              Dashboard aggregate counts
      payments/route.ts           List payments; approve/reject/request-correction
      payments/proof-url/route.ts Signed URL to view an uploaded proof

components/
  sections/                Landing page sections
  admin/                   StatCard
  ui/                      Container, SectionHeading, Field
  RegistrationForm.tsx
  PaymentMethodSelector.tsx
  BankTransferProofUpload.tsx

lib/
  content.ts                 Landing-page copy + bank account details
  validations/registration.ts Zod schema (shared client + server)
  payments/
    paystack.ts               Initialize/verify against the Paystack REST API
    finalize.ts                finalizeEnrollment() — the one automation path
  email/sendConfirmation.ts   Best-effort enrollment email via Resend
  supabase/
    client.ts / admin.ts       Browser (anon) vs server (service role) clients
    verifyAdmin.ts              Bearer-token → allow-listed admin email
    types.ts                    Hand-written types mirroring the schema

supabase/
  migrations/
    001_initial_schema.sql          Cohorts + registrations (original)
    002_payments_and_students.sql   Milestone 1: payments, students, storage bucket
```

---

## 3. Local setup

```bash
npm install
cp .env.example .env.local
# fill in Supabase, Paystack, and (optionally) Resend values below
npm run dev
```

---

## 4. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the migrations **in order**:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_payments_and_students.sql` — **run this
     one in the two separate steps marked in the file.** Postgres
     won't let a newly-added enum value be used in the same
     transaction that adds it, so STEP 1 and STEP 2 must be pasted
     and run as two separate queries.
3. Copy the **Project URL** and **anon public key** into
   `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Copy the **service_role key** into `SUPABASE_SERVICE_ROLE_KEY`.
   Never expose this to the client — every file that imports it is
   marked `server-only`.
5. Create at least one admin user (Authentication → Users → Add
   user), and add their email to `NEXT_PUBLIC_ADMIN_EMAILS`.
6. Confirm the `payment-proofs` Storage bucket exists (created by
   migration 002) — it's private; admins view files via short-lived
   signed URLs generated server-side.

---

## 5. Paystack setup

1. Get your **Secret Key** from the Paystack dashboard (Settings →
   API Keys & Webhooks). Use the test key while developing.
   Set it as `PAYSTACK_SECRET_KEY`.
2. In the same settings page, add a webhook pointing to:
   `https://<your-domain>/api/payments/paystack/webhook`
   The webhook is the source of truth for confirming payment — it
   verifies Paystack's HMAC-SHA512 signature before touching the
   database. The `/payments/callback` page (where Paystack redirects
   the browser) independently re-verifies the same transaction, so
   the flow works correctly even if the webhook is delayed or the
   student closes the tab before the redirect completes.
3. `NEXT_PUBLIC_SITE_URL` must be set correctly — it's used to build
   the Paystack `callback_url` and the links in confirmation emails.
4. Amounts are always read from `cohorts.fee_ngn` (₦250,000 by
   default) — the webhook and callback page both reject a payment
   whose verified amount doesn't match, marking it `failed` instead
   of enrolling the student.

---

## 6. Email (optional)

Enrollment confirmation emails send via [Resend](https://resend.com)
if `RESEND_API_KEY` is set. Without it, the email is logged to the
server console instead — nothing in the payment/enrollment flow
depends on email delivery succeeding.

---

## 7. Updating content

- **Copy** (headlines, curriculum, FAQ, testimonials, pricing,
  payment method descriptions): edit `lib/content.ts`.
- **Bank account details**: `bankDetails` in `lib/content.ts`.
- **Cohort dates/fee**: update the `cohorts` row in Supabase — the
  registration form, Paystack amount, and onboarding page all read
  from it, not from hardcoded values.
- **Testimonials**: replace the placeholders in `lib/content.ts`.
- **OG image**: add `public/og-cover.jpg` (1200×630).

---

## 8. Admin

- `/admin` — sign in with an allow-listed Supabase Auth account.
- `/admin/dashboard` — all applicants: search, filter by status,
  paginate, export to CSV.
- `/admin/payments` — Payment Management: search, filter by status/
  method, view uploaded proof (signed URL, opens in a new tab),
  and **Approve** / **Reject** / **Request correction**. Approving a
  bank transfer runs the exact same `finalizeEnrollment()` path a
  successful Paystack payment does — same student creation, same
  email.

---

## 9. Deploying to Vercel

1. Push to GitHub, import in [Vercel](https://vercel.com/new).
2. Add every variable from `.env.example` in Project Settings
   (Production + Preview).
3. Deploy. Point your domain at the project and update
   `NEXT_PUBLIC_SITE_URL` to match exactly (no trailing slash).
4. Add the production webhook URL in Paystack once the domain is live.

---

## 10. Quality checklist before launch

- [ ] Both migrations run, in order (002 in its two steps)
- [ ] Paystack secret key set, webhook registered and pointed at
      the deployed domain
- [ ] Test a full Paystack payment in test mode end-to-end —
      confirm the registration reaches `paid`, a student row and
      Student ID are created, and the onboarding page renders
- [ ] Test a full bank transfer: submit → see account details →
      upload proof → approve in `/admin/payments` → same checks as above
- [ ] Real testimonials in `lib/content.ts`, real bank details in
      `bankDetails`
- [ ] `public/og-cover.jpg` added
- [ ] `npm run typecheck` and `npm run build` both clean

---

## Roadmap (not built yet, by design)

This is Milestone 1 of a staged build. Explicitly out of scope until
their own milestones: WhatsApp automation, Google Calendar/Meet
automation, certificates, attendance, a learning dashboard,
assignments, SMS.
