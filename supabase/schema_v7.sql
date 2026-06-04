-- ═══════════════════════════════════════════════
-- GymBuddy Schema v7 — persist per-exercise target muscles
-- Run AFTER v1–v6. Idempotent.
-- ═══════════════════════════════════════════════

alter table exercises add column if not exists muscles text[];
