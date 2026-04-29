/**
 * 绩效归档服务
 * 将已完成的月度绩效数据快照归档，保留完整评分、排名、统计
 */

import { v4 as uuidv4 } from 'uuid';
import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { PerformanceModel } from '../models/performance.model';
import { AssessmentPublicationModel } from '../models/assessmentPublication.model';
import { getMonthlyStats, getScoreDistribution, detectAnomalousScores } from './assessmentStats.service';
import { getPerformanceRankingConfig } from './performanceRankingConfig.service';
import logger from '../config/logger';

export interface ArchiveResult {
  id: string;
  month: string;
  totalRecords: number;
  completedRecords: number;
  stats: Record<string, any>;
  archivedAt: string;
}

export interface ArchiveQueryResult {
  id: string;
  month: string;
  snapshotSummary: Record<string, any>;
  archivedAt: Date | string;
  archivedBy?: string;
  recordCount: number;
}

export class ArchiveService {
  /**
   * 归档指定月份的绩效数据
   */
  static async archiveMonth(month: string, archivedBy?: string): Promise<ArchiveResult> {
    logger.info(`[Archive] 开始归档 ${month} 月度绩效数据`);

    // 获取所有绩效记录
    const records = await PerformanceModel.findByMonth(month);
    const completedRecords = records.filter(r => r.status === 'completed' || r.status === 'scored');

    if (completedRecords.length === 0) {
      throw new Error(`${month} 暂无已完成的绩效记录，无法归档`);
    }

    // 获取统计信息
    let stats: Record<string, any> = {};
    try {
      const monthlyStats = await getMonthlyStats(month);
      const distribution = await getScoreDistribution(month);
      const anomalies = await detectAnomalousScores();

      stats = {
        monthlyStats: {
          totalAssessments: monthlyStats.totalAssessments,
          avgScore: monthlyStats.avgScore,
          maxScore: monthlyStats.maxScore,
          minScore: monthlyStats.minScore,
          levelDistribution: {
            L5: monthlyStats.l5Count,
            L4: monthlyStats.l4Count,
            L3: monthlyStats.l3Count,
            L2: monthlyStats.l2Count,
            L1: monthlyStats.l1Count
          }
        },
        scoreDistribution: distribution,
        anomalies: anomalies || []
      };
    } catch (err) {
      logger.warn(`[Archive] 统计信息生成失败: ${err}`);
    }

    // 构建归档数据
    const archiveData = {
      records: completedRecords.map(r => ({
        id: r.id,
        employeeId: r.employeeId,
        employeeName: r.employeeName,
        department: r.department,
        subDepartment: r.subDepartment,
        employeeLevel: r.employeeLevel,
        assessorId: r.assessorId,
        assessorName: r.assessorName,
        month: r.month,
        selfSummary: r.selfSummary,
        nextMonthPlan: r.nextMonthPlan,
        taskCompletion: r.taskCompletion,
        initiative: r.initiative,
        projectFeedback: r.projectFeedback,
        qualityImprovement: r.qualityImprovement,
        totalScore: r.totalScore,
        level: r.level,
        normalizedScore: r.normalizedScore,
        managerComment: r.managerComment,
        nextMonthWorkArrangement: r.nextMonthWorkArrangement,
        groupType: r.groupType,
        groupRank: r.groupRank,
        crossDeptRank: r.crossDeptRank,
        departmentRank: r.departmentRank,
        companyRank: r.companyRank
      })),
      config: await getPerformanceRankingConfig().catch(() => ({})),
      stats
    };

    const snapshotSummary = {
      totalRecords: records.length,
      completedRecords: completedRecords.length,
      avgScore: stats.monthlyStats?.avgScore || 0,
      departments: new Set(completedRecords.map(r => r.department)).size
    };

    const id = uuidv4();

    // 写入数据库
    if (USE_MEMORY_DB) {
      if (!memoryStore.performanceArchives) {
        (memoryStore as any).performanceArchives = new Map();
      }
      (memoryStore as any).performanceArchives.set(id, {
        id,
        month,
        archiveData,
        snapshotSummary,
        archivedAt: new Date().toISOString(),
        archivedBy
      });
    } else {
      const sql = `
        INSERT INTO performance_archives 
        (id, month, archive_data, snapshot_summary, archived_by, archived_at, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      `;
      await query(sql, [
        id,
        month,
        JSON.stringify(archiveData),
        JSON.stringify(snapshotSummary),
        archivedBy || null
      ]);
    }

    logger.info(`[Archive] ${month} 归档完成: ${completedRecords.length} 条记录`);

    return {
      id,
      month,
      totalRecords: records.length,
      completedRecords: completedRecords.length,
      stats,
      archivedAt: new Date().toISOString()
    };
  }

  /**
   * 查询归档列表
   */
  static async listArchives(): Promise<ArchiveQueryResult[]> {
    if (USE_MEMORY_DB) {
      const archives = ((memoryStore as any).performanceArchives as Map<string, any>) || new Map();
      return Array.from(archives.values()).map((a: any) => ({
        id: a.id,
        month: a.month,
        snapshotSummary: a.snapshotSummary,
        archivedAt: a.archivedAt,
        archivedBy: a.archivedBy,
        recordCount: a.archiveData?.records?.length || 0
      })).sort((a: any, b: any) => (b.month > a.month ? 1 : -1));
    }

    const sql = `
      SELECT id, month, snapshot_summary as "snapshotSummary", 
             archived_at as "archivedAt", archived_by as "archivedBy"
      FROM performance_archives
      ORDER BY month DESC
    `;
    const results = await query(sql, []);
    return results.map(r => ({
      id: r.id,
      month: r.month,
      snapshotSummary: typeof r.snapshotSummary === 'string' ? JSON.parse(r.snapshotSummary) : r.snapshotSummary,
      archivedAt: r.archivedAt,
      archivedBy: r.archivedBy,
      recordCount: (r.snapshotSummary?.completedRecords as number) || 0
    }));
  }

  /**
   * 获取指定月份归档详情
   */
  static async getArchiveByMonth(month: string): Promise<any | null> {
    if (USE_MEMORY_DB) {
      const archives = ((memoryStore as any).performanceArchives as Map<string, any>) || new Map();
      for (const a of archives.values()) {
        if (a.month === month) return a;
      }
      return null;
    }

    const sql = `
      SELECT * FROM performance_archives WHERE month = $1
    `;
    const results = await query(sql, [month]);
    if (results.length === 0) return null;

    const r = results[0];
    return {
      id: r.id,
      month: r.month,
      archiveData: typeof r.archive_data === 'string' ? JSON.parse(r.archive_data) : r.archive_data,
      snapshotSummary: typeof r.snapshot_summary === 'string' ? JSON.parse(r.snapshot_summary) : r.snapshot_summary,
      archivedAt: r.archived_at,
      archivedBy: r.archived_by
    };
  }

  /**
   * 检查某月是否已归档
   */
  static async isArchived(month: string): Promise<boolean> {
    return !!(await this.getArchiveByMonth(month));
  }
}
