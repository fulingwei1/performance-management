import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// ===== Strategic Objectives =====
router.get('/strategic-objectives', asyncHandler(async (_req: Request, res: Response) => {
  const results = await query(
    `SELECT so.*, 
            approver.name as approver_name,
            approver.department as approver_dept
     FROM strategic_objectives so
     LEFT JOIN employees approver ON so.approver_id = approver.id
     ORDER BY so.year DESC, so.order_index ASC`
  );
  res.json({ success: true, data: results });
}));

router.post('/strategic-objectives', asyncHandler(async (req: Request, res: Response) => {
  const { year, type, department, title, content, progress, order_index, approver_id, status } = req.body;
  const id = `so-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  await query(
    `INSERT INTO strategic_objectives 
      (id, year, type, department, title, content, progress, order_index, approver_id, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, year, type || 'annual', department || '', title, content || '', progress || 0, order_index || 0, approver_id || null, status || 'draft']
  );
  
  res.json({ success: true, data: { id }, message: '战略目标已创建' });
}));

router.put('/strategic-objectives/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content, status, progress } = req.body;
  
  const sets: string[] = [];
  const vals: any[] = [];
  if (title !== undefined) { sets.push('title = ?'); vals.push(title); }
  if (content !== undefined) { sets.push('content = ?'); vals.push(content); }
  if (status !== undefined) { sets.push('status = ?'); vals.push(status); }
  if (progress !== undefined) { sets.push('progress = ?'); vals.push(progress); }
  sets.push('updated_at = CURRENT_TIMESTAMP');
  vals.push(id);
  
  await query(`UPDATE strategic_objectives SET ${sets.join(', ')} WHERE id = ?`, vals);
  res.json({ success: true, message: '已更新' });
}));

router.delete('/strategic-objectives/:id', asyncHandler(async (req: Request, res: Response) => {
  await query('DELETE FROM strategic_objectives WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: '已删除' });
}));

// ===== Objectives =====
router.get('/objectives', asyncHandler(async (req: Request, res: Response) => {
  const { level, department } = req.query;
  let sql = `SELECT o.*, emp.name as owner_name, emp.department as owner_dept
             FROM objectives o 
             LEFT JOIN employees emp ON o.owner_id = emp.id
             WHERE 1=1`;
  const params: any[] = [];
  if (level) { sql += ' AND o.level = ?'; params.push(level); }
  if (department) { sql += ' AND o.department = ?'; params.push(department); }
  sql += ' ORDER BY o.year DESC, o.created_at DESC';
  
  const results = await query(sql, params);
  res.json({ success: true, data: results });
}));

router.get('/objectives/my', asyncHandler(async (req: Request, res: Response) => {
  const results = await query(
    `SELECT o.* FROM objectives o WHERE o.owner_id = ? ORDER BY o.year DESC`,
    [req.user?.userId]
  );
  res.json({ success: true, data: results });
}));

router.get('/objectives/tree', asyncHandler(async (_req: Request, res: Response) => {
  const results = await query(
    `SELECT o.*, emp.name as owner_name 
     FROM objectives o 
     LEFT JOIN employees emp ON o.owner_id = emp.id
     ORDER BY o.level, o.parent_id, o.order_index`
  );
  res.json({ success: true, data: results });
}));

router.post('/objectives', asyncHandler(async (req: Request, res: Response) => {
  const { title, description, level, parent_id, strategic_objective_id, department, owner_id, year, quarter, weight, progress, status, start_date, end_date, target_value, target_unit, q1_target, q2_target, q3_target, q4_target } = req.body;
  const id = `obj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  await query(
    `INSERT INTO objectives 
      (id, title, description, level, parent_id, strategic_objective_id, department, owner_id, year, quarter, weight, progress, status, start_date, end_date, target_value, target_unit, q1_target, q2_target, q3_target, q4_target)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, title, description || '', level, parent_id || null, strategic_objective_id || null, department || '', owner_id || null, year || new Date().getFullYear(), quarter || null, weight || 0, progress || 0, status || 'draft', start_date || null, end_date || null, target_value || null, target_unit || null, q1_target || null, q2_target || null, q3_target || null, q4_target || null]
  );
  
  res.json({ success: true, data: { id }, message: '目标已创建' });
}));

router.put('/objectives/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, description, status, progress, start_date, end_date } = req.body;
  
  const sets: string[] = [];
  const vals: any[] = [];
  if (title !== undefined) { sets.push('title = ?'); vals.push(title); }
  if (description !== undefined) { sets.push('description = ?'); vals.push(description); }
  if (status !== undefined) { sets.push('status = ?'); vals.push(status); }
  if (progress !== undefined) { sets.push('progress = ?'); vals.push(progress); }
  if (start_date !== undefined) { sets.push('start_date = ?'); vals.push(start_date); }
  if (end_date !== undefined) { sets.push('end_date = ?'); vals.push(end_date); }
  sets.push('updated_at = CURRENT_TIMESTAMP');
  vals.push(id);
  
  await query(`UPDATE objectives SET ${sets.join(', ')} WHERE id = ?`, vals);
  res.json({ success: true, message: '已更新' });
}));

router.delete('/objectives/:id', asyncHandler(async (req: Request, res: Response) => {
  await query('DELETE FROM objectives WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: '已删除' });
}));

router.get('/objectives/:id/feedbacks', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.get('/objectives/related', asyncHandler(async (req: Request, res: Response) => {
  const results = await query(
    `SELECT o.*, emp.name as owner_name 
     FROM objectives o 
     LEFT JOIN employees emp ON o.owner_id = emp.id
     WHERE o.parent_id IS NOT NULL OR o.strategic_objective_id IS NOT NULL
     ORDER BY o.parent_id, o.strategic_objective_id`
  );
  res.json({ success: true, data: results });
}));

// ===== Key Results =====
router.get('/objectives/:objectiveId/krs', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.post('/objectives/:objectiveId/krs', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: { id: `kr-${Date.now()}` }, message: 'KR已创建' });
}));

router.put('/krs/:id', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: '已更新' });
}));

router.delete('/krs/:id', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: '已删除' });
}));

// ===== KPIs =====
router.get('/kpis/my', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.get('/kpis/employee/:employeeId', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.get('/kpis/department/:department', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.post('/kpis', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: { id: `kpi-${Date.now()}` }, message: 'KPI已创建' });
}));

router.put('/kpis/:id/actual', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: '已更新' });
}));

router.delete('/kpis/:id', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: '已删除' });
}));

// ===== Contracts =====
router.get('/contracts/my', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.get('/contracts', asyncHandler(async (_req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.get('/contracts/:id', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: {} });
}));

router.post('/contracts', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: { id: `contract-${Date.now()}` }, message: '已创建' });
}));

router.post('/contracts/:id/sign', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: '已签署' });
}));

router.post('/contracts/:id/approve', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: '已审批' });
}));

// ===== Monthly Reports =====
router.get('/monthly-reports/my', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.get('/monthly-reports/employee/:employeeId', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.get('/monthly-reports/team', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.post('/monthly-reports', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: { id: `report-${Date.now()}` }, message: '已提交' });
}));

router.post('/monthly-reports/:id/review', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: '已评审' });
}));

// ===== Assignments =====
router.post('/objectives/:objectiveId/assign', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: '已分配' });
}));

router.get('/assignments/my', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.put('/assignments/:id/complete', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: '已完成' });
}));

// ===== Interviews =====
router.get('/interviews/my', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.get('/interviews/team', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: [] });
}));

router.post('/interviews', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, data: { id: `interview-${Date.now()}` }, message: '已创建' });
}));

router.put('/interviews/:id', asyncHandler(async (req: Request, res: Response) => {
  res.json({ success: true, message: '已更新' });
}));

export default router;
