const fs = require('fs');
const path = require('path');

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

  // Parse metric lines - use lastCompletedTemplate since registerTemplate is closed by now
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

console.log('Templates:', templates.length);
console.log('Metrics:', metrics.length);

// Output summary
const deptMap = { engineering: '工程技术', manufacturing: '生产制造', support: '职能支持', sales: '营销' };
let currentDept = '';
templates.forEach(t => {
  if (t.department_type !== currentDept) {
    currentDept = t.department_type;
    console.log(`\n【${deptMap[currentDept] || currentDept}】`);
  }
  const mc = metrics.filter(m => m.template_id === t.id).length;
  const positions = (t.applicablePositions || []).join('、') || '兜底';
  const levels = (t.applicableLevels || []).join('/') || 'all';
  console.log(`  ${t.name} (${mc}指标) [${levels}] ${positions}`);
});

const result = { templates, metrics };
console.log('\n---JSON---');
console.log(JSON.stringify(result));
