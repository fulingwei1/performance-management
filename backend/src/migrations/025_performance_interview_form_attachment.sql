-- 低分/2-7-1末位人员面谈表附件
ALTER TABLE performance_records
  ADD COLUMN IF NOT EXISTS interview_form_attachment JSONB;
