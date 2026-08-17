-- ============================================================
-- Elora Tech Institute — Milestone 4 Phase 1: Instructor Foundation
-- Adds the `instructors` table: a first-class ETI institutional
-- identity, separate from Supabase Auth. auth_user_id links the
-- two only once the instructor completes account setup — mirrors
-- students.auth_user_id (see 003_student_accounts.sql).
--
-- Profile fields beyond the required set (full_name/email/phone/
-- profile_photo_url/bio) are optional and unused by anything in
-- Phase 1 — they exist now so Phase 2's profile-completion UI
-- doesn't need a follow-up migration.
-- ============================================================

create type instructor_status as enum ('invited', 'active', 'inactive');

create table if not exists instructors (
  id uuid primary key default gen_random_uuid(),

  -- ETI institutional identity
  full_name text not null,
  email text not null,
  phone text,
  profile_photo_url text,
  bio text,
  professional_title text,
  expertise text,
  linkedin_url text,
  github_url text,

  -- Authentication identity — nullable until the invited instructor
  -- completes account setup (see /api/instructor/account/complete).
  auth_user_id uuid unique references auth.users (id) on delete set null,

  status instructor_status not null default 'invited',
  profile_completed_at timestamptz,

  created_by text, -- admin email, for accountability

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Case-insensitive uniqueness on email — same convention as
-- registrations_email_cohort_unique in 001_initial_schema.sql.
create unique index if not exists instructors_email_unique
  on instructors (lower(email));

create index if not exists instructors_auth_user_id_idx on instructors (auth_user_id);
create index if not exists instructors_status_idx on instructors (status);

-- Reuses the shared set_updated_at() function already defined in
-- 001_initial_schema.sql (and used by payments in 002) rather than
-- redefining it.
drop trigger if exists instructors_set_updated_at on instructors;
create trigger instructors_set_updated_at
  before update on instructors
  for each row
  execute function set_updated_at();

-- ------------------------------------------------------------
-- RLS — same convention as every other table in this project:
-- enabled, no anon/authenticated policies. All access goes
-- through server API routes using the service role key, which
-- verify the instructor's session token themselves (see
-- lib/supabase/verifyInstructor.ts) before touching the row.
-- ------------------------------------------------------------
alter table instructors enable row level security;
