import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AssessmentPublicationModel } from '../models/assessmentPublication.model';

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

    const { month } = req.body;

    // 检查是否已发布
    const isPublished = await AssessmentPublicationModel.isPublished(month);
    if (isPublished) {
      return res.status(400).json({
        success: false,
        message: `${month} 的考核结果已发布，无法重复发布`
      });
    }

    // 发布
    const publication = await AssessmentPublicationModel.publish(month, req.user.userId);

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

    const { month } = req.params;

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
    const { month } = req.params;

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
