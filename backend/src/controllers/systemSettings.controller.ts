import { Request, Response } from 'express';
import { SystemSettingsModel } from '../models/systemSettings.model';
import logger from '../config/logger';

/**
 * 获取所有公开配置（供前端读取）
 */
export const getPublicSettings = async (req: Request, res: Response) => {
  try {
    const settings = await SystemSettingsModel.getAll(false);
    
    // 转换为 key-value 对象
    const settingsMap: Record<string, any> = {};
    settings.forEach(setting => {
      let value: any = setting.settingValue;
      // 类型转换
      switch (setting.settingType) {
        case 'boolean':
          value = value === 'true' || value === '1';
          break;
        case 'number':
          value = parseFloat(value);
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch {
            // Keep as string if parse fails
          }
          break;
      }
      settingsMap[setting.settingKey] = {
        value,
        type: setting.settingType,
        description: setting.description
      };
    });

    res.json({
      success: true,
      data: settingsMap
    });
  } catch (error: any) {
    logger.error('Get public settings failed:', error);
    res.status(500).json({
      success: false,
      message: '获取系统配置失败'
    });
  }
};

/**
 * 获取所有配置（管理员）
 */
export const getAllSettings = async (req: Request, res: Response) => {
  try {
    const settings = await SystemSettingsModel.getAll(true);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error: any) {
    logger.error('Get all settings failed:', error);
    res.status(500).json({
      success: false,
      message: '获取系统配置失败'
    });
  }
};

/**
 * 根据分类获取配置
 */
export const getSettingsByCategory = async (req: Request, res: Response) => {
  try {
    const category = req.params.category as string;
    const settings = await SystemSettingsModel.getByCategory(category);
    
    res.json({
      success: true,
      data: settings
    });
  } catch (error: any) {
    logger.error(`Get settings by category ${req.params.category} failed:`, error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
};

/**
 * 获取单个配置
 */
export const getSetting = async (req: Request, res: Response) => {
  try {
    const key = req.params.key as string;
    const setting = await SystemSettingsModel.getByKey(key);
    
    if (!setting) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    res.json({
      success: true,
      data: setting
    });
  } catch (error: any) {
    logger.error(`Get setting ${req.params.key} failed:`, error);
    res.status(500).json({
      success: false,
      message: '获取配置失败'
    });
  }
};

/**
 * 更新配置
 */
export const updateSetting = async (req: Request, res: Response) => {
  try {
    const key = req.params.key as string;
    const { value } = req.body;
    const user = (req as any).user;

    if (value === undefined || value === null) {
      return res.status(400).json({
        success: false,
        message: '缺少配置值'
      });
    }

    const setting = await SystemSettingsModel.update(
      key,
      String(value),
      user?.id
    );

    if (!setting) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    logger.info(`Setting ${key} updated to ${value} by ${user?.username || 'system'}`);

    res.json({
      success: true,
      message: '配置更新成功',
      data: setting
    });
  } catch (error: any) {
    logger.error(`Update setting ${req.params.key} failed:`, error);
    res.status(500).json({
      success: false,
      message: '更新配置失败'
    });
  }
};

/**
 * 批量更新配置
 */
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    const user = (req as any).user;

    if (!Array.isArray(settings) || settings.length === 0) {
      return res.status(400).json({
        success: false,
        message: '无效的配置数据'
      });
    }

    const updated = await SystemSettingsModel.updateBatch(settings, user?.id);

    logger.info(`${updated} settings updated by ${user?.username || 'system'}`);

    res.json({
      success: true,
      message: `成功更新 ${updated} 项配置`,
      data: { updated }
    });
  } catch (error: any) {
    logger.error('Batch update settings failed:', error);
    res.status(500).json({
      success: false,
      message: '批量更新配置失败'
    });
  }
};

/**
 * 创建配置
 */
export const createSetting = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const data = { ...req.body, updatedBy: user?.id };

    if (!data.settingKey || !data.settingValue) {
      return res.status(400).json({
        success: false,
        message: '缺少必填字段'
      });
    }

    const setting = await SystemSettingsModel.create(data);

    res.status(201).json({
      success: true,
      message: '配置创建成功',
      data: setting
    });
  } catch (error: any) {
    logger.error('Create setting failed:', error);
    res.status(500).json({
      success: false,
      message: '创建配置失败'
    });
  }
};

/**
 * 删除配置
 */
export const deleteSetting = async (req: Request, res: Response) => {
  try {
    const key = req.params.key as string;
    const deleted = await SystemSettingsModel.delete(key);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: '配置不存在'
      });
    }

    res.json({
      success: true,
      message: '配置删除成功'
    });
  } catch (error: any) {
    logger.error(`Delete setting ${req.params.key} failed:`, error);
    res.status(500).json({
      success: false,
      message: '删除配置失败'
    });
  }
};

/**
 * 获取 360 评价配置
 */
export const get360ReviewConfig = async (req: Request, res: Response) => {
  try {
    const config = await SystemSettingsModel.get360ReviewConfig();
    
    res.json({
      success: true,
      data: config
    });
  } catch (error: any) {
    logger.error('Get 360 review config failed:', error);
    res.status(500).json({
      success: false,
      message: '获取360评价配置失败'
    });
  }
};
