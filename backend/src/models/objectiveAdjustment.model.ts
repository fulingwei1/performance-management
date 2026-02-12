import { pool } from '../config/database';
import { memoryStore } from '../config/memory-db';
import { ObjectiveAdjustment } from '../types';

const USE_MEMORY_DB = process.env.USE_MEMORY_DB === 'true';

// 内存数据库ID计数器
let adjustmentIdCounter = 1;

/**
 * 记录目标调整历史
 */
export async function createAdjustment(data: {
  objectiveId: number;
  adjustedBy: number;
  adjustmentType: ObjectiveAdjustment['adjustmentType'];
  oldValue: any;
  newValue: any;
  reason?: string;
}): Promise<ObjectiveAdjustment> {
  const { objectiveId, adjustedBy, adjustmentType, oldValue, newValue, reason } = data;

  if (USE_MEMORY_DB) {
    const adjustment: ObjectiveAdjustment = {
      id: adjustmentIdCounter++,
      objectiveId,
      adjustedBy,
      adjustmentType,
      oldValue: JSON.stringify(oldValue),
      newValue: JSON.stringify(newValue),
      reason,
      createdAt: new Date()
    };

    // 内存数据库中没有 objectiveAdjustments，暂时存储在临时 Map 中
    if (!memoryStore.objectiveAdjustments) {
      (memoryStore as any).objectiveAdjustments = new Map<string, ObjectiveAdjustment>();
    }
    (memoryStore as any).objectiveAdjustments.set(adjustment.id.toString(), adjustment);
    
    return adjustment;
  }

  const result = await pool!.query(
    `INSERT INTO objective_adjustments 
     (objective_id, adjusted_by, adjustment_type, old_value, new_value, reason)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [objectiveId, adjustedBy, adjustmentType, JSON.stringify(oldValue), JSON.stringify(newValue), reason]
  );

  return {
    ...result.rows[0],
    id: result.rows[0].id,
    objectiveId: result.rows[0].objective_id,
    adjustedBy: result.rows[0].adjusted_by,
    adjustmentType: result.rows[0].adjustment_type,
    oldValue: result.rows[0].old_value,
    newValue: result.rows[0].new_value,
    createdAt: result.rows[0].created_at
  };
}

/**
 * 获取目标的调整历史
 */
export async function getAdjustmentsByObjective(objectiveId: number): Promise<ObjectiveAdjustment[]> {
  if (USE_MEMORY_DB) {
    if (!(memoryStore as any).objectiveAdjustments) {
      return [];
    }
    const adjustments = Array.from((memoryStore as any).objectiveAdjustments.values());
    return adjustments.filter((adj: ObjectiveAdjustment) => adj.objectiveId === objectiveId);
  }

  const result = await pool!.query(
    `SELECT * FROM objective_adjustments 
     WHERE objective_id = $1 
     ORDER BY created_at DESC`,
    [objectiveId]
  );

  return result.rows.map(row => ({
    id: row.id,
    objectiveId: row.objective_id,
    adjustedBy: row.adjusted_by,
    adjustmentType: row.adjustment_type,
    oldValue: row.old_value,
    newValue: row.new_value,
    reason: row.reason,
    createdAt: row.created_at
  }));
}

/**
 * 获取经理调整的所有记录（用于审计）
 */
export async function getAdjustmentsByManager(managerId: number, limit = 50): Promise<ObjectiveAdjustment[]> {
  if (USE_MEMORY_DB) {
    if (!(memoryStore as any).objectiveAdjustments) {
      return [];
    }
    const adjustments = Array.from((memoryStore as any).objectiveAdjustments.values());
    return adjustments
      .filter((adj: ObjectiveAdjustment) => adj.adjustedBy === managerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  const result = await pool!.query(
    `SELECT * FROM objective_adjustments 
     WHERE adjusted_by = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [managerId, limit]
  );

  return result.rows.map(row => ({
    id: row.id,
    objectiveId: row.objective_id,
    adjustedBy: row.adjusted_by,
    adjustmentType: row.adjustment_type,
    oldValue: row.old_value,
    newValue: row.new_value,
    reason: row.reason,
    createdAt: row.created_at
  }));
}
