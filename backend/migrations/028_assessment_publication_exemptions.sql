-- 记录 HR 在发布时对 2-7-1 分布检查的豁免说明，便于后续审计和追溯。

ALTER TABLE monthly_assessment_publications
  ADD COLUMN IF NOT EXISTS force_distribution BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS force_reason TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS readiness_snapshot JSONB;
