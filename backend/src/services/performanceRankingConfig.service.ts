import { z } from 'zod';
import logger from '../config/logger';
import { SystemSettingsModel } from '../models/systemSettings.model';
import { EmployeeLevel, PerformanceRecord } from '../types';

export type LevelGroupingStrategyType = 'all' | 'by_level' | 'by_high_low' | 'custom';

export interface CustomLevelGroup {
  name: string;
  levels: EmployeeLevel[];
}

export interface LevelGroupingStrategy {
  type: LevelGroupingStrategyType;
  groups?: CustomLevelGroup[];
}

export interface MergeRankGroup {
  id: string;
  name: string;
  enabled: boolean;
  unitKeys: string[]; // e.g. ["工程技术中心/测试部", "制造中心"] (支持前缀匹配)
  levels: EmployeeLevel[]; // empty => all levels
}

export interface PerformanceRankingConfigV1 {
  version: 1;
  participation: {
    enabledUnitKeys: string[]; // empty => all units
  };
  groupRank: {
    defaultStrategy: LevelGroupingStrategy;
    perUnit: Record<string, LevelGroupingStrategy>;
  };
  mergeRankGroups: MergeRankGroup[]; // 用于 crossDeptRank（按顺序匹配，先命中优先）
}

const SETTING_KEY = 'performance_ranking_config';

const employeeLevelSchema = z.enum(['senior', 'intermediate', 'junior', 'assistant']);

const levelGroupingStrategySchema: z.ZodType<LevelGroupingStrategy> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('all') }),
  z.object({ type: z.literal('by_level') }),
  z.object({ type: z.literal('by_high_low') }),
  z.object({
    type: z.literal('custom'),
    groups: z
      .array(
        z.object({
          name: z.string().min(1),
          levels: z.array(employeeLevelSchema).min(1),
        })
      )
      .min(1),
  }),
]) as any;

const mergeRankGroupSchema: z.ZodType<MergeRankGroup> = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  enabled: z.boolean().default(true),
  unitKeys: z.array(z.string()).default([]),
  levels: z.array(employeeLevelSchema).default([]),
});

const configSchema: z.ZodType<PerformanceRankingConfigV1> = z.object({
  version: z.literal(1),
  participation: z
    .object({
      enabledUnitKeys: z.array(z.string()).default([]),
    })
    .default({ enabledUnitKeys: [] }),
  groupRank: z
    .object({
      defaultStrategy: levelGroupingStrategySchema.default({ type: 'by_high_low' }),
      perUnit: z.record(z.string(), levelGroupingStrategySchema).default({}),
    })
    .default({ defaultStrategy: { type: 'by_high_low' }, perUnit: {} }),
  mergeRankGroups: z.array(mergeRankGroupSchema).default([]),
});

export function buildDefaultPerformanceRankingConfig(): PerformanceRankingConfigV1 {
  return {
    version: 1,
    participation: {
      enabledUnitKeys: [],
    },
    groupRank: {
      defaultStrategy: { type: 'by_high_low' },
      perUnit: {},
    },
    mergeRankGroups: [],
  };
}

export async function getPerformanceRankingConfig(): Promise<PerformanceRankingConfigV1> {
  try {
    const raw = await SystemSettingsModel.getValue(SETTING_KEY);
    if (!raw) return buildDefaultPerformanceRankingConfig();

    const parsed = configSchema.safeParse(raw);
    if (parsed.success) return parsed.data;

    logger.warn(`[ranking-config] invalid config, fallback to default: ${parsed.error.message}`);
    return buildDefaultPerformanceRankingConfig();
  } catch (error: any) {
    logger.error(`[ranking-config] load failed, fallback to default: ${error?.message || error}`);
    return buildDefaultPerformanceRankingConfig();
  }
}

export async function savePerformanceRankingConfig(
  config: unknown,
  updatedBy?: string
): Promise<PerformanceRankingConfigV1> {
  const parsed = configSchema.safeParse(config);
  if (!parsed.success) {
    const message = parsed.error.issues?.[0]?.message || '配置格式错误';
    throw new Error(message);
  }

  const normalized = parsed.data;
  const existing = await SystemSettingsModel.getByKey(SETTING_KEY);

  if (existing) {
    await SystemSettingsModel.update(SETTING_KEY, JSON.stringify(normalized), updatedBy);
  } else {
    await SystemSettingsModel.create({
      settingKey: SETTING_KEY,
      settingValue: JSON.stringify(normalized),
      settingType: 'json',
      category: 'performance',
      description: '绩效参与范围与排名规则配置',
      isPublic: false,
      updatedBy,
    });
  }

  return normalized;
}

export function getOrgUnitKey(input: { department?: string; subDepartment?: string }): string {
  const dept = String(input.department || '').trim();
  const sub = String(input.subDepartment || '').trim();
  if (dept && sub) return `${dept}/${sub}`;
  return dept || sub;
}

function matchesUnitKey(unitKey: string, configuredUnitKeys: string[]): boolean {
  if (!configuredUnitKeys || configuredUnitKeys.length === 0) return true;
  if (configuredUnitKeys.includes(unitKey)) return true;

  // 支持用一级部门作为前缀匹配（例如 "工程技术中心" 匹配 "工程技术中心/测试部"）
  const slashIdx = unitKey.indexOf('/');
  const deptPrefix = slashIdx >= 0 ? unitKey.slice(0, slashIdx) : unitKey;
  if (deptPrefix && configuredUnitKeys.includes(deptPrefix)) return true;

  return false;
}

export function isParticipatingRecord(record: Pick<PerformanceRecord, 'department' | 'subDepartment'>, config: PerformanceRankingConfigV1): boolean {
  const unitKey = getOrgUnitKey(record);
  return matchesUnitKey(unitKey, config.participation.enabledUnitKeys);
}

export function resolveGroupName(level: EmployeeLevel | undefined, strategy: LevelGroupingStrategy): string {
  const safeLevel = level || 'junior';

  switch (strategy.type) {
    case 'all':
      return 'all';
    case 'by_level':
      return safeLevel;
    case 'by_high_low':
      return safeLevel === 'senior' || safeLevel === 'intermediate' ? 'high' : 'low';
    case 'custom': {
      const groups = strategy.groups || [];
      const match = groups.find((g) => (g.levels || []).includes(safeLevel));
      return match?.name || 'other';
    }
    default:
      return 'by_high_low';
  }
}

export function resolveGroupKey(record: Pick<PerformanceRecord, 'department' | 'subDepartment' | 'employeeLevel'>, config: PerformanceRankingConfigV1): string {
  const unitKey = getOrgUnitKey(record);
  const perUnit = config.groupRank.perUnit || {};
  const slashIdx = unitKey.indexOf('/');
  const deptPrefix = slashIdx >= 0 ? unitKey.slice(0, slashIdx) : unitKey;
  const strategy =
    perUnit[unitKey] ||
    (deptPrefix ? perUnit[deptPrefix] : undefined) ||
    config.groupRank.defaultStrategy ||
    { type: 'by_high_low' };
  const groupName = resolveGroupName(record.employeeLevel, strategy);
  return `${unitKey}::${groupName}`;
}

export function matchMergeRankGroup(record: Pick<PerformanceRecord, 'department' | 'subDepartment' | 'employeeLevel'>, config: PerformanceRankingConfigV1): MergeRankGroup | null {
  const unitKey = getOrgUnitKey(record);
  const level = record.employeeLevel || 'junior';

  for (const group of config.mergeRankGroups || []) {
    if (!group?.enabled) continue;

    const matchLevel = !group.levels || group.levels.length === 0 || group.levels.includes(level);
    if (!matchLevel) continue;

    const matchUnit = matchesUnitKey(unitKey, group.unitKeys || []);
    if (!matchUnit) continue;

    return group;
  }

  return null;
}
