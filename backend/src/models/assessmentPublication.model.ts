import { memoryStore, query, transaction, USE_MEMORY_DB } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

function alreadyPublishedError(month: string): Error & { statusCode?: number; code?: string } {
  const error = new Error(`${month} 的考核结果已发布，无法重复发布`) as Error & { statusCode?: number; code?: string };
  error.statusCode = 409;
  error.code = 'ALREADY_PUBLISHED';
  return error;
}

export interface AssessmentPublication {
  id: string;
  month: string;
  publishedBy: string;
  publishedAt: Date;
  createdAt: Date;
  forceDistribution?: boolean;
  forceReason?: string;
  readinessSnapshot?: unknown;
}

export interface AssessmentPublicationOptions {
  forceDistribution?: boolean;
  forceReason?: string;
  readinessSnapshot?: unknown;
}

const parseReadinessSnapshot = (value: unknown): unknown => {
  if (typeof value !== 'string') return value;
  if (!value.trim()) return null;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export class AssessmentPublicationModel {
  private static getMemoryStore(): Map<string, any> {
    const store = memoryStore as any;
    if (!store.monthlyAssessmentPublications) store.monthlyAssessmentPublications = new Map();
    return store.monthlyAssessmentPublications;
  }

  /**
   * 检查某月是否已发布
   */
  static async isPublished(month: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      return this.getMemoryStore().has(month);
    }

    const sql = 'SELECT id FROM monthly_assessment_publications WHERE month = $1';
    const results = await query(sql, [month]);
    return results.length > 0;
  }

  /**
   * 发布某月的考核结果
   */
  static async publish(
    month: string,
    publishedBy: string,
    options: AssessmentPublicationOptions = {}
  ): Promise<AssessmentPublication> {
    const id = uuidv4();
    if (USE_MEMORY_DB) {
      if (this.getMemoryStore().has(month)) {
        throw alreadyPublishedError(month);
      }
      const publication = {
        id,
        month,
        published_by: publishedBy,
        published_at: new Date(),
        created_at: new Date(),
        force_distribution: options.forceDistribution === true,
        force_reason: options.forceReason || '',
        readiness_snapshot: options.readinessSnapshot || null,
      };
      this.getMemoryStore().set(month, publication);
      return this.formatRecord(publication);
    }

    return transaction(async (connection) => {
      await connection.execute('SELECT pg_advisory_xact_lock(hashtext(?))', [`monthly_assessment_publication:${month}`]);

      const existing = await connection.execute(
        'SELECT * FROM monthly_assessment_publications WHERE month = ? FOR UPDATE',
        [month]
      );
      if (existing.length > 0) {
        throw alreadyPublishedError(month);
      }

      const sql = `
        INSERT INTO monthly_assessment_publications
        (id, month, published_by, published_at, created_at, force_distribution, force_reason, readiness_snapshot)
        VALUES (?, ?, ?, NOW(), NOW(), ?, ?, ?)
        RETURNING *
      `;

      const results = await connection.execute(sql, [
        id,
        month,
        publishedBy,
        options.forceDistribution === true,
        options.forceReason || '',
        options.readinessSnapshot ? JSON.stringify(options.readinessSnapshot) : null,
      ]);
      return this.formatRecord(results[0]);
    });
  }

  /**
   * 取消发布（仅用于测试或紧急回退）
   */
  static async unpublish(month: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      return this.getMemoryStore().delete(month);
    }

    const sql = 'DELETE FROM monthly_assessment_publications WHERE month = $1';
    const result: any = await query(sql, [month]);
    return (result.affectedRows || result.rowCount || 0) > 0;
  }

  /**
   * 获取所有已发布的月份
   */
  static async getAllPublished(): Promise<AssessmentPublication[]> {
    if (USE_MEMORY_DB) {
      return Array.from(this.getMemoryStore().values())
        .sort((a, b) => String(b.month).localeCompare(String(a.month)))
        .map((row) => this.formatRecord(row));
    }

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
    if (USE_MEMORY_DB) {
      const row = this.getMemoryStore().get(month);
      return row ? this.formatRecord(row) : null;
    }

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
      forceDistribution: row.force_distribution === true,
      forceReason: row.force_reason || '',
      readinessSnapshot: parseReadinessSnapshot(row.readiness_snapshot),
      publisherName: row.publisher_name
    } as any;
  }
}
