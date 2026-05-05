import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import type { PerformanceRecord } from '../types';
import logger from '../config/logger';

export type AssessorSyncResult = {
  updatedRecords: number;
  movedTodos: number;
};

function normalizeId(value: unknown): string {
  return String(value || '').trim();
}

function isActive(employee: any): boolean {
  return !employee?.status || employee.status === 'active';
}

function isOpenPerformanceRecord(record: Partial<PerformanceRecord> & { frozen?: boolean }): boolean {
  const status = String(record.status || '').trim();
  return !record.frozen && status !== 'completed' && status !== 'scored';
}

/**
 * 同步“未完成绩效任务”的考核人到当前人事档案直属上级。
 *
 * 业务边界：
 * - 人事档案 employees.manager_id 是考核关系唯一来源；
 * - 只同步 draft/submitted 等未完成且未冻结记录；
 * - completed/scored 历史结果不改写分数责任人，但经理权限仍按当前上下级树判断；
 * - 同步考核人时一并转移未完成的经理评分待办。
 */
export async function syncPendingPerformanceAssessorsForEmployees(employeeIds?: string[]): Promise<AssessorSyncResult> {
  const scopedIds = Array.from(new Set((employeeIds || []).map(normalizeId).filter(Boolean)));

  if (USE_MEMORY_DB) {
    const employees = Array.from(memoryStore.employees.values()) as any[];
    const activeEmployees = new Map(
      employees
        .filter(isActive)
        .map((employee) => [normalizeId(employee.id), employee])
    );
    const scopedIdSet = scopedIds.length > 0 ? new Set(scopedIds) : null;
    const changedRecords: Array<{ recordId: string; assessorId: string }> = [];

    for (const [recordId, record] of memoryStore.performanceRecords.entries()) {
      const employeeId = normalizeId((record as any).employeeId || (record as any).employee_id);
      if (scopedIdSet && !scopedIdSet.has(employeeId)) continue;
      if (!isOpenPerformanceRecord(record as any)) continue;

      const employee = activeEmployees.get(employeeId);
      const managerId = normalizeId(employee?.managerId || employee?.manager_id);
      if (!employee || !managerId || managerId === employeeId || !activeEmployees.has(managerId)) continue;
      if (normalizeId((record as any).assessorId || (record as any).assessor_id) === managerId) continue;

      const updatedRecord = {
        ...(record as any),
        assessorId: managerId,
        assessor_id: managerId,
        updatedAt: new Date(),
      };
      memoryStore.performanceRecords.set(recordId, updatedRecord as PerformanceRecord);
      changedRecords.push({ recordId, assessorId: managerId });
    }

    let movedTodos = 0;
    if (memoryStore.todos) {
      for (const { recordId, assessorId } of changedRecords) {
        const relatedId = `performance-review-${recordId}`;
        for (const [todoId, todo] of memoryStore.todos.entries()) {
          if (
            todo.type === 'performance_review' &&
            todo.relatedId === relatedId &&
            todo.status !== 'completed' &&
            todo.employeeId !== assessorId
          ) {
            memoryStore.todos.set(todoId, { ...todo, employeeId: assessorId });
            movedTodos++;
          }
        }
      }
    }

    return { updatedRecords: changedRecords.length, movedTodos };
  }

  const params: any[] = [];
  const scopeSql = scopedIds.length > 0 ? `AND e.id = ANY($${params.push(scopedIds)}::text[])` : '';

  const rows = await query(`
    WITH changed_records AS (
      UPDATE performance_records r
      SET assessor_id = e.manager_id,
          updated_at = CURRENT_TIMESTAMP
      FROM employees e
      JOIN employees manager
        ON manager.id = e.manager_id
       AND (manager.status = 'active' OR manager.status IS NULL)
      WHERE r.employee_id = e.id
        AND (e.status = 'active' OR e.status IS NULL)
        AND e.manager_id IS NOT NULL
        AND e.manager_id <> ''
        AND e.manager_id <> e.id
        AND r.assessor_id IS DISTINCT FROM e.manager_id
        AND COALESCE(r.frozen, false) = false
        AND r.status::text NOT IN ('completed', 'scored')
        ${scopeSql}
      RETURNING r.id, r.assessor_id
    ), moved_todos AS (
      UPDATE todos t
      SET employee_id = c.assessor_id
      FROM changed_records c
      WHERE t.type = 'performance_review'
        AND t.related_id = 'performance-review-' || c.id
        AND COALESCE(t.status, 'pending') <> 'completed'
        AND t.employee_id IS DISTINCT FROM c.assessor_id
      RETURNING t.id
    )
    SELECT
      (SELECT COUNT(*) FROM changed_records)::int AS "updatedRecords",
      (SELECT COUNT(*) FROM moved_todos)::int AS "movedTodos"
  `, params);

  const result = rows[0] || { updatedRecords: 0, movedTodos: 0 };
  const updatedRecords = Number(result.updatedRecords || 0);
  const movedTodos = Number(result.movedTodos || 0);
  if (updatedRecords > 0 || movedTodos > 0) {
    logger.info(`[PerformanceAssessorSync] synced pending assessors: records=${updatedRecords}, todos=${movedTodos}`);
  }
  return { updatedRecords, movedTodos };
}
