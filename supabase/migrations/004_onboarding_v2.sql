-- ============================================================
-- Elora Tech Institute — Milestone 2B: Onboarding & Cohort Readiness
-- Replaces the flat student_checklist_items table with a
-- database-driven, parent/child checklist system that supports
-- future cohorts without code changes.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Cohort start date correction + schedule extensibility
-- ------------------------------------------------------------
update cohorts set starts_on = '2026-09-08' where name = 'Web Development Cohort';

-- Freeform, nullable — populated once class days/times are decided.
-- Shape: [{ "day": "Monday", "start_time": "18:00", "end_time": "20:00" }, ...]
-- Left as jsonb (not a rigid schedule table) so the calendar feature
-- can ship now and the real schedule can be added later with no
-- migration or code change.
alter table cohorts add column if not exists weekly_schedule jsonb;

-- ------------------------------------------------------------
-- 2. Checklist item definitions (global, reusable across cohorts)
-- ------------------------------------------------------------
create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  item_key text not null unique,
  parent_key text references checklist_items (item_key) on delete cascade,
  title text not null,
  description text,
  item_type text not null check (item_type in ('task', 'video', 'download', 'redirect', 'composite')),
  action_url text,
  action_label text,
  completion_method text not null check (completion_method in ('manual', 'button_click', 'system_verified', 'parent_auto')),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists checklist_items_parent_key_idx on checklist_items (parent_key);

-- ------------------------------------------------------------
-- 3. Per-student progress against those items
-- ------------------------------------------------------------
create table if not exists student_checklist_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students (id) on delete cascade,
  checklist_item_id uuid not null references checklist_items (id) on delete cascade,
  completed_at timestamptz,
  completion_source text check (completion_source in ('manual', 'button_click', 'video_complete', 'system_verified', 'parent_auto')),
  created_at timestamptz not null default now(),
  unique (student_id, checklist_item_id)
);

create index if not exists student_checklist_progress_student_id_idx on student_checklist_progress (student_id);
create index if not exists student_checklist_progress_item_id_idx on student_checklist_progress (checklist_item_id);

-- ------------------------------------------------------------
-- 4. Seed the checklist definition
--    action_url left null for orientation video/handbook — Elora
--    will fill these in via Supabase once the assets are ready.
--    Everything else uses real official links.
-- ------------------------------------------------------------
insert into checklist_items (item_key, parent_key, title, description, item_type, action_url, action_label, completion_method, sort_order) values
  ('profile', null, 'Complete your student profile', null, 'task', null, null, 'system_verified', 10),

  ('orientation', null, 'Complete Orientation', 'Watch the welcome video and review the student handbook.', 'composite', null, null, 'parent_auto', 20),
  ('orientation-video', 'orientation', 'Watch Orientation Video', null, 'video', null, 'Watch Orientation Video', 'button_click', 21),
  ('orientation-handbook', 'orientation', 'Download Student Handbook', null, 'download', null, 'Download Student Handbook', 'button_click', 22),

  ('community', null, 'Access Cohort Community', 'Join the official ETI cohort channel to connect with classmates and instructors.', 'redirect', 'https://t.me/eloratechinstitute', 'Access Cohort Community', 'button_click', 30),

  ('laptop-setup', null, 'Prepare Laptop & Development Environment', null, 'composite', null, null, 'parent_auto', 40),
  ('vscode', 'laptop-setup', 'Install Visual Studio Code', null, 'redirect', 'https://code.visualstudio.com/download', 'Install VS Code', 'button_click', 41),
  ('nodejs', 'laptop-setup', 'Install Node.js', null, 'redirect', 'https://nodejs.org/en/download', 'Install Node.js', 'button_click', 42),
  ('git', 'laptop-setup', 'Install Git', null, 'redirect', 'https://git-scm.com/downloads', 'Install Git', 'button_click', 43),
  ('github-account', 'laptop-setup', 'Create GitHub Account', null, 'redirect', 'https://github.com/join', 'Create GitHub Account', 'button_click', 44),
  ('chrome', 'laptop-setup', 'Install Chrome Browser', null, 'redirect', 'https://www.google.com/chrome/', 'Install Chrome', 'button_click', 45),
  ('ai-tools', 'laptop-setup', 'Set Up AI Development Tools', 'ChatGPT, Claude, and DeepSeek — explore at least one.', 'redirect', 'https://chat.openai.com', 'Explore AI Tools', 'button_click', 46),
  ('test-environment', 'laptop-setup', 'Test Development Environment', 'Confirm VS Code opens, Node and Git work from your terminal.', 'task', null, null, 'manual', 47),

  ('calendar', null, 'Add Cohort Schedule to Calendar', 'Add key cohort dates to your calendar so you never miss a class.', 'redirect', null, 'Add to Calendar', 'button_click', 50)
on conflict (item_key) do nothing;

-- ------------------------------------------------------------
-- 5. Seed progress rows for every existing student, and going
--    forward for every newly-created student.
-- ------------------------------------------------------------
create or replace function seed_student_checklist_progress()
returns trigger as $$
begin
  insert into student_checklist_progress (student_id, checklist_item_id)
  select new.id, id from checklist_items where is_active = true
  on conflict (student_id, checklist_item_id) do nothing;
  return new;
end;
$$ language plpgsql;

drop trigger if exists students_seed_checklist_progress on students;
create trigger students_seed_checklist_progress
  after insert on students
  for each row
  execute function seed_student_checklist_progress();

insert into student_checklist_progress (student_id, checklist_item_id)
select s.id, ci.id
from students s
cross join checklist_items ci
where ci.is_active = true
on conflict (student_id, checklist_item_id) do nothing;

-- Carry forward profile-completion status from Milestone 2A so nobody
-- loses progress they'd already made.
update student_checklist_progress scp
set completed_at = s.profile_completed_at, completion_source = 'system_verified'
from students s, checklist_items ci
where scp.student_id = s.id
  and scp.checklist_item_id = ci.id
  and ci.item_key = 'profile'
  and s.profile_completed_at is not null
  and scp.completed_at is null;

-- ------------------------------------------------------------
-- 6. Clean cutover — the old flat checklist table is fully
--    superseded by the two tables above. All rows so far are
--    Paystack test-mode data, nothing real to preserve.
-- ------------------------------------------------------------
drop table if exists student_checklist_items;

-- ------------------------------------------------------------
-- RLS — same convention as the rest of the schema: enabled, no
-- anon/authenticated policies, all access via service-role server
-- routes that verify the student's session themselves.
-- ------------------------------------------------------------
alter table checklist_items enable row level security;
alter table student_checklist_progress enable row level security;
