import fs from 'fs';
import path from 'path';

describe('metric library PostgreSQL schema compatibility', () => {
  const repoRoot = path.resolve(__dirname, '../../../..');
  const schema = fs.readFileSync(path.join(repoRoot, 'postgres-init/06-local-current-schema.sql'), 'utf8');
  const model = fs.readFileSync(path.join(repoRoot, 'backend/src/models/metricLibrary.model.ts'), 'utf8');

  it('creates the metric library tables used by /api/metrics endpoints', () => {
    expect(schema).toMatch(/CREATE TABLE IF NOT EXISTS performance_metrics/i);
    expect(schema).toMatch(/CREATE TABLE IF NOT EXISTS metric_templates/i);
    expect(schema).toMatch(/CREATE TABLE IF NOT EXISTS metric_template_metrics/i);
    expect(schema).toMatch(/CREATE TABLE IF NOT EXISTS metric_departments/i);
    expect(schema).toMatch(/CREATE TABLE IF NOT EXISTS metric_positions/i);
    expect(schema).toMatch(/CREATE TABLE IF NOT EXISTS metric_levels/i);
    expect(schema).toMatch(/CREATE TABLE IF NOT EXISTS scoring_criteria/i);
  });

  it('does not use MySQL-only aggregation functions in metric library queries', () => {
    expect(model).not.toMatch(/GROUP_CONCAT/i);
  });

  it('keeps metric-library template mapping separate from assessment template_metrics', () => {
    expect(model).toContain('metric_template_metrics');
  });
});
