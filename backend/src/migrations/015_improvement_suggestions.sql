ALTER TABLE performance_records
  ADD COLUMN IF NOT EXISTS improvement_suggestion TEXT,
  ADD COLUMN IF NOT EXISTS suggestion_anonymous BOOLEAN DEFAULT false;
