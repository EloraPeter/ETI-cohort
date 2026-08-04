-- ============================================================
-- Elora Tech Institute — Web Development Cohort
-- Registration schema
-- Run in Supabase SQL editor, or via `supabase db push`.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Enum types keep the same options as lib/validations/registration.ts.
-- If you change the options there, mirror the change here.
-- ------------------------------------------------------------
create type gender_option as enum ('Female', 'Male', 'Prefer not to say');

create type education_option as enum (
  'Secondary school',
  'Undergraduate',
  'Bachelor''s degree',
  'Master''s degree',
  'Other'
);

create type experience_option as enum (
  'None',
  'Beginner (self-taught basics)',
  'Some coursework',
  'Intermediate+'
);

create type hear_about_option as enum (
  'Instagram',
  'TikTok',
  'X (Twitter)',
  'LinkedIn',
  'Friend or referral',
  'WhatsApp',
  'Google search',
  'Other'
);

create type payment_method_option as enum (
  'Bank transfer',
  'Card payment',
  'Installments (if available)'
);

create type registration_status as enum (
  'pending',        -- submitted, awaiting admissions contact
  'contacted',       -- admissions team has reached out
  'payment_pending', -- payment instructions sent
  'enrolled',        -- payment confirmed, seat secured
  'declined'         -- withdrawn or not proceeding
);

-- ------------------------------------------------------------
-- Cohorts: lets the same schema serve future cohorts, not just
-- September 2026, without a migration.
-- ------------------------------------------------------------
create table if not exists cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,                  -- e.g. "Web Development Cohort"
  starts_on date not null,
  duration_weeks integer not null default 7,
  fee_ngn numeric(12, 2) not null,
  slots_total integer,
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

insert into cohorts (name, starts_on, duration_weeks, fee_ngn, slots_total, is_open)
values ('Web Development Cohort', '2026-09-01', 7, 250000, 60, true)
on conflict do nothing;

-- ------------------------------------------------------------
-- Registrations
-- ------------------------------------------------------------
create table if not exists registrations (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts (id) on delete restrict,

  full_name text not null,
  email text not null,
  phone text not null,
  age smallint not null check (age between 14 and 100),
  gender gender_option not null,
  state text not null,
  city text not null,
  occupation text not null,
  education_level education_option not null,
  owns_laptop boolean not null,
  coding_experience experience_option not null,
  heard_about_eti hear_about_option not null,
  motivation text not null,
  preferred_payment_method payment_method_option not null,
  agreed_to_terms boolean not null default false,

  status registration_status not null default 'pending',
  admin_notes text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One active registration per email per cohort — prevents accidental duplicates.
create unique index if not exists registrations_email_cohort_unique
  on registrations (lower(email), cohort_id);

create index if not exists registrations_created_at_idx on registrations (created_at desc);
create index if not exists registrations_status_idx on registrations (status);
create index if not exists registrations_cohort_id_idx on registrations (cohort_id);

-- keep updated_at current
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists registrations_set_updated_at on registrations;
create trigger registrations_set_updated_at
  before update on registrations
  for each row
  execute function set_updated_at();

-- ------------------------------------------------------------
-- Row Level Security
-- Public (anon) role may only INSERT — never read or update.
-- All reads/updates (admin dashboard) go through the service
-- role key on the server, which bypasses RLS by design.
-- ------------------------------------------------------------
alter table registrations enable row level security;
alter table cohorts enable row level security;

drop policy if exists "public can register" on registrations;
create policy "public can register"
  on registrations
  for insert
  to anon
  with check (true);

drop policy if exists "public can read open cohorts" on cohorts;
create policy "public can read open cohorts"
  on cohorts
  for select
  to anon
  using (is_open = true);

-- No select/update/delete policies are defined for `anon` on
-- registrations, so those operations are denied by default under RLS.
