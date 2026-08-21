-- ============================================================
-- Elora Tech Institute — Milestone 4 Phase 4C: Teaching &
-- Instructor Delivery System.
--
-- class_completions is deliberately separate from curriculum_classes:
-- editing/reordering the master curriculum never touches this table,
-- and this table never touches curriculum_classes. Keyed on
-- curriculum_class_id (a stable uuid), not class_number (which can
-- change on reorder) — so reordering can never corrupt or orphan a
-- completion record.
--
-- Scoped to (cohort_id, curriculum_class_id), not per-instructor —
-- deliberately: if an instructor is substituted for one session, the
-- class still has exactly one completion state, and instructor_id
-- simply records who last touched it. Two cohorts sharing the same
-- curriculum get fully independent completion tracking because the
-- uniqueness includes cohort_id.
-- ============================================================

create type class_completion_status as enum ('not_started', 'completed');

create table if not exists class_completions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references cohorts (id) on delete cascade,
  curriculum_class_id uuid not null references curriculum_classes (id) on delete cascade,

  -- Who most recently touched this record (checklist toggle, notes,
  -- carry-over, or marking complete). Nullable — set on first write.
  instructor_id uuid references instructors (id) on delete set null,

  status class_completion_status not null default 'not_started',
  completed_at timestamptz,

  -- Fixed small checklist (the 9-item list from the Phase 4C spec),
  -- stored inline as jsonb rather than a second items+progress table
  -- pair — it's a short, class-completion-scoped list, not a
  -- reusable/admin-configurable item catalog like checklist_items.
  -- Shape: [{ key: string, label: string, checked: boolean }, ...]
  checklist jsonb not null default '[]'::jsonb,

  -- "What did students struggle with? What should the next
  -- instructor know?" — persisted here, never written back onto
  -- curriculum_classes.
  notes text,

  -- "Students struggled with X. Spend N minutes reviewing this
  -- before Class N+1." Surfaced to the next relevant instructor via
  -- the dashboard's upcoming-classes view — not a separate table,
  -- since it only ever needs to be read alongside its own
  -- completion record.
  carry_over text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (cohort_id, curriculum_class_id)
);

create index if not exists class_completions_cohort_id_idx on class_completions (cohort_id);
create index if not exists class_completions_curriculum_class_id_idx on class_completions (curriculum_class_id);

drop trigger if exists class_completions_set_updated_at on class_completions;
create trigger class_completions_set_updated_at
  before update on class_completions
  for each row
  execute function set_updated_at();

-- ------------------------------------------------------------
-- RLS — same convention as every other table in this project:
-- enabled, no anon/authenticated policies. All access goes through
-- server API routes using the service role key, which verify the
-- instructor is assigned to the cohort (or is an admin) before
-- touching a row — see lib/curriculum/ and the Phase 4C API routes.
-- ------------------------------------------------------------
alter table class_completions enable row level security;
