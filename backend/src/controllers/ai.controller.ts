import { Request, Response } from 'express';
import { aiPredictionService } from '../services/ai-prediction.service';
import { promotionRecommenderService } from '../services/promotion-recommender.service';
import { anomalyDetectionService } from '../services/anomaly-detection.service';

/**
 * AI 预测控制器
 */
export const predictPerformance = async (req: Request, res: Response) => {
  try {
    const { employeeId, months = 3 } = req.body;

    if (!employeeId) {
      return res.status(400).json({ message: '缺少员工ID' });
    }

    const parsedMonths = Number(months);
    if (!Number.isFinite(parsedMonths) || parsedMonths < 1) {
      return res.status(400).json({ message: '预测月份必须是大于 0 的数字' });
    }

    const result = await aiPredictionService.predictPerformance(
      String(employeeId),
      parsedMonths
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || '预测失败'
    });
  }
};

/**
 * 获取晋升候选人
 */
export const getPromotionCandidates = async (req: Request, res: Response) => {
  try {
    const { departmentId, limit = 10 } = req.query;

    const candidates = await promotionRecommenderService.getPromotionCandidates(
      typeof departmentId === 'string' ? departmentId : undefined,
      parseInt(limit as string)
    );

    res.json({
      success: true,
      data: candidates
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || '获取候选人失败'
    });
  }
};

/**
 * 获取部门晋升统计
 */
export const getDepartmentPromotionStats = async (req: Request, res: Response) => {
  try {
    const departmentId = req.params.departmentId as string;

    if (!departmentId) {
      return res.status(400).json({ message: '缺少部门ID' });
    }

    const stats = await promotionRecommenderService.getDepartmentPromotionStats(
      departmentId
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || '获取统计失败'
    });
  }
};

/**
 * 获取绩效异常列表
 */
export const getPerformanceAnomalies = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;

    const anomalies = await anomalyDetectionService.detectAnomalies(
      typeof month === 'string' ? month : undefined
    );

    res.json({
      success: true,
      data: anomalies
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || '检测异常失败'
    });
  }
};

/**
 * 获取异常统计
 */
export const getAnomalyStats = async (req: Request, res: Response) => {
  try {
    const { month } = req.query;

    const stats = await anomalyDetectionService.getAnomalyStats(
      typeof month === 'string' ? month : undefined
    );

    res.json({
      success: true,
      data: stats
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || '获取异常统计失败'
    });
  }
};

/**
 * 获取预测风险预警
 */
export const getPredictionAlerts = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: '未认证' });
    }

    const parsedMonths = Number(req.query.months ?? 3);
    const parsedLimit = Number(req.query.limit ?? 5);

    if (!Number.isFinite(parsedMonths) || parsedMonths < 1) {
      return res.status(400).json({ success: false, message: '预测月份必须是大于 0 的数字' });
    }

    if (!Number.isFinite(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({ success: false, message: '返回数量必须是大于 0 的数字' });
    }

    const alerts = await aiPredictionService.getPredictionAlerts({
      viewerRole: req.user.role,
      viewerId: req.user.userId,
      monthsToPredict: parsedMonths,
      limit: parsedLimit
    });

    res.json({
      success: true,
      data: alerts
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || '获取预测风险失败'
    });
  }
};
