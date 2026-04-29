
BEGIN;

-- Add missing columns to assessment_templates
ALTER TABLE assessment_templates ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;
ALTER TABLE assessment_templates ADD COLUMN IF NOT EXISTS applicable_roles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE assessment_templates ADD COLUMN IF NOT EXISTS applicable_levels JSONB DEFAULT '[]'::jsonb;
ALTER TABLE assessment_templates ADD COLUMN IF NOT EXISTS applicable_positions JSONB DEFAULT '[]'::jsonb;

COMMIT;
