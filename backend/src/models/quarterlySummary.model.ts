import { query, USE_MEMORY_DB, memoryDB, memoryStore } from '../config/database';
import type { QuarterlySummary } from '../types';

export class QuarterlySummaryModel {
  static async upsert(data: {
    managerId: string;
    managerName: string;
    quarter: string;
    summary: string;
    nextQuarterPlan: string;
    status: 'draft' | 'submitted';
  }): Promise<QuarterlySummary> {
    const now = new Date();

    if (USE_MEMORY_DB) {
      const existing = Array.from(memoryStore.quarterlySummaries.values()).find(
        summary => summary.managerId === data.managerId && summary.quarter === data.quarter
      );
      if (existing) {
        const updated = memoryDB.quarterlySummaries.update(existing.id, {
          managerName: data.managerName,
          summary: data.summary,
          nextQuarterPlan: data.nextQuarterPlan,
          status: data.status,
          updatedAt: now
        });
        return updated as QuarterlySummary;
      }

      const created: QuarterlySummary = {
        id: `qs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        managerId: data.managerId,
        managerName: data.managerName,
        quarter: data.quarter,
        summary: data.summary,
        nextQuarterPlan: data.nextQuarterPlan,
        status: data.status,
        createdAt: now,
        updatedAt: now
      };
      memoryDB.quarterlySummaries.create(created);
      return created;
    }

    const existing = await query(
      'SELECT id FROM quarterly_summaries WHERE manager_id = ? AND quarter = ?',
      [data.managerId, data.quarter]
    );

    if (existing.length > 0) {
      const id = existing[0].id;
      await query(
        `UPDATE quarterly_summaries
         SET manager_name = ?, summary = ?, next_quarter_plan = ?, status = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [data.managerName, data.summary, data.nextQuarterPlan, data.status, id]
      );
      return (await this.findById(id)) as QuarterlySummary;
    }

    const id = `qs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await query(
      `INSERT INTO quarterly_summaries (
        id, manager_id, manager_name, quarter, summary, next_quarter_plan, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        id,
        data.managerId,
        data.managerName,
        data.quarter,
        data.summary,
        data.nextQuarterPlan,
        data.status
      ]
    );

    return (await this.findById(id)) as QuarterlySummary;
  }

  static async findById(id: string): Promise<QuarterlySummary | null> {
    if (USE_MEMORY_DB) {
      const record = memoryDB.quarterlySummaries.findById(id);
      return record || null;
    }

    const results = await query('SELECT * FROM quarterly_summaries WHERE id = ?', [id]);
    return results.length > 0 ? this.formatRecord(results[0]) : null;
  }

  static async findByManagerId(managerId: string, quarter?: string): Promise<QuarterlySummary[]> {
    if (USE_MEMORY_DB) {
      const records = memoryDB.quarterlySummaries.findByManagerId(managerId);
      if (quarter) {
        return records.filter(record => record.quarter === quarter);
      }
      return records;
    }

    let sql = 'SELECT * FROM quarterly_summaries WHERE manager_id = ?';
    const params: any[] = [managerId];
    if (quarter) {
      sql += ' AND quarter = ?';
      params.push(quarter);
    }
    sql += ' ORDER BY updated_at DESC';
    const results = await query(sql, params);
    return results.map(this.formatRecord);
  }

  private static formatRecord(row: any): QuarterlySummary {
    return {
      id: row.id,
      managerId: row.manager_id,
      managerName: row.manager_name,
      quarter: row.quarter,
      summary: row.summary,
      nextQuarterPlan: row.next_quarter_plan,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
