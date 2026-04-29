import { query } from '../config/database';

/**
 * 员工季度绩效汇总 — 从 3 个月 performance_records 自动聚合
 */
export class EmployeeQuarterlyModel {
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
    return results.map((r: any) => ({
      ...r,
      monthRecords: typeof r.month_records === 'string' ? JSON.parse(r.month_records) : (r.month_records || [])
    }));
  }

  /**
   * 查询某季度全公司汇总
   */
  static async findByQuarter(year: number, quarter: number): Promise<any[]> {
    const results = await query(
      'SELECT * FROM employee_quarterly_summaries WHERE year = ? AND quarter = ? ORDER BY avg_score DESC',
      [year, quarter]
    );
    return results.map((r: any) => ({
      ...r,
      monthRecords: typeof r.month_records === 'string' ? JSON.parse(r.month_records) : (r.month_records || [])
    }));
  }

  /**
   * 查询单个记录
   */
  static async findById(id: string): Promise<any | null> {
    const results = await query('SELECT * FROM employee_quarterly_summaries WHERE id = ?', [id]);
    if (results.length === 0) return null;
    const r = results[0];
    return {
      ...r,
      monthRecords: typeof r.month_records === 'string' ? JSON.parse(r.month_records) : (r.month_records || [])
    };
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
