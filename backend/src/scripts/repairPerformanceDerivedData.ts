import dotenv from 'dotenv';
dotenv.config();

import { pool, query, testConnection } from '../config/database';
import { PerformanceModel } from '../models/performance.model';
import { scoreToLevel } from '../utils/helpers';

function resolveDepartmentType(department?: string): string {
  const name = String(department || '').toLowerCase();
  if (name.includes('营销') || name.includes('销售')) return 'sales';
  if (name.includes('项目管理')) return 'engineering';
  if (name.includes('工程') || name.includes('技术') || name.includes('研发')) return 'engineering';
  if (name.includes('制造') || name.includes('生产') || name.includes('品质') || name.includes('装配')) return 'manufacturing';
  if (name.includes('财务') || name.includes('人力') || name.includes('行政') || name.includes('采购')) return 'support';
  if (name.includes('总') || name.includes('管理')) return 'management';
  return 'support';
}

async function main() {
  const connected = await testConnection();
  if (!connected) throw new Error('数据库连接失败');

  const monthsArg = process.argv.slice(2).map((value) => value.trim()).filter(Boolean);
  const months = monthsArg.length > 0
    ? monthsArg
    : (await query(`SELECT DISTINCT month FROM performance_records ORDER BY month`)).map((row: any) => row.month);

  const invalidEmployeeManagers = await query(`
    UPDATE employees e
    SET manager_id = NULL, updated_at = CURRENT_TIMESTAMP
    WHERE manager_id IS NOT NULL
      AND manager_id <> ''
      AND manager_id <> e.id
      AND NOT EXISTS (
        SELECT 1 FROM employees m WHERE m.id = e.manager_id AND COALESCE(m.status, 'active') <> 'disabled'
      )
    RETURNING e.id, e.name
  `);

  const invalidAssessors = await query(`
    SELECT pr.id, pr.employee_id, pr.month, e.manager_id
    FROM performance_records pr
    LEFT JOIN employees assessor ON assessor.id = pr.assessor_id
    LEFT JOIN employees e ON e.id = pr.employee_id
    WHERE pr.assessor_id IS NOT NULL
      AND pr.assessor_id <> ''
      AND assessor.id IS NULL
  `);

  let reassignedAssessors = 0;
  let clearedAssessors = 0;
  for (const record of invalidAssessors as any[]) {
    const managerId = String(record.manager_id || '').trim();
    if (managerId) {
      const updated = await query(`UPDATE performance_records SET assessor_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [managerId, record.id]);
      reassignedAssessors += (updated as any).affectedRows || 0;
    } else {
      const updated = await query(`UPDATE performance_records SET assessor_id = '', updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [record.id]);
      clearedAssessors += (updated as any).affectedRows || 0;
    }
  }

  const completedRecords = await query(`
    SELECT pr.id, pr.month, pr.total_score, pr.level, pr.department_type, e.department
    FROM performance_records pr
    LEFT JOIN employees e ON e.id = pr.employee_id
    WHERE pr.status IN ('completed', 'scored')
      ${monthsArg.length > 0 ? `AND pr.month = ANY($1::text[])` : ''}
  `, monthsArg.length > 0 ? [monthsArg] : []);

  let updatedDerived = 0;
  for (const record of completedRecords as any[]) {
    const totalScore = Number(record.total_score || 0);
    const expectedLevel = scoreToLevel(totalScore);
    const expectedDepartmentType = record.department_type || resolveDepartmentType(record.department);
    if (record.level !== expectedLevel || !record.department_type) {
      const updated = await query(
        `UPDATE performance_records SET level = ?, department_type = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [expectedLevel, expectedDepartmentType, record.id]
      );
      updatedDerived += (updated as any).affectedRows || 0;
    }
  }

  for (const month of months) {
    await PerformanceModel.updateRanks(month);
  }

  const result = {
    months,
    invalidEmployeeManagers: invalidEmployeeManagers.length,
    invalidAssessors: invalidAssessors.length,
    reassignedAssessors,
    clearedAssessors,
    updatedDerived,
  };
  console.log(JSON.stringify({ success: true, data: result }, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({ success: false, error: error.message }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool?.end().catch(() => undefined);
  });
