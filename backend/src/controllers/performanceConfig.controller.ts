import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { PerformanceModel } from '../models/performance.model';
import logger from '../config/logger';
import {
  getPerformanceRankingConfig,
  savePerformanceRankingConfig,
  isParticipatingRecord,
  resolveGroupKey,
  matchMergeRankGroup,
  getOrgUnitKey,
} from '../services/performanceRankingConfig.service';

export const performanceConfigController = {
  // 获取当前配置（HR/Admin）
  getRankingConfig: asyncHandler(async (_req: Request, res: Response) => {
    const config = await getPerformanceRankingConfig();
    res.json({ success: true, data: config });
  }),

  // 更新配置（HR/Admin）
  updateRankingConfig: asyncHandler(async (req: Request, res: Response) => {
    const user = (req as any).user as { userId?: string; id?: string } | undefined;
    const updatedBy = user?.userId || user?.id;
    const saved = await savePerformanceRankingConfig(req.body, updatedBy);
    res.json({ success: true, data: saved, message: '配置已保存' });
  }),

  // 预览某月分组情况（HR/Admin）
  previewMonth: asyncHandler(async (req: Request, res: Response) => {
    const month = String(req.query.month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'month 格式应为 YYYY-MM' });
    }

    const config = await getPerformanceRankingConfig();
    const records = await PerformanceModel.findByMonth(month);
    const completed = records.filter((r) => r.status === 'completed');

    const participation = {
      included: 0,
      excluded: 0,
      excludedUnits: new Map<string, number>(),
    };

    const groupCounts = new Map<string, number>();
    const unitCounts = new Map<string, number>();
    const mergeCounts = new Map<string, number>();

    for (const record of completed) {
      const unitKey = getOrgUnitKey(record);
      unitCounts.set(unitKey, (unitCounts.get(unitKey) || 0) + 1);

      if (!isParticipatingRecord(record, config)) {
        participation.excluded += 1;
        participation.excludedUnits.set(unitKey, (participation.excludedUnits.get(unitKey) || 0) + 1);
        continue;
      }

      participation.included += 1;

      const groupKey = resolveGroupKey(record, config);
      groupCounts.set(groupKey, (groupCounts.get(groupKey) || 0) + 1);

      const merge = matchMergeRankGroup(record, config);
      if (merge) {
        mergeCounts.set(merge.id, (mergeCounts.get(merge.id) || 0) + 1);
      }
    }

    const sortMap = (m: Map<string, number>) =>
      Array.from(m.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([k, v]) => ({ key: k, count: v }));

    const mergeGroups = (config.mergeRankGroups || []).map((g) => ({
      id: g.id,
      name: g.name,
      enabled: g.enabled,
      count: mergeCounts.get(g.id) || 0,
    }));

    logger.info(`[ranking-config] preview ${month}: completed=${completed.length}, included=${participation.included}, excluded=${participation.excluded}`);

    res.json({
      success: true,
      data: {
        month,
        completedCount: completed.length,
        includedCount: participation.included,
        excludedCount: participation.excluded,
        excludedUnits: sortMap(participation.excludedUnits),
        units: sortMap(unitCounts),
        groups: sortMap(groupCounts),
        mergeGroups,
      },
    });
  }),

  // 重新计算某月排名（HR/Admin）
  recalculateMonthRanks: asyncHandler(async (req: Request, res: Response) => {
    const month = String((req.body as any)?.month || (req.query as any)?.month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: 'month 格式应为 YYYY-MM' });
    }

    await PerformanceModel.updateRanks(month);
    res.json({ success: true, data: { month }, message: '排名已重新计算' });
  }),
};
