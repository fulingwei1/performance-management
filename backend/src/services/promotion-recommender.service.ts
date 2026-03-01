/**
 * 晋升推荐服务
 * 基于综合评估推荐晋升候选人
 */

interface PromotionCandidate {
  employeeId: number;
  employeeName: string;
  department: string;
  currentPosition: string;
  score: number;
  metrics: {
    performanceScore: number;      // 绩效得分 (40%)
    goalCompletionRate: number;    // 目标完成率 (30%)
    peerReviewScore: number;       // 同事评价 (20%)
    tenure: number;                // 在岗时长/月 (10%)
  };
  recommendation: string;
  strengths: string[];
  concerns: string[];
}

interface WeightConfig {
  performance: number;    // 默认 0.4
  goalCompletion: number; // 默认 0.3
  peerReview: number;     // 默认 0.2
  tenure: number;         // 默认 0.1
}

const DEFAULT_WEIGHTS: WeightConfig = {
  performance: 0.4,
  goalCompletion: 0.3,
  peerReview: 0.2,
  tenure: 0.1
};

export class PromotionRecommenderService {
  /**
   * 获取晋升候选人列表
   */
  async getPromotionCandidates(
    departmentId?: number,
    limit: number = 10,
    weights: WeightConfig = DEFAULT_WEIGHTS
  ): Promise<PromotionCandidate[]> {
    const { query: dbQuery } = await import('../config/database');

    // 查询员工基础信息 + 绩效数据
    const sql = `
      WITH performance_avg AS (
        SELECT 
          employee_id,
          AVG(total_score) as avg_performance
        FROM monthly_assessments
        WHERE month >= NOW() - INTERVAL '6 months'
        GROUP BY employee_id
      ),
      goal_completion AS (
        SELECT 
          employee_id,
          COUNT(CASE WHEN progress >= 100 THEN 1 END)::FLOAT / NULLIF(COUNT(*), 0) * 100 as completion_rate
        FROM objectives
        WHERE year = EXTRACT(YEAR FROM CURRENT_DATE)
        GROUP BY employee_id
      ),
      peer_reviews AS (
        SELECT 
          reviewee_id as employee_id,
          AVG(rating) as avg_peer_score
        FROM peer_reviews
        WHERE created_at >= NOW() - INTERVAL '6 months'
        GROUP BY reviewee_id
      )
      SELECT 
        e.id,
        e.username as name,
        e.department,
        e.position,
        e.created_at,
        COALESCE(p.avg_performance, 0) as performance_score,
        COALESCE(g.completion_rate, 0) as goal_completion_rate,
        COALESCE(pr.avg_peer_score, 0) as peer_review_score,
        EXTRACT(MONTH FROM AGE(CURRENT_DATE, e.created_at)) as tenure_months
      FROM employees e
      LEFT JOIN performance_avg p ON e.id = p.employee_id
      LEFT JOIN goal_completion g ON e.id = g.employee_id
      LEFT JOIN peer_reviews pr ON e.id = pr.employee_id
      WHERE e.role != 'gm' AND e.role != 'hr'
        ${departmentId ? 'AND e.department_id = $1' : ''}
      ORDER BY COALESCE(p.avg_performance, 0) DESC
      LIMIT ${limit * 2}
    `;

    const params = departmentId ? [departmentId] : [];
    const result = await dbQuery(sql, params);

    // 计算综合得分
    const candidates = result.map((row: any) => {
      const metrics = {
        performanceScore: parseFloat(row.performance_score || '0'),
        goalCompletionRate: parseFloat(row.goal_completion_rate || '0'),
        peerReviewScore: parseFloat(row.peer_review_score || '0') * 20, // 转换为 0-100
        tenure: Math.min(parseFloat(row.tenure_months || '0'), 36) / 36 * 100 // 3年封顶
      };

      // 综合得分计算
      const score =
        metrics.performanceScore * weights.performance +
        metrics.goalCompletionRate * weights.goalCompletion +
        metrics.peerReviewScore * weights.peerReview +
        metrics.tenure * weights.tenure;

      // 生成推荐理由
      const { recommendation, strengths, concerns } = this.generateRecommendation(metrics, score);

      return {
        employeeId: row.id,
        employeeName: row.name,
        department: row.department,
        currentPosition: row.position,
        score: Math.round(score * 10) / 10,
        metrics,
        recommendation,
        strengths,
        concerns
      };
    });

    // 按得分排序并截取前 N 名
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  /**
   * 生成推荐理由
   */
  private generateRecommendation(
    metrics: PromotionCandidate['metrics'],
    score: number
  ): {
    recommendation: string;
    strengths: string[];
    concerns: string[];
  } {
    const strengths: string[] = [];
    const concerns: string[] = [];

    // 分析各项指标
    if (metrics.performanceScore >= 90) {
      strengths.push('绩效表现优异，连续高分');
    } else if (metrics.performanceScore >= 80) {
      strengths.push('绩效表现良好');
    } else if (metrics.performanceScore < 70) {
      concerns.push('绩效得分偏低，需提升');
    }

    if (metrics.goalCompletionRate >= 90) {
      strengths.push('目标执行力强，按时完成率高');
    } else if (metrics.goalCompletionRate < 70) {
      concerns.push('目标完成率有待提高');
    }

    if (metrics.peerReviewScore >= 80) {
      strengths.push('同事评价好，团队协作能力强');
    } else if (metrics.peerReviewScore < 60) {
      concerns.push('同事评价一般，需改善人际关系');
    }

    if (metrics.tenure >= 80) {
      strengths.push('在岗时间长，经验丰富');
    } else if (metrics.tenure < 40) {
      concerns.push('在岗时间较短，建议积累更多经验');
    }

    // 综合推荐
    let recommendation = '';
    if (score >= 85) {
      recommendation = '强烈推荐晋升';
    } else if (score >= 75) {
      recommendation = '推荐晋升';
    } else if (score >= 65) {
      recommendation = '可考虑晋升，但需关注改进点';
    } else {
      recommendation = '暂不推荐晋升，需继续培养';
    }

    return { recommendation, strengths, concerns };
  }

  /**
   * 获取部门晋升候选人统计
   */
  async getDepartmentPromotionStats(departmentId: number): Promise<{
    totalCandidates: number;
    stronglyRecommended: number;
    recommended: number;
    underConsideration: number;
    avgScore: number;
  }> {
    const candidates = await this.getPromotionCandidates(departmentId, 100);

    const stronglyRecommended = candidates.filter(c => c.score >= 85).length;
    const recommended = candidates.filter(c => c.score >= 75 && c.score < 85).length;
    const underConsideration = candidates.filter(c => c.score >= 65 && c.score < 75).length;

    const avgScore = candidates.length > 0
      ? candidates.reduce((sum, c) => sum + c.score, 0) / candidates.length
      : 0;

    return {
      totalCandidates: candidates.length,
      stronglyRecommended,
      recommended,
      underConsideration,
      avgScore: Math.round(avgScore * 10) / 10
    };
  }
}

export const promotionRecommenderService = new PromotionRecommenderService();
