import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AssessmentPublicationModel } from '../models/assessmentPublication.model';
import { formatPublicationReadinessMessage, validatePublicationReadiness } from '../services/publicationReadiness.service';

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
      const incompleteViolations = readiness.violations.filter((violation) => violation.type === 'incomplete');
      const forcedDistributionViolations = readiness.violations.filter((violation) => violation.type === 'forced_distribution');

      if (incompleteViolations.length > 0 || forcedDistributionViolations.length === 0 || forceDistribution !== true) {
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

    if (!readiness.ok) {
      return res.json({
        success: true,
        data: {
          ...publication,
          forceDistribution: true,
          forceReason,
          readiness,
        },
        message: `${month} 的考核结果已发布（已记录2-7-1豁免原因）`
      });
    }

    res.json({
      success: true,
      data: publication,
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

    res.json({
      success: true,
      message: `${month} 的发布已取消`
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
