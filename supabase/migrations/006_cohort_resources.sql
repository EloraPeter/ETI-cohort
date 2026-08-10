-- ============================================================
-- Cohort-scoped onboarding resources (handbook / video / community)
-- ============================================================

-- ------------------------------------------------------------
-- 1. cohort_id: nullable — NULL means "global default item",
--    a specific cohort_id means "overrides the global item for
--    that cohort only". Both can legitimately share the same
--    item_key, which the old plain `unique(item_key)` constraint
--    did not allow — see step 3.
-- ------------------------------------------------------------
alter table checklist_items add column if not exists cohort_id uuid references cohorts (id) on delete cascade;
create index if not exists checklist_items_cohort_id_idx on checklist_items (cohort_id);

-- ------------------------------------------------------------
-- 2. parent_key (text, FK into checklist_items.item_key) can no
--    longer work once item_key stops being globally unique — a
--    text self-reference by key can't tell a global parent from
--    a cohort-specific one. Replace it with parent_id (uuid, FK
--    into checklist_items.id), which unambiguously points at one
--    row. All current parents (orientation, laptop-setup) are
--    global-only, so this is a straightforward backfill.
-- ------------------------------------------------------------
alter table checklist_items add column if not exists parent_id uuid references checklist_items (id) on delete cascade;

update checklist_items c
set parent_id = p.id
from checklist_items p
where c.parent_key = p.item_key
  and c.parent_id is null;

create index if not exists checklist_items_parent_id_idx on checklist_items (parent_id);

-- Drops the column, its FK, and its index together.
alter table checklist_items drop column if exists parent_key;

-- ------------------------------------------------------------
-- 3. Replace the old global `unique(item_key)` with two partial
--    indexes: at most one global row per item_key, and at most
--    one row per item_key within a given cohort. This is what
--    actually allows a cohort-specific override to share an
--    item_key with its global default.
-- ------------------------------------------------------------
alter table checklist_items drop constraint if exists checklist_items_item_key_key;

-- Belt-and-braces: if Postgres named it something else, find and drop
-- any remaining single-column UNIQUE constraint on item_key so this
-- step can't silently no-op and leave cohort overrides blocked.
do $$
declare
  constraint_name text;
begin
  select con.conname into constraint_name
  from pg_constraint con
  join pg_class rel on rel.oid = con.conrelid
  where rel.relname = 'checklist_items'
    and con.contype = 'u'
    and con.conkey = (
      select array_agg(attnum order by attnum)
      from pg_attribute
      where attrelid = rel.oid and attname = 'item_key'
    )
  limit 1;

  if constraint_name is not null then
    execute format('alter table checklist_items drop constraint %I', constraint_name);
  end if;
end $$;

create unique index if not exists checklist_items_item_key_global_uidx
  on checklist_items (item_key) where cohort_id is null;

create unique index if not exists checklist_items_item_key_cohort_uidx
  on checklist_items (item_key, cohort_id) where cohort_id is not null;

-- ------------------------------------------------------------
-- 4. Private storage bucket for the student handbook. Same
--    pattern as the existing `payment-proofs` bucket: private,
--    all reads/writes go through the service role on the server,
--    students get a short-lived signed URL when they click the
--    checklist action. No public/anon storage policies needed.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('onboarding-resources', 'onboarding-resources', false)
on conflict (id) do nothing;
