-- ============================================================
-- Elora Tech Institute — Milestone 4 Phase 1: Instructor Foundation
-- Adds `instructor_cohorts`: a many-to-many assignment table.
-- Deliberately not an instructor.cohort_id column — an instructor
-- must be able to teach multiple cohorts, and a cohort must be
-- able to have multiple instructors.
-- ============================================================

create table if not exists instructor_cohorts (
  id uuid primary key default gen_random_uuid(),
  instructor_id uuid not null references instructors (id) on delete cascade,
  cohort_id uuid not null references cohorts (id) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by text, -- admin email

  unique (instructor_id, cohort_id)
);

create index if not exists instructor_cohorts_instructor_id_idx on instructor_cohorts (instructor_id);
create index if not exists instructor_cohorts_cohort_id_idx on instructor_cohorts (cohort_id);

-- ------------------------------------------------------------
-- RLS — same convention as every other table in this project:
-- enabled, no anon/authenticated policies. All access goes
-- through server API routes using the service role key.
-- ------------------------------------------------------------
alter table instructor_cohorts enable row level security;
