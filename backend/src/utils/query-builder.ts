/**
 * 动态SQL查询构建工具
 * 提取models中重复的filter构建和动态update模式
 */

export interface QueryFilter {
  field: string;
  value: unknown;
}

/**
 * 构建WHERE条件查询
 * 消除 models 中重复的 "WHERE 1=1" + 动态拼接模式
 */
export function buildFilteredQuery(
  baseQuery: string,
  filters: Record<string, unknown>,
  orderBy?: string
): { sql: string; params: unknown[] } {
  let sql = baseQuery;
  const params: unknown[] = [];

  for (const [field, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null) {
      params.push(value);
      sql += ` AND ${field} = $${params.length}`;
    }
  }

  if (orderBy) {
    sql += ` ORDER BY ${orderBy}`;
  }

  return { sql, params };
}

/**
 * 构建动态UPDATE语句
 * 消除 InterviewPlanModel.update 和 ReviewCycleModel.update 中的重复模式
 */
export function buildUpdateQuery(
  table: string,
  id: number,
  data: Record<string, unknown>,
  options?: { timestampField?: string }
): { sql: string; params: unknown[] } | null {
  const fields = Object.keys(data).filter(k => data[k] !== undefined);
  if (fields.length === 0) return null;

  const timestampField = options?.timestampField ?? 'updated_at';
  const setClause = fields.map((k, i) => `${k} = $${i + 1}`).join(', ');
  const values = fields.map(k => data[k]);

  const sql = `UPDATE ${table} SET ${setClause}, ${timestampField} = NOW() WHERE id = $${fields.length + 1}`;
  const params = [...values, id];

  return { sql, params };
}
