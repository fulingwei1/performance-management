import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { SystemSettingsModel } from '../models/systemSettings.model';
import {
  getPerformanceRankingConfig,
  savePerformanceRankingConfig,
} from '../services/performanceRankingConfig.service';

const RESERVED_ALIASES = new Set(['assessment-scope', 'performance-ranking-config']);

function parseSettingValue(value: unknown, type?: string) {
  if (value === undefined) return undefined;
  if (type === 'json') return typeof value === 'string' ? JSON.parse(value) : value;
  if (type === 'boolean') return value === true || value === 'true' || value === '1';
  if (type === 'number') return Number(value);
  return String(value);
}

function publicSetting(setting: any) {
  if (!setting) return null;
  return {
    id: setting.id,
    key: setting.settingKey,
    value: parseSettingValue(setting.settingValue, setting.settingType),
    type: setting.settingType,
    category: setting.category,
    description: setting.description,
    isPublic: setting.isPublic,
    updatedBy: setting.updatedBy,
    updatedAt: setting.updatedAt,
  };
}

export const settingsController = {
  getAll: asyncHandler(async (req: Request, res: Response) => {
    const category = String(req.query.category || '').trim();
    const includePrivate = ['hr', 'admin', 'gm'].includes(req.user?.role || '') && req.query.includePrivate === 'true';
    const settings = category
      ? await SystemSettingsModel.getByCategory(category)
      : await SystemSettingsModel.getAll(includePrivate);

    res.json({
      success: true,
      data: settings.map(publicSetting),
    });
  }),

  getByKey: asyncHandler(async (req: Request, res: Response) => {
    const key = String(req.params.key || '').trim();
    if (!key) return res.status(400).json({ success: false, message: '缺少配置键' });

    if (RESERVED_ALIASES.has(key)) {
      const config = await getPerformanceRankingConfig();
      return res.json({ success: true, data: config });
    }

    const setting = await SystemSettingsModel.getByKey(key);
    if (!setting) return res.status(404).json({ success: false, message: '配置不存在' });
    if (!setting.isPublic && !['hr', 'admin', 'gm'].includes(req.user?.role || '')) {
      return res.status(403).json({ success: false, message: '无权查看该配置' });
    }

    res.json({ success: true, data: publicSetting(setting) });
  }),

  upsertByKey: asyncHandler(async (req: Request, res: Response) => {
    const key = String(req.params.key || '').trim();
    if (!key) return res.status(400).json({ success: false, message: '缺少配置键' });

    const value = Object.prototype.hasOwnProperty.call(req.body || {}, 'value') ? req.body.value : req.body;
    if (value === undefined) return res.status(400).json({ success: false, message: '缺少配置值' });

    if (RESERVED_ALIASES.has(key)) {
      const saved = await savePerformanceRankingConfig(value, req.user?.userId);
      return res.json({ success: true, data: saved, message: '考核范围配置已保存' });
    }

    const settingType = req.body?.type || (typeof value === 'object' ? 'json' : typeof value === 'boolean' ? 'boolean' : typeof value === 'number' ? 'number' : 'string');
    const serializedValue = settingType === 'json' ? JSON.stringify(value) : String(value);
    const existing = await SystemSettingsModel.getByKey(key);
    const setting = existing
      ? await SystemSettingsModel.update(key, serializedValue, req.user?.userId)
      : await SystemSettingsModel.create({
        settingKey: key,
        settingValue: serializedValue,
        settingType,
        category: req.body?.category || 'general',
        description: req.body?.description,
        isPublic: req.body?.isPublic === true,
        updatedBy: req.user?.userId,
      });

    res.json({ success: true, data: publicSetting(setting), message: '配置已保存' });
  }),
};
