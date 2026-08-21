-- ============================================================
-- Elora Tech Institute — Instructor profile picture upload.
--
-- Deliberately a PUBLIC bucket, unlike payment-proofs and
-- onboarding-resources (both private + signed URL). Those hold
-- sensitive/gated documents; a profile photo is the opposite — it's
-- meant to render inline, repeatedly, wherever an instructor is
-- shown (their own dashboard, and any future admin/instructor list
-- view), and isn't sensitive. A private bucket would mean minting a
-- fresh signed URL on every page load just to show an avatar, for no
-- security benefit. Uploads still go exclusively through the
-- service-role client on the server (see
-- app/api/instructor/profile/photo/route.ts) — public here only
-- means "readable by anyone with the URL," not "writable by anyone."
-- ============================================================

insert into storage.buckets (id, name, public)
values ('instructor-avatars', 'instructor-avatars', true)
on conflict (id) do nothing;
