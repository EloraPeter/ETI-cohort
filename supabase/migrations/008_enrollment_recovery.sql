-- ============================================================
-- Enrollment Recovery
-- Adds a single-use, expiring, hashed recovery token to `payments`
-- so a student who abandoned Paystack checkout or never submitted
-- bank-transfer proof can securely get back to their existing
-- payment — without a second payment row, a second Paystack
-- reference, or a second registration.
--
-- Lives on `payments`, not a new table: every existing code path
-- that branches on payment state already queries this table, and
-- the token is 1:1 with a payment (payments.registration_id is
-- itself unique), so a join-only table would add nothing.
-- ============================================================

alter table payments add column if not exists recovery_token_hash text;
alter table payments add column if not exists recovery_token_expires_at timestamptz;

-- Partial: most payments never have an active recovery token, and a
-- consumed/expired one is nulled out (see lib/recovery/token.ts),
-- so this only indexes the rows that currently matter.
create unique index if not exists payments_recovery_token_hash_idx
  on payments (recovery_token_hash)
  where recovery_token_hash is not null;
