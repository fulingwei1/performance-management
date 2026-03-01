import { query } from '../config/database';
import logger from '../config/logger';

export interface SystemSetting {
  id: number;
  settingKey: string;
  settingValue: string;
  settingType: 'string' | 'boolean' | 'number' | 'json';
  category?: string;
  description?: string;
  isPublic: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class SystemSettingsModel {
  /**
   * 获取所有系统配置
   */
  static async getAll(includePrivate = false): Promise<SystemSetting[]> {
    try {
      let sql = 'SELECT * FROM system_settings';
      if (!includePrivate) {
        sql += ' WHERE is_public = true';
      }
      sql += ' ORDER BY category, setting_key';

      const rows = await query(sql);
      return rows.map((row: any) => this.mapRow(row));
    } catch (error) {
      logger.error('Failed to get all system settings: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 根据键获取配置
   */
  static async getByKey(key: string): Promise<SystemSetting | null> {
    try {
      const rows = await query(
        'SELECT * FROM system_settings WHERE setting_key = $1',
        [key]
      );
      return rows.length > 0 ? this.mapRow(rows[0]) : null;
    } catch (error) {
      logger.error(`Failed to get setting by key ${key}:` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 根据分类获取配置
   */
  static async getByCategory(category: string): Promise<SystemSetting[]> {
    try {
      const rows = await query(
        'SELECT * FROM system_settings WHERE category = $1 ORDER BY setting_key',
        [category]
      );
      return rows.map((row: any) => this.mapRow(row));
    } catch (error) {
      logger.error(`Failed to get settings by category ${category}:` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 获取配置值（自动转换类型）
   */
  static async getValue(key: string): Promise<any> {
    const setting = await this.getByKey(key);
    if (!setting) return null;

    return this.parseValue(setting.settingValue, setting.settingType);
  }

  /**
   * 更新配置
   */
  static async update(
    key: string,
    value: string,
    updatedBy?: string
  ): Promise<SystemSetting | null> {
    try {
      const rows = await query(
        `UPDATE system_settings 
         SET setting_value = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP
         WHERE setting_key = $3
         RETURNING *`,
        [value, updatedBy, key]
      );

      if (rows.length === 0) {
        logger.warn(`Setting ${key} not found for update`);
        return null;
      }

      logger.info(`System setting ${key} updated by ${updatedBy || 'system'}`);
      return this.mapRow(rows[0]);
    } catch (error) {
      logger.error(`Failed to update setting ${key}:` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 批量更新配置
   */
  static async updateBatch(
    settings: Array<{ key: string; value: string }>,
    updatedBy?: string
  ): Promise<number> {
    let updated = 0;
    for (const { key, value } of settings) {
      const result = await this.update(key, value, updatedBy);
      if (result) updated++;
    }
    return updated;
  }

  /**
   * 创建新配置
   */
  static async create(data: {
    settingKey: string;
    settingValue: string;
    settingType?: 'string' | 'boolean' | 'number' | 'json';
    category?: string;
    description?: string;
    isPublic?: boolean;
    updatedBy?: string;
  }): Promise<SystemSetting> {
    try {
      const rows = await query(
        `INSERT INTO system_settings 
         (setting_key, setting_value, setting_type, category, description, is_public, updated_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          data.settingKey,
          data.settingValue,
          data.settingType || 'string',
          data.category,
          data.description,
          data.isPublic || false,
          data.updatedBy
        ]
      );

      logger.info(`System setting ${data.settingKey} created`);
      return this.mapRow(rows[0]);
    } catch (error) {
      logger.error('Failed to create system setting:' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 删除配置
   */
  static async delete(key: string): Promise<boolean> {
    try {
      const rows = await query(
        'DELETE FROM system_settings WHERE setting_key = $1 RETURNING id',
        [key]
      );
      return rows.length > 0;
    } catch (error) {
      logger.error(`Failed to delete setting ${key}:` + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }

  /**
   * 检查 360 评价是否启用
   */
  static async is360ReviewEnabled(): Promise<boolean> {
    const value = await this.getValue('enable_360_review');
    return value === true || value === 'true';
  }

  /**
   * 获取 360 评价配置
   */
  static async get360ReviewConfig(): Promise<{
    enabled: boolean;
    mode: 'required' | 'optional' | 'disabled';
    minReviewers: number;
    maxReviewers: number;
    frequency: 'monthly' | 'quarterly' | 'yearly';
    autoAssign: boolean;
  }> {
    const [enabled, mode, minReviewers, maxReviewers, frequency, autoAssign] = await Promise.all([
      this.getValue('enable_360_review'),
      this.getValue('360_review_mode'),
      this.getValue('360_review_min_reviewers'),
      this.getValue('360_review_max_reviewers'),
      this.getValue('360_review_frequency'),
      this.getValue('auto_assign_360_tasks')
    ]);

    return {
      enabled: enabled === true || enabled === 'true',
      mode: mode || 'optional',
      minReviewers: parseInt(minReviewers) || 2,
      maxReviewers: parseInt(maxReviewers) || 5,
      frequency: frequency || 'quarterly',
      autoAssign: autoAssign === true || autoAssign === 'true'
    };
  }

  /**
   * 数据库行映射
   */
  private static mapRow(row: any): SystemSetting {
    return {
      id: row.id,
      settingKey: row.setting_key,
      settingValue: row.setting_value,
      settingType: row.setting_type,
      category: row.category,
      description: row.description,
      isPublic: row.is_public,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * 解析配置值
   */
  private static parseValue(value: string, type: string): any {
    switch (type) {
      case 'boolean':
        return value === 'true' || value === '1';
      case 'number':
        return parseFloat(value);
      case 'json':
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }
}
