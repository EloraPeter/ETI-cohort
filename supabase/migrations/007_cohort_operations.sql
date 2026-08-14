-- ============================================================
-- Milestone 3: cohort operations foundation
-- ============================================================

-- ------------------------------------------------------------
-- 1. Timezone — IANA identifier, defaults existing cohorts to
--    Africa/Lagos. The calendar generator reads this per-cohort;
--    nothing is hardcoded in application code.
-- ------------------------------------------------------------
alter table cohorts add column if not exists timezone text not null default 'Africa/Lagos';

-- ------------------------------------------------------------
-- 2. Global stub for the cohort-specific WhatsApp checklist item.
--    Distinct from — and does not touch — the existing global
--    `community` item (ETI Telegram), which stays exactly as is.
--    cohort_id is NULL here on purpose: this is the *default* row
--    every cohort falls back to until an admin sets that cohort's
--    real WhatsApp URL via a cohort-scoped override (same pattern
--    as orientation-handbook/orientation-video).
--
--    Targets the partial unique index from migration 006
--    (checklist_items_item_key_global_uidx) so a second run of
--    this migration is a safe no-op, not a duplicate row.
-- ------------------------------------------------------------
insert into checklist_items (item_key, parent_id, cohort_id, title, description, item_type, action_url, action_label, completion_method, sort_order)
values (
  'cohort-whatsapp',
  null,
  null,
  'Join Your Cohort WhatsApp Group',
  'Connect with your classmates and receive cohort-specific class updates and support.',
  'redirect',
  null,
  'Join WhatsApp Group',
  'button_click',
  35
)
on conflict (item_key) where cohort_id is null do nothing;
  