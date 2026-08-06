-- ============================================================
-- Elora Tech Institute — Milestone 2A: Student Onboarding
-- Adds: auth account linkage + profile fields on `students`,
-- and a `student_checklist_items` table for cohort-prep tasks.
-- Safe to run in a single execution (no enum changes this time).
-- ============================================================

alter table students
  add column if not exists auth_user_id uuid unique references auth.users (id) on delete set null,
  add column if not exists preferred_name text,
  add column if not exists timezone text,
  add column if not exists laptop_ready boolean not null default false,
  add column if not exists profile_completed_at timestamptz;

create index if not exists students_auth_user_id_idx on students (auth_user_id);

-- ------------------------------------------------------------
-- Cohort-prep checklist — a handful of seeded, student-owned
-- tasks shown on the dashboard. Purely a manual checklist (no
-- automation of any kind); scope is intentionally limited to
-- what Milestone 2B asks for.
-- ------------------------------------------------------------
create table if not exists student_checklist_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  item_key text not null,
  label text not null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, item_key)
);

create index if not exists student_checklist_items_student_id_idx on student_checklist_items (student_id);

-- Seed the default checklist for every newly-created student.
create or replace function seed_student_checklist()
returns trigger as $$
begin
  insert into student_checklist_items (student_id, item_key, label)
  values
    (new.id, 'profile', 'Complete your student profile'),
    (new.id, 'laptop', 'Confirm your laptop and dev environment are ready'),
    (new.id, 'schedule', 'Review your cohort''s start date and weekly schedule'),
    (new.id, 'community', 'Join the cohort community channel'),
    (new.id, 'orientation', 'Attend (or watch) the orientation session')
  on conflict (student_id, item_key) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists students_seed_checklist on students;
create trigger students_seed_checklist
  after insert on students
  for each row
  execute function seed_student_checklist();

-- Backfill checklist rows for any student created before this migration.
insert into student_checklist_items (student_id, item_key, label)
select s.id, v.item_key, v.label
from students s
cross join (values
  ('profile', 'Complete your student profile'),
  ('laptop', 'Confirm your laptop and dev environment are ready'),
  ('schedule', 'Review your cohort''s start date and weekly schedule'),
  ('community', 'Join the cohort community channel'),
  ('orientation', 'Attend (or watch) the orientation session')
) as v(item_key, label)
on conflict (student_id, item_key) do nothing;

-- ------------------------------------------------------------
-- RLS — same convention as payments/students: enabled, no anon
-- or authenticated policies. All access goes through server API
-- routes using the service role key, which verify the student's
-- session token themselves (see lib/supabase/verifyStudent.ts)
-- before touching the row.
-- ------------------------------------------------------------
alter table student_checklist_items enable row level security;
