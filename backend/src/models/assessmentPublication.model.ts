import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface AssessmentPublication {
  id: string;
  month: string;
  publishedBy: string;
  publishedAt: Date;
  createdAt: Date;
}

export class AssessmentPublicationModel {
  /**
   * 检查某月是否已发布
   */
  static async isPublished(month: string): Promise<boolean> {
    const sql = 'SELECT id FROM monthly_assessment_publications WHERE month = $1';
    const results = await query(sql, [month]);
    return results.length > 0;
  }

  /**
   * 发布某月的考核结果
   */
  static async publish(month: string, publishedBy: string): Promise<AssessmentPublication> {
    const id = uuidv4();
    const sql = `
      INSERT INTO monthly_assessment_publications 
      (id, month, published_by, published_at, created_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING *
    `;
    
    const results = await query(sql, [id, month, publishedBy]);
    return this.formatRecord(results[0]);
  }

  /**
   * 取消发布（仅用于测试或紧急回退）
   */
  static async unpublish(month: string): Promise<boolean> {
    const sql = 'DELETE FROM monthly_assessment_publications WHERE month = $1';
    const result: any = await query(sql, [month]);
    return result.rowCount > 0;
  }

  /**
   * 获取所有已发布的月份
   */
  static async getAllPublished(): Promise<AssessmentPublication[]> {
    const sql = `
      SELECT 
        p.*,
        e.name as publisher_name
      FROM monthly_assessment_publications p
      LEFT JOIN employees e ON p.published_by = e.id
      ORDER BY p.month DESC
    `;
    
    const results = await query(sql);
    return results.map(this.formatRecord);
  }

  /**
   * 获取某月的发布记录
   */
  static async getByMonth(month: string): Promise<AssessmentPublication | null> {
    const sql = `
      SELECT 
        p.*,
        e.name as publisher_name
      FROM monthly_assessment_publications p
      LEFT JOIN employees e ON p.published_by = e.id
      WHERE p.month = $1
    `;
    
    const results = await query(sql, [month]);
    return results.length > 0 ? this.formatRecord(results[0]) : null;
  }

  /**
   * 格式化记录
   */
  private static formatRecord(row: any): AssessmentPublication {
    return {
      id: row.id,
      month: row.month,
      publishedBy: row.published_by,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      publisherName: row.publisher_name
    } as any;
  }
}
