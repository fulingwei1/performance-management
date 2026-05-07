import { Request, Response } from 'express';
import {
  type AssessmentScopeConfig
} from '../config/assessment-scope-store';
import {
  getPerformanceRankingConfig,
  savePerformanceRankingConfig,
  type PerformanceRankingConfigV1,
} from '../services/performanceRankingConfig.service';

function toAssessmentScope(config: PerformanceRankingConfigV1): AssessmentScopeConfig & {
  mode: PerformanceRankingConfigV1['participation']['mode'];
  includedUnitKeys: string[];
  excludedUnitKeys: string[];
  includedEmployeeIds: string[];
  excludedEmployeeIds: string[];
  source: 'performance_ranking_config';
} {
  const rootDepts: string[] = [];
  const subDeptsByRoot: Record<string, string[]> = {};

  for (const key of config.participation.includedUnitKeys || []) {
    const [root, ...rest] = String(key || '').split('/').map((part) => part.trim()).filter(Boolean);
    if (!root) continue;
    const sub = rest.join('/');
    if (!sub) {
      rootDepts.push(root);
    } else {
      if (!subDeptsByRoot[root]) subDeptsByRoot[root] = [];
      subDeptsByRoot[root].push(sub);
    }
  }

  return {
    rootDepts: Array.from(new Set(rootDepts)),
    subDeptsByRoot: Object.fromEntries(
      Object.entries(subDeptsByRoot).map(([root, subs]) => [root, Array.from(new Set(subs))])
    ),
    mode: config.participation.mode,
    includedUnitKeys: config.participation.includedUnitKeys || [],
    excludedUnitKeys: config.participation.excludedUnitKeys || [],
    includedEmployeeIds: config.participation.includedEmployeeIds || [],
    excludedEmployeeIds: config.participation.excludedEmployeeIds || [],
    source: 'performance_ranking_config',
  };
}

function scopeToIncludedUnitKeys(scope: AssessmentScopeConfig): string[] {
  const keys = new Set<string>();
  (scope.rootDepts || []).map((dept) => String(dept || '').trim()).filter(Boolean).forEach((dept) => keys.add(dept));
  Object.entries(scope.subDeptsByRoot || {}).forEach(([root, subs]) => {
    const normalizedRoot = String(root || '').trim();
    if (!normalizedRoot) return;
    (subs || []).map((sub) => String(sub || '').trim()).filter(Boolean).forEach((sub) => keys.add(`${normalizedRoot}/${sub}`));
  });
  return Array.from(keys);
}

export const settingsController = {
  listSettings: async (_req: Request, res: Response) => {
    try {
      const rankingConfig = await getPerformanceRankingConfig();
      res.json({
        success: true,
        data: {
          assessmentScope: toAssessmentScope(rankingConfig),
          performanceRankingConfig: rankingConfig,
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  getAssessmentScope: async (_req: Request, res: Response) => {
    try {
      const rankingConfig = await getPerformanceRankingConfig();
      res.json({ success: true, data: toAssessmentScope(rankingConfig) });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },

  updateAssessmentScope: async (req: Request, res: Response) => {
    try {
      const body = req.body as AssessmentScopeConfig;
      const rootDepts = Array.isArray(body.rootDepts) ? body.rootDepts : [];
      const subDeptsByRoot =
        body.subDeptsByRoot && typeof body.subDeptsByRoot === 'object'
          ? body.subDeptsByRoot
          : {};
      const current = await getPerformanceRankingConfig();
      const includedUnitKeys = scopeToIncludedUnitKeys({ rootDepts, subDeptsByRoot });
      const updated = await savePerformanceRankingConfig({
        ...current,
        participation: {
          ...current.participation,
          mode: includedUnitKeys.length > 0 ? 'include' : 'exclude',
          enabledUnitKeys: includedUnitKeys,
          includedUnitKeys,
        },
      }, (req as any).user?.userId || (req as any).user?.id);
      res.json({ success: true, data: toAssessmentScope(updated), message: '考核范围已更新' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  },
};
