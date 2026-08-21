-- ============================================================
-- Elora Tech Institute — Milestone 4 Phase 4C: Teaching &
-- Instructor Delivery System.
--
-- Curriculum = what SHOULD be taught (this migration).
-- Completion = what ACTUALLY happened (012_class_completions.sql).
-- Kept as separate tables/migrations deliberately — see the
-- Phase 4C architecture notes in the patch report.
-- ============================================================

-- A curriculum is a reusable teaching plan, independent of any one
-- cohort — the same curriculum can (and is designed to) be assigned
-- to multiple cohorts over time.
create table if not exists curricula (
  id uuid primary key default gen_random_uuid(),
  code text not null unique, -- e.g. 'WD-2026'
  name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists curricula_set_updated_at on curricula;
create trigger curricula_set_updated_at
  before update on curricula
  for each row
  execute function set_updated_at();

alter table curricula enable row level security;

-- The master class content. class_number is the display/teaching
-- order (1..N); admin reordering changes class_number, never the
-- row's id — completion records key off id, so reordering can never
-- corrupt or orphan a completion record (see class_completions.sql).
create table if not exists curriculum_classes (
  id uuid primary key default gen_random_uuid(),
  curriculum_id uuid not null references curricula (id) on delete cascade,
  class_number integer not null,
  week_number integer not null,
  week_theme text not null,
  title text not null,
  outcome text not null,
  teaching_points jsonb not null default '[]'::jsonb, -- string[]
  demo jsonb not null default '[]'::jsonb,             -- string[]
  practice jsonb not null default '[]'::jsonb,         -- string[]
  questions jsonb not null default '[]'::jsonb,        -- string[]
  assignment text not null default '',
  checkpoint text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (curriculum_id, class_number)
);

create index if not exists curriculum_classes_curriculum_id_idx on curriculum_classes (curriculum_id);

drop trigger if exists curriculum_classes_set_updated_at on curriculum_classes;
create trigger curriculum_classes_set_updated_at
  before update on curriculum_classes
  for each row
  execute function set_updated_at();

alter table curriculum_classes enable row level security;

-- Data-driven per-class resources (starter code, reference links,
-- slides, etc.) — deliberately a plain label+url table rather than
-- reusing checklist_items (that table models a fixed set of named
-- onboarding items with global/cohort-override semantics; a class
-- needs an arbitrary-length list of arbitrary links, a different
-- shape, so a small dedicated table is clearer than forcing a fit).
create table if not exists class_resources (
  id uuid primary key default gen_random_uuid(),
  curriculum_class_id uuid not null references curriculum_classes (id) on delete cascade,
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists class_resources_curriculum_class_id_idx on class_resources (curriculum_class_id);

alter table class_resources enable row level security;

-- Additive, nullable — links a cohort to the curriculum it's
-- teaching. Nullable so existing cohorts (and any without a
-- curriculum yet) are unaffected; many cohorts can point at the same
-- curriculum_id, which is what "cohorts can reuse curriculum" means
-- here. No existing row's data is altered by adding this column.
alter table cohorts add column if not exists curriculum_id uuid references curricula (id) on delete set null;
