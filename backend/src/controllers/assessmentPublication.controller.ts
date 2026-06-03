import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AssessmentPublicationModel } from '../models/assessmentPublication.model';
import { formatPublicationReadinessMessage, validatePublicationReadiness } from '../services/publicationReadiness.service';
import { ArchiveService } from '../services/archive.service';
import { NotificationModel } from '../models/notification.model';
import { PerformanceModel } from '../models/performance.model';
import { isScopeExcludedRecord } from '../utils/performanceScope';

export const assessmentPublicationController = {
  /**
   * 发布某月的考核结果（HR/Admin）
   */
  publish: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }

    const { month, forceDistribution } = req.body;
    const forceReason = typeof req.body.forceReason === 'string' ? req.body.forceReason.trim() : '';

    // 检查是否已发布
    const isPublished = await AssessmentPublicationModel.isPublished(month);
    if (isPublished) {
      return res.status(400).json({
        success: false,
        message: `${month} 的考核结果已发布，无法重复发布`
      });
    }

    const readiness = await validatePublicationReadiness(month);
    if (!readiness.ok) {
      const blockingViolations = readiness.violations.filter((violation) => violation.type !== 'forced_distribution');
      const forcedDistributionViolations = readiness.violations.filter((violation) => violation.type === 'forced_distribution');

      if (blockingViolations.length > 0 || forcedDistributionViolations.length === 0 || forceDistribution !== true) {
        return res.status(400).json({
          success: false,
          message: formatPublicationReadinessMessage(readiness),
          data: readiness
        });
      }

      if (forceReason.length < 10) {
        return res.status(400).json({
          success: false,
          message: '启用 2-7-1 豁免发布时，请填写不少于10个字的豁免原因',
          data: readiness
        });
      }
    }

    // 发布
    const publication = await AssessmentPublicationModel.publish(month, req.user.userId, readiness.ok ? {} : {
      forceDistribution: true,
      forceReason,
      readinessSnapshot: readiness,
    });

    let archiveResult: any = null;
    try {
      archiveResult = await ArchiveService.archiveMonth(month, req.user.userId);
    } catch (_error) {
      archiveResult = null;
    }

    const completedRecords = (await PerformanceModel.findByMonth(month))
      .filter((record: any) => (record.status === 'completed' || record.status === 'scored') && !isScopeExcludedRecord(record));
    await NotificationModel.createBatch(completedRecords.map((record: any) => ({
      userId: record.employeeId,
      type: 'system',
      title: `${month} 绩效结果已发布`,
      content: `${month} 绩效结果已正式发布，你可以在“我的绩效”中查看月度得分和排名。`,
      link: `/employee/dashboard?month=${month}`,
    })));

    if (!readiness.ok) {
      return res.json({
        success: true,
        data: {
          ...publication,
          forceDistribution: true,
          forceReason,
          readiness,
          archiveResult,
        },
        message: `${month} 的考核结果已发布（已记录2-7-1豁免原因）`
      });
    }

    res.json({
      success: true,
      data: { ...publication, archiveResult },
      message: `${month} 的考核结果已发布`
    });
  }),

  /**
   * 取消发布（仅用于测试或紧急回退）
   */
  unpublish: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }

    const month = req.params.month as string;

    const success = await AssessmentPublicationModel.unpublish(month);
    
    if (!success) {
      return res.status(404).json({
        success: false,
        message: `${month} 未发布或已取消`
      });
    }

    const deletedArchiveCount = await ArchiveService.deleteArchivesByMonth(month);
    const deletedNotificationCount = await NotificationModel.deletePerformanceRelated(month);

    res.json({
      success: true,
      message: `${month} 的发布已取消，已清理归档和相关通知`,
      data: { month, deletedArchiveCount, deletedNotificationCount }
    });
  }),

  /**
   * 检查某月是否已发布
   */
  checkPublished: asyncHandler(async (req: Request, res: Response) => {
    const month = req.params.month as string;

    const isPublished = await AssessmentPublicationModel.isPublished(month);
    const publication = isPublished 
      ? await AssessmentPublicationModel.getByMonth(month)
      : null;

    res.json({
      success: true,
      data: {
        month,
        isPublished,
        publication
      }
    });
  }),

  /**
   * 获取所有已发布的月份列表
   */
  getAllPublished: asyncHandler(async (req: Request, res: Response) => {
    const publications = await AssessmentPublicationModel.getAllPublished();

    res.json({
      success: true,
      data: publications
    });
  })
};
