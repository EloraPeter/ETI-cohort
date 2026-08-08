-- ============================================================
-- Fix: migration 004 dropped the old student_checklist_items table
-- but left the Milestone 2A trigger (students_seed_checklist) still
-- attached to `students`, still trying to insert into that
-- now-nonexistent table on every insert. Postgres doesn't track a
-- plpgsql function body's table references as a dependency, so
-- dropping the table didn't drop the trigger — it just made it fail
-- every time, taking the whole student insert down with it.
-- ============================================================

drop trigger if exists students_seed_checklist on students;
drop function if exists seed_student_checklist();
