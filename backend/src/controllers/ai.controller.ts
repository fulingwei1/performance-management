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

    const result = await aiPredictionService.predictPerformance(
      parseInt(employeeId),
      parseInt(months)
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
      departmentId ? parseInt(departmentId as string) : undefined,
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
      parseInt(departmentId, 10)
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
