const fs = require('fs');
const path = require('path');

// Re-run the extraction logic
const content = fs.readFileSync(
  path.join(__dirname, 'src/config/init-templates.ts'),
  'utf-8'
);

const templates = [];
const metrics = [];
let currentTemplate = null;
let lastCompletedTemplate = null;
let inRegisterMetrics = false;

const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.includes('registerTemplate({')) {
    currentTemplate = {};
    inRegisterMetrics = false;
    continue;
  }

  if (currentTemplate && !inRegisterMetrics) {
    const idMatch = line.match(/id:\s*'([^']+)'/);
    if (idMatch) currentTemplate.id = idMatch[1];
    const nameMatch = line.match(/name:\s*'((?:[^'\\]|\\.)*)'/);
    if (nameMatch) currentTemplate.name = nameMatch[1];
    const descMatch = line.match(/description:\s*'((?:[^'\\]|\\.)*)'/);
    if (descMatch) currentTemplate.description = descMatch[1];
    const deptMatch = line.match(/department_type:\s*'([^']+)'/);
    if (deptMatch) currentTemplate.department_type = deptMatch[1];
    if (line.includes('is_default:')) currentTemplate.is_default = line.includes('true');
    const statusMatch = line.match(/status:\s*'([^']+)'/);
    if (statusMatch) currentTemplate.status = statusMatch[1];
    const prioMatch = line.match(/priority:\s*(\d+)/);
    if (prioMatch) currentTemplate.priority = parseInt(prioMatch[1]);
    const rolesMatch = line.match(/applicableRoles:\s*\[([^\]]*)\]/);
    if (rolesMatch) currentTemplate.applicableRoles = (rolesMatch[1].match(/'([^']+)'/g) || []).map(s => s.slice(1, -1));
    const levelsMatch = line.match(/applicableLevels:\s*\[([^\]]*)\]/);
    if (levelsMatch) currentTemplate.applicableLevels = (levelsMatch[1].match(/'([^']+)'/g) || []).map(s => s.slice(1, -1));
    const posMatch = line.match(/applicablePositions:\s*\[([^\]]*)\]/);
    if (posMatch) currentTemplate.applicablePositions = (posMatch[1].match(/'([^']+)'/g) || []).map(s => s.slice(1, -1));

    if (line.includes('});') && currentTemplate.id) {
      templates.push(currentTemplate);
      lastCompletedTemplate = currentTemplate.id;
      currentTemplate = null;
      continue;
    }
  }

  if (line.includes('registerMetrics([')) {
    inRegisterMetrics = true;
    continue;
  }

  if (inRegisterMetrics && line.includes(']);')) {
    inRegisterMetrics = false;
    continue;
  }

  if (inRegisterMetrics && lastCompletedTemplate && line.includes("id: 'metric-")) {
    const metric = { template_id: lastCompletedTemplate };
    const mId = line.match(/id:\s*'([^']+)'/);
    if (mId) metric.id = mId[1];
    const mName = line.match(/metric_name:\s*'((?:[^'\\]|\\.)*)'/);
    if (mName) metric.metric_name = mName[1];
    const mCode = line.match(/metric_code:\s*'([^']+)'/);
    if (mCode) metric.metric_code = mCode[1];
    const mCat = line.match(/category:\s*'([^']+)'/);
    if (mCat) metric.category = mCat[1];
    const mWeight = line.match(/weight:\s*([\d.]+)/);
    if (mWeight) metric.weight = parseFloat(mWeight[1]);
    const mDesc = line.match(/description:\s*'((?:[^'\\]|\\.)*)'/);
    if (mDesc) metric.description = mDesc[1];
    const mEval = line.match(/evaluation_type:\s*'([^']+)'/);
    if (mEval) metric.evaluation_type = mEval[1];
    const mSort = line.match(/sort_order:\s*(\d+)/);
    if (mSort) metric.sort_order = parseInt(mSort[1]);
    if (metric.id) metrics.push(metric);
  }
}

// Generate SQL with proper JSONB format
const sqlLines = [];
sqlLines.push('-- 金凯博自动化考核模板 SQL');
sqlLines.push('-- 生成时间: 2026-04-29');
sqlLines.push(`-- ${templates.length}个模板, ${metrics.length}个指标`);
sqlLines.push('');
sqlLines.push('BEGIN;');
sqlLines.push('');
sqlLines.push('-- Clear existing templates and metrics');
sqlLines.push("DELETE FROM metric_scoring_criteria;");
sqlLines.push("DELETE FROM template_metrics;");
sqlLines.push("DELETE FROM assessment_templates;");
sqlLines.push('');
sqlLines.push('-- Insert templates');

for (const t of templates) {
  const roles = JSON.stringify(t.applicableRoles || []);
  const levels = JSON.stringify(t.applicableLevels || []);
  const positions = JSON.stringify(t.applicablePositions || []);
  const isDefault = t.is_default ? 'TRUE' : 'FALSE';
  sqlLines.push(`INSERT INTO assessment_templates (id, name, description, department_type, is_default, status, priority, applicable_roles, applicable_levels, applicable_positions) VALUES ('${t.id}', '${t.name.replace(/'/g, "''")}', '${t.description.replace(/'/g, "''")}', '${t.department_type}', ${isDefault}, '${t.status}', ${t.priority}, '${roles}'::jsonb, '${levels}'::jsonb, '${positions}'::jsonb);`);
}

sqlLines.push('');
sqlLines.push('-- Insert metrics');

for (const m of metrics) {
  const desc = (m.description || '').replace(/'/g, "''");
  sqlLines.push(`INSERT INTO template_metrics (id, template_id, metric_name, metric_code, category, weight, description, evaluation_type, sort_order) VALUES ('${m.id}', '${m.template_id}', '${m.metric_name.replace(/'/g, "''")}', '${m.metric_code}', '${m.category}', ${m.weight}, '${desc}', '${m.evaluation_type}', ${m.sort_order});`);
}

sqlLines.push('');
sqlLines.push('COMMIT;');

// Write SQL file
const sqlPath = path.join(__dirname, 'scripts', 'update-templates-automation.sql');
fs.writeFileSync(sqlPath, sqlLines.join('\n'));
console.log(`SQL written to ${sqlPath}`);
console.log(`Templates: ${templates.length}, Metrics: ${metrics.length}`);
console.log(`SQL size: ${fs.statSync(sqlPath).size} bytes`);
