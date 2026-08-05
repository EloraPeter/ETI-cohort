-- ============================================================
-- Elora Tech Institute — Milestone 1: Payment + Enrollment
-- Adds: payment lifecycle on registrations, `payments` table,
-- `students` table, auto-generated references/IDs, storage bucket
-- for bank transfer proofs.
--
-- ⚠️ Run this in TWO SEPARATE executions in the Supabase SQL editor.
-- Postgres won't let a newly-added enum value be used in the same
-- transaction that adds it, and the SQL editor runs a pasted script
-- as one implicit transaction. Copy STEP 1 alone, run it, then copy
-- STEP 2 alone and run it.
-- ============================================================


-- ============================================================
-- STEP 1 — run this block first, on its own.
-- ============================================================

alter type registration_status add value if not exists 'pending_payment';
alter type registration_status add value if not exists 'payment_processing';
alter type registration_status add value if not exists 'paid';
alter type registration_status add value if not exists 'failed';
alter type registration_status add value if not exists 'cancelled';


-- ============================================================
-- STEP 2 — run this block after STEP 1 has committed.
-- ============================================================

-- ------------------------------------------------------------
-- Move existing registrations onto the new lifecycle. New rows
-- created via /api/register are already inserted with the new
-- values, so this only affects rows from before this migration.
-- ------------------------------------------------------------
update registrations set status = 'pending_payment' where status in ('pending', 'contacted', 'payment_pending');
update registrations set status = 'paid' where status = 'enrolled';
update registrations set status = 'cancelled' where status = 'declined';

alter table registrations
  alter column status set default 'pending_payment';

-- ------------------------------------------------------------
-- Payment method: replace the old 3-option enum with the 2-option
-- Paystack / Bank Transfer choice this milestone requires.
-- ------------------------------------------------------------
alter type payment_method_option rename to payment_method_option_old;
create type payment_method_option as enum ('Paystack', 'Bank Transfer');

alter table registrations
  alter column preferred_payment_method type payment_method_option
    using (case preferred_payment_method::text
             when 'Bank transfer' then 'Bank Transfer'
             else 'Paystack' -- fold any legacy "Card payment"/"Installments" rows onto Paystack
           end)::payment_method_option;

create type payment_status as enum (
  'pending_payment',   -- registered, no payment action taken yet
  'payment_processing', -- Paystack redirect in flight, or bank proof under review
  'paid',               -- verified — triggers enrollment automation
  'failed',             -- Paystack declined, or admin rejected bank proof
  'cancelled'            -- abandoned checkout / withdrawn
);

-- ------------------------------------------------------------
-- Payments — one row per registration's payment attempt.
-- ------------------------------------------------------------
create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references registrations (id) on delete cascade,
  cohort_id uuid not null references cohorts (id) on delete restrict,

  method payment_method_option not null,
  status payment_status not null default 'pending_payment',

  amount_expected numeric(12, 2) not null,
  amount_paid numeric(12, 2),
  currency text not null default 'NGN',

  -- Paystack
  paystack_reference text unique,
  paystack_transaction_id text,
  paystack_authorization_url text,

  -- Bank transfer
  bank_reference text unique, -- e.g. ETI-2026-00001
  proof_path text,             -- storage object path in the payment-proofs bucket
  proof_uploaded_at timestamptz,

  payment_date timestamptz,
  admin_notes text,
  reviewed_by text,
  reviewed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists payments_status_idx on payments (status);
create index if not exists payments_method_idx on payments (method);
create index if not exists payments_cohort_id_idx on payments (cohort_id);
create index if not exists payments_bank_reference_idx on payments (bank_reference);
create index if not exists payments_paystack_reference_idx on payments (paystack_reference);

drop trigger if exists payments_set_updated_at on payments;
create trigger payments_set_updated_at
  before update on payments
  for each row
  execute function set_updated_at();

-- Backfill a payment row for any registration created before this migration.
insert into payments (registration_id, cohort_id, method, status, amount_expected)
select r.id, r.cohort_id, r.preferred_payment_method,
       case r.status when 'paid' then 'paid'::payment_status else 'pending_payment'::payment_status end,
       c.fee_ngn
from registrations r
join cohorts c on c.id = r.cohort_id
where not exists (select 1 from payments p where p.registration_id = r.id);

alter table registrations drop column if exists preferred_payment_method;
drop type if exists payment_method_option_old;

-- ------------------------------------------------------------
-- Auto-generate the bank transfer reference (ETI-{year}-{00001})
-- on insert, only for bank transfer payments.
-- ------------------------------------------------------------
create sequence if not exists bank_reference_seq start 1;

create or replace function generate_bank_reference()
returns trigger as $$
begin
  if new.method = 'Bank Transfer' and new.bank_reference is null then
    new.bank_reference := 'ETI-' || extract(year from now())::text || '-' ||
      lpad(nextval('bank_reference_seq')::text, 5, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists payments_generate_bank_reference on payments;
create trigger payments_generate_bank_reference
  before insert on payments
  for each row
  execute function generate_bank_reference();

-- ------------------------------------------------------------
-- Students — created once a payment is verified/approved.
-- ------------------------------------------------------------
create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique, -- e.g. ETI-STU-2026-0001
  registration_id uuid not null unique references registrations (id) on delete restrict,
  cohort_id uuid not null references cohorts (id) on delete restrict,

  full_name text not null,
  email text not null,
  phone text not null,

  status text not null default 'active' check (status in ('active', 'inactive', 'withdrawn')),
  enrolled_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists students_cohort_id_idx on students (cohort_id);
create index if not exists students_status_idx on students (status);
create index if not exists students_email_idx on students (lower(email));

create sequence if not exists student_code_seq start 1;

create or replace function generate_student_code()
returns trigger as $$
begin
  if new.student_code is null then
    new.student_code := 'ETI-STU-' || extract(year from now())::text || '-' ||
      lpad(nextval('student_code_seq')::text, 4, '0');
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists students_generate_code on students;
create trigger students_generate_code
  before insert on students
  for each row
  execute function generate_student_code();

-- ------------------------------------------------------------
-- RLS — payments and students are written only by server routes
-- using the service role key, which bypasses RLS. No anon policies
-- are defined, so anon has zero access to either table by default.
-- ------------------------------------------------------------
alter table payments enable row level security;
alter table students enable row level security;

-- ------------------------------------------------------------
-- Storage bucket for bank-transfer payment proofs. Private —
-- uploads and signed-URL reads both go through the service role
-- on the server, so no public/anon storage policies are needed.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('payment-proofs', 'payment-proofs', false)
on conflict (id) do nothing;
