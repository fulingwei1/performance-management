/**
 * 差异化考核统计服务
 * 提供各种统计分析功能
 */

import { MonthlyAssessmentModel } from '../models/monthlyAssessment.model';
import { AssessmentTemplateModel } from '../models/assessmentTemplate.model';
import logger from '../config/logger';

interface DepartmentStats {
  departmentType: string;
  templateCount: number;
  metricCount: number;
  avgMetricsPerTemplate: number;
  activeCount: number;
}

interface MonthlyStats {
  month: string;
  totalAssessments: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
  l5Count: number;
  l4Count: number;
  l3Count: number;
  l2Count: number;
  l1Count: number;
}

interface EmployeePerformance {
  employeeId: string;
  employeeName?: string;
  avgScore: number;
  trend: 'up' | 'down' | 'stable';
  recentScores: number[];
  assessmentCount: number;
}

/**
 * 获取部门类型统计
 */
export async function getDepartmentTypeStats(): Promise<DepartmentStats[]> {
  try {
    const templates = await AssessmentTemplateModel.findAll();
    
    const statsMap: Map<string, DepartmentStats> = new Map();
    
    templates.forEach(template => {
      if (!statsMap.has(template.departmentType)) {
        statsMap.set(template.departmentType, {
          departmentType: template.departmentType,
          templateCount: 0,
          metricCount: 0,
          avgMetricsPerTemplate: 0,
          activeCount: 0
        });
      }
      
      const stats = statsMap.get(template.departmentType)!;
      stats.templateCount++;
      stats.metricCount += template.metrics?.length || 0;
      if (template.status === 'active') stats.activeCount++;
    });
    
    // 计算平均值
    statsMap.forEach(stats => {
      stats.avgMetricsPerTemplate = stats.templateCount > 0
        ? parseFloat((stats.metricCount / stats.templateCount).toFixed(1))
        : 0;
    });
    
    return Array.from(statsMap.values());
  } catch (error) {
    logger.error('Failed to get department stats: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}

/**
 * 获取月度统计
 */
export async function getMonthlyStats(month: string): Promise<MonthlyStats | null> {
  try {
    // 这里需要实现获取指定月份所有评分的逻辑
    // 由于当前 MonthlyAssessmentModel 没有 findByMonth 方法，
    // 这里预留接口，实际使用时需要扩展 Model
    
    logger.info(`Getting monthly stats for ${month}`);
    
    // 临时返回 null，待实现
    return null;
  } catch (error) {
    logger.error('Failed to get monthly stats: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}

/**
 * 获取员工绩效趋势
 */
export async function getEmployeePerformanceTrend(employeeId: string): Promise<EmployeePerformance | null> {
  try {
    const assessments = await MonthlyAssessmentModel.findByEmployee(employeeId);
    
    if (assessments.length === 0) {
      return null;
    }
    
    const scores = assessments.map(a => a.totalScore);
    const avgScore = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    
    // 计算趋势（最近3次）
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (scores.length >= 3) {
      const recent3 = scores.slice(-3);
      const avgRecent = recent3.reduce((sum, s) => sum + s, 0) / 3;
      const avgEarlier = scores.slice(0, -3).reduce((sum, s) => sum + s, 0) / (scores.length - 3);
      
      if (avgRecent > avgEarlier + 0.1) trend = 'up';
      else if (avgRecent < avgEarlier - 0.1) trend = 'down';
    }
    
    return {
      employeeId,
      employeeName: assessments[0].employeeName,
      avgScore: parseFloat(avgScore.toFixed(2)),
      trend,
      recentScores: scores.slice(-6), // 最近6次
      assessmentCount: assessments.length
    };
  } catch (error) {
    logger.error('Failed to get employee performance trend: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}

/**
 * 获取评分分布统计
 */
export async function getScoreDistribution(month?: string): Promise<Record<string, number>> {
  try {
    // 预留接口，需要扩展 Model 支持批量查询
    logger.info(`Getting score distribution for ${month || 'all months'}`);
    
    return {
      l5: 0,
      l4: 0,
      l3: 0,
      l2: 0,
      l1: 0
    };
  } catch (error) {
    logger.error('Failed to get score distribution: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}

/**
 * 检测异常评分
 * 识别与历史平均偏差过大的评分
 */
export async function detectAnomalousScores(threshold: number = 0.3): Promise<any[]> {
  try {
    // 预留接口，用于检测异常评分
    logger.info(`Detecting anomalous scores with threshold ${threshold}`);
    
    return [];
  } catch (error) {
    logger.error('Failed to detect anomalous scores: ' + (error instanceof Error ? error.message : String(error)));
    throw error;
  }
}
