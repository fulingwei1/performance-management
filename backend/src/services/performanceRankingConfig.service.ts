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
    mode: 'include' | 'exclude'; // include: 只考核勾选范围；exclude: 默认全员考核，勾选范围不考核
    enabledUnitKeys: string[]; // legacy: empty => all units
    includedUnitKeys: string[];
    excludedUnitKeys: string[];
    includedEmployeeIds: string[];
    excludedEmployeeIds: string[];
  };
  groupRank: {
    defaultStrategy: LevelGroupingStrategy;
    perUnit: Record<string, LevelGroupingStrategy>;
  };
  templateAssignments: Record<string, string>; // 参与考核的组织单元 -> 考核模板（支持父级前缀继承）
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
      mode: z.enum(['include', 'exclude']).optional().default('exclude'),
      enabledUnitKeys: z.array(z.string()).default([]),
      includedUnitKeys: z.array(z.string()).default([]),
      excludedUnitKeys: z.array(z.string()).default([]),
      includedEmployeeIds: z.array(z.string()).default([]),
      excludedEmployeeIds: z.array(z.string()).default([]),
    })
    .default({
      mode: 'exclude',
      enabledUnitKeys: [],
      includedUnitKeys: [],
      excludedUnitKeys: [],
      includedEmployeeIds: [],
      excludedEmployeeIds: [],
    }),
  groupRank: z
    .object({
      defaultStrategy: levelGroupingStrategySchema.default({ type: 'by_high_low' }),
      perUnit: z.record(z.string(), levelGroupingStrategySchema).default({}),
    })
    .default({ defaultStrategy: { type: 'by_high_low' }, perUnit: {} }),
  templateAssignments: z.record(z.string(), z.string().min(1)).default({}),
  mergeRankGroups: z.array(mergeRankGroupSchema).default([]),
});

export function buildDefaultPerformanceRankingConfig(): PerformanceRankingConfigV1 {
  return {
    version: 1,
    participation: {
      mode: 'exclude',
      enabledUnitKeys: [],
      includedUnitKeys: [],
      excludedUnitKeys: [],
      includedEmployeeIds: [],
      excludedEmployeeIds: [],
    },
    groupRank: {
      defaultStrategy: { type: 'by_high_low' },
      perUnit: {},
    },
    templateAssignments: {},
    mergeRankGroups: [],
  };
}

function uniqueStrings(values?: string[]): string[] {
  return Array.from(new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean)));
}

function normalizeConfig(config: PerformanceRankingConfigV1): PerformanceRankingConfigV1 {
  const legacyEnabled = uniqueStrings(config.participation.enabledUnitKeys);
  const includedUnitKeys = uniqueStrings(config.participation.includedUnitKeys);
  let mode = config.participation.mode || (legacyEnabled.length > 0 ? 'include' : 'exclude');
  const normalizedIncluded = includedUnitKeys.length > 0 ? includedUnitKeys : legacyEnabled;
  const normalizedIncludedEmployeeIds = uniqueStrings(config.participation.includedEmployeeIds);
  const normalizedExcludedEmployeeIds = uniqueStrings(config.participation.excludedEmployeeIds);

  if (mode === 'include' && normalizedIncluded.length === 0 && normalizedIncludedEmployeeIds.length === 0) {
    mode = 'exclude';
  }

  return {
    ...config,
    participation: {
      mode,
      enabledUnitKeys: normalizedIncluded,
      includedUnitKeys: normalizedIncluded,
      excludedUnitKeys: uniqueStrings(config.participation.excludedUnitKeys),
      includedEmployeeIds: normalizedIncludedEmployeeIds,
      excludedEmployeeIds: normalizedExcludedEmployeeIds,
    },
    templateAssignments: Object.fromEntries(
      Object.entries(config.templateAssignments || {})
        .map(([key, value]) => [String(key || '').trim(), String(value || '').trim()])
        .filter(([key, value]) => Boolean(key && value))
    ),
  };
}

export async function getPerformanceRankingConfig(): Promise<PerformanceRankingConfigV1> {
  try {
    const raw = await SystemSettingsModel.getValue(SETTING_KEY);
    if (!raw) return buildDefaultPerformanceRankingConfig();

    const parsed = configSchema.safeParse(raw);
    if (parsed.success) return normalizeConfig(parsed.data);

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

  const normalized = normalizeConfig(parsed.data);
  if (normalized.participation.mode === 'include') {
    const missingTemplateUnitKeys = normalized.participation.includedUnitKeys.filter((unitKey) => (
      !getConfiguredTemplateId(unitKey, normalized)
    ));
    if (missingTemplateUnitKeys.length > 0) {
      const preview = missingTemplateUnitKeys.slice(0, 3).join('、');
      const suffix = missingTemplateUnitKeys.length > 3 ? ` 等 ${missingTemplateUnitKeys.length} 个部门` : '';
      throw new Error(`以下参与考核部门还没有选择模板：${preview}${suffix}`);
    }
  }

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

function matchesConfiguredUnit(unitKey: string, configuredKey: string): boolean {
  return configuredKey === unitKey || unitKey.startsWith(`${configuredKey}/`);
}

function matchesAnyConfiguredUnit(unitKey: string, configuredUnitKeys: string[]): boolean {
  return configuredUnitKeys.some((configuredKey) => (
    Boolean(configuredKey) && matchesConfiguredUnit(unitKey, configuredKey)
  ));
}

function resolveUnitDecision(
  unitKey: string,
  includedUnitKeys: string[],
  excludedUnitKeys: string[]
): 'include' | 'exclude' | null {
  let bestLength = -1;
  let decision: 'include' | 'exclude' | null = null;

  for (const key of includedUnitKeys) {
    if (matchesConfiguredUnit(unitKey, key) && key.length > bestLength) {
      bestLength = key.length;
      decision = 'include';
    }
  }

  for (const key of excludedUnitKeys) {
    if (matchesConfiguredUnit(unitKey, key) && key.length >= bestLength) {
      bestLength = key.length;
      decision = 'exclude';
    }
  }

  return decision;
}

export function isParticipatingRecord(
  record: Pick<PerformanceRecord, 'department' | 'subDepartment'> & { employeeId?: string; id?: string },
  config: PerformanceRankingConfigV1
): boolean {
  const participation = normalizeConfig(config).participation;
  const unitKey = getOrgUnitKey(record);
  const employeeId = String(record.employeeId || record.id || '').trim();

  if (employeeId && participation.excludedEmployeeIds.includes(employeeId)) return false;
  if (employeeId && participation.includedEmployeeIds.includes(employeeId)) return true;

  const unitDecision = resolveUnitDecision(unitKey, participation.includedUnitKeys, participation.excludedUnitKeys);
  if (unitDecision) return unitDecision === 'include';

  return participation.mode !== 'include';
}

export function getConfiguredTemplateId(
  unitKey: string,
  config: Pick<PerformanceRankingConfigV1, 'templateAssignments'>
): string | null {
  const normalizedUnitKey = String(unitKey || '').trim();
  if (!normalizedUnitKey) return null;

  let bestKey = '';
  let bestTemplateId = '';

  for (const [configuredKey, templateId] of Object.entries(config.templateAssignments || {})) {
    const normalizedConfiguredKey = String(configuredKey || '').trim();
    const normalizedTemplateId = String(templateId || '').trim();
    if (!normalizedConfiguredKey || !normalizedTemplateId) continue;
    if (!matchesConfiguredUnit(normalizedUnitKey, normalizedConfiguredKey)) continue;

    if (normalizedConfiguredKey.length > bestKey.length) {
      bestKey = normalizedConfiguredKey;
      bestTemplateId = normalizedTemplateId;
    }
  }

  return bestTemplateId || null;
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

    const matchUnit = !group.unitKeys || group.unitKeys.length === 0 || matchesAnyConfiguredUnit(unitKey, group.unitKeys || []);
    if (!matchUnit) continue;

    return group;
  }

  return null;
}
