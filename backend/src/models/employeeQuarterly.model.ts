import { query } from '../config/database';

function parseJson(value: any): any[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
}

function toNumber(value: any): number {
  const numberValue = Number(value || 0);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function getQuarterOrgUnitKey(record: any): string {
  const department = String(record.department || '').trim();
  const subDepartment = String(record.subDepartment || record.sub_department || '').trim();
  return subDepartment ? `${department}/${subDepartment}` : department;
}

function sortByQuarterScore(a: any, b: any): number {
  const scoreDiff = toNumber(b.avgScore ?? b.avg_score) - toNumber(a.avgScore ?? a.avg_score);
  if (scoreDiff !== 0) return scoreDiff;
  return String(a.employeeId || a.employee_id || '').localeCompare(String(b.employeeId || b.employee_id || ''));
}

/**
 * 员工季度绩效汇总 — 从 3 个月 performance_records 自动聚合
 */
export class EmployeeQuarterlyModel {
  private static formatQuarterlyRow(row: any): any {
    return {
      ...row,
      employeeId: row.employee_id || row.employeeId,
      employeeName: row.employee_name || row.employeeName,
      department: row.department,
      subDepartment: row.sub_department || row.subDepartment,
      employeeLevel: row.employee_level || row.employeeLevel,
      avgScore: toNumber(row.avg_score ?? row.avgScore),
      maxScore: toNumber(row.max_score ?? row.maxScore),
      minScore: toNumber(row.min_score ?? row.minScore),
      recordCount: Number(row.record_count ?? row.recordCount ?? 0),
      bestLevel: row.best_level || row.bestLevel,
      monthlySummaries: row.monthly_summaries || row.monthlySummaries || '',
      monthlyPlans: row.monthly_plans || row.monthlyPlans || '',
      monthRecords: parseJson(row.month_records ?? row.monthRecords),
    };
  }

  private static attachRanks(rows: any[]): any[] {
    const formatted = rows.map((row) => this.formatQuarterlyRow(row));
    const quarterSorted = [...formatted].sort(sortByQuarterScore);
    quarterSorted.forEach((row, index) => {
      row.quarterRank = index + 1;
    });

    const unitGroups = new Map<string, any[]>();
    formatted.forEach((row) => {
      const key = getQuarterOrgUnitKey(row) || '未分组';
      if (!unitGroups.has(key)) unitGroups.set(key, []);
      unitGroups.get(key)!.push(row);
    });

    unitGroups.forEach((records) => {
      records.sort(sortByQuarterScore).forEach((row, index) => {
        row.departmentQuarterRank = index + 1;
      });
    });

    return formatted;
  }

  static async generateForEmployeeIfMissing(employeeId: string, year: number, quarter: number): Promise<any> {
    const existing = await query(
      'SELECT id FROM employee_quarterly_summaries WHERE employee_id = ? AND year = ? AND quarter = ?',
      [employeeId, year, quarter]
    );
    if (existing.length > 0) {
      return this.findById(existing[0].id);
    }
    return this.generateForEmployee(employeeId, year, quarter);
  }

  static async generateAllMissingForEmployee(employeeId: string): Promise<void> {
    const months = await query(
      `SELECT DISTINCT month
       FROM performance_records
       WHERE employee_id = ?
       ORDER BY month DESC`,
      [employeeId]
    );

    const quarterKeys = new Set<string>();
    months.forEach((row: any) => {
      const monthValue = String(row.month || '');
      const [yearText, monthText] = monthValue.split('-');
      const year = Number(yearText);
      const month = Number(monthText);
      if (!year || !month) return;
      const quarter = Math.ceil(month / 3);
      quarterKeys.add(`${year}-Q${quarter}`);
    });

    for (const key of quarterKeys) {
      const [yearText, quarterText] = key.split('-Q');
      await this.generateForEmployeeIfMissing(employeeId, Number(yearText), Number(quarterText));
    }
  }

  /**
   * 为单个员工生成季度汇总
   */
  static async generateForEmployee(employeeId: string, year: number, quarter: number): Promise<any> {
    const months = this.getQuarterMonths(year, quarter);
    
    // 查询该员工3个月的绩效记录
    const records = await query(
      `SELECT month, total_score, level, status, self_summary, next_month_plan, 
              department_rank, group_rank
       FROM performance_records 
       WHERE employee_id = ? AND month = ANY(?)
       ORDER BY month ASC`,
      [employeeId, months]
    );

    if (records.length === 0) return null;

    // 聚合计算
    const scores = records.map((r: any) => parseFloat(r.total_score || 0));
    const avgScore = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const maxScore = Math.max(...scores);
    const minScore = Math.min(...scores);
    const trend = scores.length >= 2 
      ? (scores[scores.length - 1] > scores[0] ? 'up' : scores[scores.length - 1] < scores[0] ? 'down' : 'flat')
      : 'flat';

    // 汇总3个月的 self_summary 和 next_month_plan
    const summaries = records
      .map((r: any) => r.self_summary)
      .filter(Boolean)
      .join('\n\n');
    
    const plans = records
      .map((r: any) => r.next_month_plan)
      .filter(Boolean)
      .join('\n\n');

    // 获取最好的等级
    const levelOrder: Record<string, number> = { 'S': 5, 'A': 4, 'B': 3, 'C': 2, 'D': 1 };
    const bestLevel = records
      .map((r: any) => r.level || 'D')
      .reduce((best, cur) => (levelOrder[cur] || 0) > (levelOrder[best] || 0) ? cur : best, 'D');

    const id = `eq-${year}-Q${quarter}-${employeeId}`;

    // Upsert
    const existing = await query(
      'SELECT id FROM employee_quarterly_summaries WHERE employee_id = ? AND year = ? AND quarter = ?',
      [employeeId, year, quarter]
    );

    if (existing.length > 0) {
      await query(
        `UPDATE employee_quarterly_summaries SET
          month_records = ?, avg_score = ?, max_score = ?, min_score = ?,
          trend = ?, best_level = ?, monthly_summaries = ?, monthly_plans = ?,
          record_count = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          JSON.stringify(records),
          avgScore.toFixed(2),
          maxScore.toFixed(2),
          minScore.toFixed(2),
          trend,
          bestLevel,
          summaries,
          plans,
          records.length,
          id
        ]
      );
    } else {
      await query(
        `INSERT INTO employee_quarterly_summaries 
          (id, employee_id, year, quarter, month_records, avg_score, max_score, min_score,
           trend, best_level, monthly_summaries, monthly_plans, record_count)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id, employeeId, year, quarter,
          JSON.stringify(records),
          avgScore.toFixed(2), maxScore.toFixed(2), minScore.toFixed(2),
          trend, bestLevel, summaries, plans, records.length
        ]
      );
    }

    return this.findById(id);
  }

  /**
   * 为全公司某个季度批量生成汇总
   */
  static async generateForQuarter(year: number, quarter: number): Promise<{
    total: number; created: number; skipped: number; details: any[]
  }> {
    const months = this.getQuarterMonths(year, quarter);

    // 获取所有在3个月中有绩效记录的员工
    const employees = await query(
      `SELECT DISTINCT employee_id FROM performance_records WHERE month = ANY(?)`,
      [months]
    );

    const details: any[] = [];
    let created = 0;
    let skipped = 0;

    for (const emp of employees) {
      const result = await this.generateForEmployee(emp.employee_id, year, quarter);
      if (result) {
        created++;
        details.push(result);
      } else {
        skipped++;
      }
    }

    return { total: employees.length, created, skipped, details };
  }

  /**
   * 查询单个员工季度汇总
   */
  static async findByEmployee(employeeId: string, year?: number, quarter?: number): Promise<any[]> {
    let sql = 'SELECT * FROM employee_quarterly_summaries WHERE employee_id = ?';
    const params: any[] = [employeeId];
    if (year) { sql += ' AND year = ?'; params.push(year); }
    if (quarter) { sql += ' AND quarter = ?'; params.push(quarter); }
    sql += ' ORDER BY year DESC, quarter DESC';

    const results = await query(sql, params);
    return results.map((r: any) => this.formatQuarterlyRow(r));
  }

  /**
   * 查询某季度全公司汇总
   */
  static async findByQuarter(year: number, quarter: number): Promise<any[]> {
    const results = await query(
      `SELECT
         qs.*,
         e.name AS employee_name,
         e.department,
         e.sub_department,
         e.level AS employee_level
       FROM employee_quarterly_summaries qs
       LEFT JOIN employees e ON e.id = qs.employee_id
       WHERE qs.year = ? AND qs.quarter = ?
       ORDER BY qs.avg_score DESC`,
      [year, quarter]
    );
    return this.attachRanks(results);
  }

  /**
   * 查询某个经理团队的季度汇总，不生成新记录；没有季度汇总则返回空数组
   */
  static async findByTeamQuarter(employeeIds: string[], year: number, quarter: number): Promise<any[]> {
    if (employeeIds.length === 0) return [];
    const results = await query(
      `SELECT
         qs.*,
         e.name AS employee_name,
         e.department,
         e.sub_department,
         e.level AS employee_level
       FROM employee_quarterly_summaries qs
       LEFT JOIN employees e ON e.id = qs.employee_id
       WHERE qs.year = ? AND qs.quarter = ? AND qs.employee_id = ANY(?)
       ORDER BY qs.avg_score DESC`,
      [year, quarter, employeeIds]
    );
    return this.attachRanks(results);
  }

  /**
   * 查询单个记录
   */
  static async findById(id: string): Promise<any | null> {
    const results = await query('SELECT * FROM employee_quarterly_summaries WHERE id = ?', [id]);
    if (results.length === 0) return null;
    const r = results[0];
    return this.formatQuarterlyRow(r);
  }

  /**
   * 季度统计数据
   */
  static async getQuarterStats(year: number, quarter: number): Promise<any> {
    const results = await query(
      `SELECT 
         COUNT(*) as total_employees,
         ROUND(AVG(avg_score::numeric), 2) as avg_score,
         ROUND(MAX(avg_score::numeric), 2) as max_score,
         ROUND(MIN(avg_score::numeric), 2) as min_score,
         COUNT(*) FILTER (WHERE best_level = 'S') as s_count,
         COUNT(*) FILTER (WHERE best_level = 'A') as a_count,
         COUNT(*) FILTER (WHERE best_level = 'B') as b_count,
         COUNT(*) FILTER (WHERE best_level = 'C') as c_count,
         COUNT(*) FILTER (WHERE trend = 'up') as trend_up,
         COUNT(*) FILTER (WHERE trend = 'flat') as trend_flat,
         COUNT(*) FILTER (WHERE trend = 'down') as trend_down
       FROM employee_quarterly_summaries
       WHERE year = ? AND quarter = ?`,
      [year, quarter]
    );
    return results[0] || {};
  }

  private static getQuarterMonths(year: number, quarter: number): string[] {
    const startMonth = (quarter - 1) * 3 + 1;
    return [
      `${year}-${String(startMonth).padStart(2, '0')}`,
      `${year}-${String(startMonth + 1).padStart(2, '0')}`,
      `${year}-${String(startMonth + 2).padStart(2, '0')}`
    ];
  }
}
