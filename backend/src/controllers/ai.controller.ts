import { Request, Response } from 'express';
import { aiPredictionService } from '../services/ai-prediction.service';
// HIDDEN: import { promotionRecommenderService } from '../services/promotion-recommender.service';
import { anomalyDetectionService } from '../services/anomaly-detection.service';
import { generateAISuggestion, prompts } from '../services/ai.service';

const parseQuarterlySummaryVersions = (content?: string): string[] => {
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed?.versions)) {
      return parsed.versions.filter((version: unknown): version is string => typeof version === 'string');
    }
  } catch {
    // AI 可能返回非严格 JSON，下面尝试从文本中提取 JSON 对象。
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed?.versions)) {
        return parsed.versions.filter((version: unknown): version is string => typeof version === 'string');
      }
    } catch {
      // 保底返回原文。
    }
  }

  return [content];
};

/**
 * AI 生成经理季度总结
 */
export const generateQuarterlySummary = async (req: Request, res: Response) => {
  try {
    const {
      managerName,
      department,
      quarter,
      teamSize,
      avgScore,
      topPerformers = [],
      keyProjects = []
    } = req.body;

    if (!managerName || !department || !quarter || typeof teamSize !== 'number') {
      return res.status(400).json({
        success: false,
        message: '缺少季度总结生成所需参数'
      });
    }

    const promptRequest = prompts.quarterlySummary({
      managerName,
      department,
      quarter,
      teamSize,
      avgScore,
      topPerformers,
      keyProjects
    });

    const aiResult = await generateAISuggestion({
      prompt: promptRequest.prompt,
      systemPrompt: promptRequest.systemPrompt,
      maxTokens: 2000,
      temperature: 0.7
    });

    if (!aiResult.success) {
      return res.status(502).json({
        success: false,
        message: aiResult.error || 'AI季度总结生成失败'
      });
    }

    res.json({
      success: true,
      data: {
        versions: parseQuarterlySummaryVersions(aiResult.content)
      },
      provider: aiResult.provider,
      usage: aiResult.usage
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || 'AI季度总结生成失败'
    });
  }
};

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
    res.json({
      success: true,
      data: [],
      message: '晋升推荐服务待实现'
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

    res.json({
      success: true,
      data: {},
      message: '晋升统计服务待实现'
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

// ====== 以下为新增 AI 端点 ======

/** 通用 AI 调用处理器 */
async function handleAIPrompt(req: Request, res: Response, promptFn: (data: any) => { prompt: string; systemPrompt?: string }) {
  try {
    const promptRequest = promptFn(req.body);
    const aiResult = await generateAISuggestion({
      prompt: promptRequest.prompt,
      systemPrompt: promptRequest.systemPrompt,
      maxTokens: 2000,
      temperature: 0.7
    });
    if (!aiResult.success) {
      return res.status(502).json({ success: false, message: aiResult.error || 'AI 生成失败' });
    }
    res.json({ success: true, data: { content: aiResult.content }, provider: aiResult.provider, usage: aiResult.usage });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message || 'AI 生成失败' });
  }
}

/**
 * POST /ai/goal-decomposition
 */
export const generateGoalDecomposition = async (req: Request, res: Response) => {
  await handleAIPrompt(req, res, prompts.goalDecomposition);
};

/**
 * POST /ai/company-strategy
 */
export const generateCompanyStrategy = async (req: Request, res: Response) => {
  await handleAIPrompt(req, res, prompts.companyStrategy);
};

/**
 * POST /ai/company-key-works
 */
export const generateCompanyKeyWorks = async (req: Request, res: Response) => {
  await handleAIPrompt(req, res, prompts.companyKeyWorks);
};

/**
 * POST /ai/department-key-works
 */
export const generateDepartmentKeyWorks = async (req: Request, res: Response) => {
  await handleAIPrompt(req, res, prompts.departmentKeyWorks);
};

/**
 * POST /ai/goal-confirmation-feedback
 */
export const generateGoalConfirmationFeedback = async (req: Request, res: Response) => {
  await handleAIPrompt(req, res, prompts.goalConfirmationFeedback);
};

/**
 * POST /ai/goal-progress-comment
 */
export const generateGoalProgressComment = async (req: Request, res: Response) => {
  await handleAIPrompt(req, res, prompts.goalProgressComment);
};

/**
 * POST /ai/self-summary
 */
export const generateSelfSummary = async (req: Request, res: Response) => {
  await handleAIPrompt(req, res, prompts.employeeSelfSummary);
};

/**
 * POST /ai/next-month-plan
 */
export const generateNextMonthPlan = async (req: Request, res: Response) => {
  await handleAIPrompt(req, res, prompts.employeeNextMonthPlan);
};

/**
 * POST /ai/manager-comment
 */
export const generateManagerComment = async (req: Request, res: Response) => {
  await handleAIPrompt(req, res, prompts.managerComment);
};

/**
 * POST /ai/work-arrangement
 */
export const generateWorkArrangement = async (req: Request, res: Response) => {
  await handleAIPrompt(req, res, prompts.managerWorkArrangement);
};
