/**
 * 绩效异常检测服务
 * 检测绩效异常波动并生成预警
 */

export enum AnomalyLevel {
  INFO = 'info',        // 提示
  WARNING = 'warning',  // 预警
  ALERT = 'alert'       // 警报
}

export interface PerformanceAnomaly {
  employeeId: number;
  employeeName: string;
  department: string;
  anomalyType: string;
  level: AnomalyLevel;
  description: string;
  currentScore: number;
  previousScore?: number;
  teamAverage?: number;
  month: string;
  suggestions: string[];
}

interface MonthlyScore {
  month: string;
  score: number;
}

export class AnomalyDetectionService {
  /**
   * 检测指定月份的绩效异常
   */
  async detectAnomalies(month?: string): Promise<PerformanceAnomaly[]> {
    const targetMonth = month || this.getCurrentMonth();
    const anomalies: PerformanceAnomaly[] = [];

    // 1. 检测连续下降
    const continuousDeclines = await this.detectContinuousDecline(targetMonth);
    anomalies.push(...continuousDeclines);

    // 2. 检测突然下降
    const suddenDrops = await this.detectSuddenDrop(targetMonth);
    anomalies.push(...suddenDrops);

    // 3. 检测低于团队平均
    const belowTeamAvg = await this.detectBelowTeamAverage(targetMonth);
    anomalies.push(...belowTeamAvg);

    // 4. 检测异常高分（可能数据错误）
    const abnormallyHigh = await this.detectAbnormallyHigh(targetMonth);
    anomalies.push(...abnormallyHigh);

    // 按严重程度排序
    return this.sortByLevel(anomalies);
  }

  /**
   * 检测连续下降（连续2个月下降≥15分）
   */
  private async detectContinuousDecline(targetMonth: string): Promise<PerformanceAnomaly[]> {
    const { query: dbQuery } = await import('../config/database');

    const sql = `
      WITH monthly_scores AS (
        SELECT 
          ma.employee_id,
          e.username as employee_name,
          e.department,
          TO_CHAR(ma.month, 'YYYY-MM') as month,
          ma.total_score as score,
          LAG(ma.total_score, 1) OVER (PARTITION BY ma.employee_id ORDER BY ma.month) as prev_score_1,
          LAG(ma.total_score, 2) OVER (PARTITION BY ma.employee_id ORDER BY ma.month) as prev_score_2
        FROM monthly_assessments ma
        JOIN employees e ON ma.employee_id = e.id
        WHERE TO_CHAR(ma.month, 'YYYY-MM') = $1
      )
      SELECT *
      FROM monthly_scores
      WHERE prev_score_1 IS NOT NULL 
        AND prev_score_2 IS NOT NULL
        AND (prev_score_1 - score) >= 15
        AND (prev_score_2 - prev_score_1) >= 15
    `;

    const result = await dbQuery(sql, [targetMonth]);

    return result.map((row: any) => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      department: row.department,
      anomalyType: '连续下降',
      level: AnomalyLevel.WARNING,
      description: `连续两个月绩效下降，累计下降${Math.round((row.prev_score_2 - row.score) * 10) / 10}分`,
      currentScore: parseFloat(row.score),
      previousScore: parseFloat(row.prev_score_1),
      month: targetMonth,
      suggestions: [
        '建议与员工进行一对一沟通，了解近期工作困难',
        '检查是否有工作量过大或资源不足的问题',
        '制定针对性的改进计划'
      ]
    }));
  }

  /**
   * 检测突然下降（单月下降≥25分）
   */
  private async detectSuddenDrop(targetMonth: string): Promise<PerformanceAnomaly[]> {
    const { query: dbQuery } = await import('../config/database');

    const sql = `
      WITH monthly_scores AS (
        SELECT 
          ma.employee_id,
          e.username as employee_name,
          e.department,
          TO_CHAR(ma.month, 'YYYY-MM') as month,
          ma.total_score as score,
          LAG(ma.total_score, 1) OVER (PARTITION BY ma.employee_id ORDER BY ma.month) as prev_score
        FROM monthly_assessments ma
        JOIN employees e ON ma.employee_id = e.id
        WHERE TO_CHAR(ma.month, 'YYYY-MM') = $1
      )
      SELECT *
      FROM monthly_scores
      WHERE prev_score IS NOT NULL 
        AND (prev_score - score) >= 25
    `;

    const result = await dbQuery(sql, [targetMonth]);

    return result.map((row: any) => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      department: row.department,
      anomalyType: '突然下降',
      level: AnomalyLevel.ALERT,
      description: `绩效突然下降${Math.round((row.prev_score - row.score) * 10) / 10}分，需立即关注`,
      currentScore: parseFloat(row.score),
      previousScore: parseFloat(row.prev_score),
      month: targetMonth,
      suggestions: [
        '尽快安排紧急面谈，了解具体原因',
        '检查是否有重大事件影响（如个人/家庭问题）',
        '提供必要的支持和资源',
        '必要时调整工作安排'
      ]
    }));
  }

  /**
   * 检测低于团队平均（低于团队平均30%+）
   */
  private async detectBelowTeamAverage(targetMonth: string): Promise<PerformanceAnomaly[]> {
    const { query: dbQuery } = await import('../config/database');

    const sql = `
      WITH department_avg AS (
        SELECT 
          e.department,
          AVG(ma.total_score) as avg_score
        FROM monthly_assessments ma
        JOIN employees e ON ma.employee_id = e.id
        WHERE TO_CHAR(ma.month, 'YYYY-MM') = $1
        GROUP BY e.department
      )
      SELECT 
        ma.employee_id,
        e.username as employee_name,
        e.department,
        ma.total_score as score,
        da.avg_score as team_avg
      FROM monthly_assessments ma
      JOIN employees e ON ma.employee_id = e.id
      JOIN department_avg da ON e.department = da.department
      WHERE TO_CHAR(ma.month, 'YYYY-MM') = $1
        AND ma.total_score < (da.avg_score * 0.7)
    `;

    const result = await dbQuery(sql, [targetMonth]);

    return result.map((row: any) => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      department: row.department,
      anomalyType: '低于团队平均',
      level: AnomalyLevel.INFO,
      description: `当前得分${row.score}分，低于团队平均${Math.round(row.team_avg * 10) / 10}分`,
      currentScore: parseFloat(row.score),
      teamAverage: parseFloat(row.team_avg),
      month: targetMonth,
      suggestions: [
        '了解是否需要额外培训或指导',
        '检查工作分配是否合理',
        '考虑与高绩效员工配对辅导'
      ]
    }));
  }

  /**
   * 检测异常高分（可能数据错误，>95分）
   */
  private async detectAbnormallyHigh(targetMonth: string): Promise<PerformanceAnomaly[]> {
    const { query: dbQuery } = await import('../config/database');

    const sql = `
      SELECT 
        ma.employee_id,
        e.username as employee_name,
        e.department,
        ma.total_score as score
      FROM monthly_assessments ma
      JOIN employees e ON ma.employee_id = e.id
      WHERE TO_CHAR(ma.month, 'YYYY-MM') = $1
        AND ma.total_score > 95
    `;

    const result = await dbQuery(sql, [targetMonth]);

    return result.map((row: any) => ({
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      department: row.department,
      anomalyType: '异常高分',
      level: AnomalyLevel.INFO,
      description: `得分${row.score}分，异常高分，建议核实数据准确性`,
      currentScore: parseFloat(row.score),
      month: targetMonth,
      suggestions: [
        '核实评分数据是否录入正确',
        '检查是否有评分标准偏差',
        '确认是否确实表现优异'
      ]
    }));
  }

  /**
   * 按异常等级排序
   */
  private sortByLevel(anomalies: PerformanceAnomaly[]): PerformanceAnomaly[] {
    const levelOrder = {
      [AnomalyLevel.ALERT]: 3,
      [AnomalyLevel.WARNING]: 2,
      [AnomalyLevel.INFO]: 1
    };

    return anomalies.sort((a, b) => levelOrder[b.level] - levelOrder[a.level]);
  }

  /**
   * 获取当前月份（YYYY-MM）
   */
  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * 获取异常统计
   */
  async getAnomalyStats(month?: string): Promise<{
    total: number;
    alerts: number;
    warnings: number;
    infos: number;
    byDepartment: Record<string, number>;
  }> {
    const anomalies = await this.detectAnomalies(month);

    const byDepartment: Record<string, number> = {};
    anomalies.forEach(a => {
      byDepartment[a.department] = (byDepartment[a.department] || 0) + 1;
    });

    return {
      total: anomalies.length,
      alerts: anomalies.filter(a => a.level === AnomalyLevel.ALERT).length,
      warnings: anomalies.filter(a => a.level === AnomalyLevel.WARNING).length,
      infos: anomalies.filter(a => a.level === AnomalyLevel.INFO).length,
      byDepartment
    };
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();
