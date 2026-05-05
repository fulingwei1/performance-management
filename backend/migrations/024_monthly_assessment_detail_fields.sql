-- Migration: 024_monthly_assessment_detail_fields
-- Description: 补齐月度考核自评、主管评语和状态字段

ALTER TABLE monthly_assessments
  ADD COLUMN IF NOT EXISTS self_summary TEXT,
  ADD COLUMN IF NOT EXISTS next_month_plan TEXT,
  ADD COLUMN IF NOT EXISTS manager_comment TEXT,
  ADD COLUMN IF NOT EXISTS next_month_work_arrangement TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'draft';
