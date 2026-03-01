import { Request, Response } from 'express';
import { param, validationResult } from 'express-validator';
import { TodoModel, TodoStatus } from '../models/todo.model';
import { asyncHandler } from '../middleware/errorHandler';

export const todoController = {
  getMyTodos: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: '未授权' });

    const status = typeof req.query.status === 'string' ? req.query.status as TodoStatus : undefined;
    const todos = await TodoModel.findByEmployeeId(userId, status);
    res.json({ success: true, data: todos });
  }),

  markCompleted: [
    param('id').notEmpty().withMessage('待办ID不能为空'),
    asyncHandler(async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, error: errors.array()[0].msg });
      }

      const userId = (req as any).user?.id;
      if (!userId) return res.status(401).json({ success: false, error: '未授权' });

      const todo = await TodoModel.findById(req.params.id as string);
      if (!todo) return res.status(404).json({ success: false, error: '待办不存在' });
      if (todo.employeeId !== userId) return res.status(403).json({ success: false, error: '无权限' });

      await TodoModel.markCompleted(req.params.id as string, userId);
      res.json({ success: true, message: '已完成' });
    })
  ],

  getStatistics: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: '未授权' });

    const stats = await TodoModel.getStatistics(userId);
    res.json({ success: true, data: stats });
  }),


  // 待办摘要（按类型分组，含数量、最近截止日期、状态）
  getSummary: asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ success: false, error: '未授权' });

    const todos = await TodoModel.findByEmployeeId(userId);
    const pendingTodos = todos.filter(t => t.status === 'pending' || t.status === 'overdue');

    const grouped: Record<string, { count: number; dueDate: string | null; status: 'pending' | 'warning' | 'overdue'; items: any[] }> = {};
    const now = new Date();
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    for (const todo of pendingTodos) {
      if (!grouped[todo.type]) {
        grouped[todo.type] = { count: 0, dueDate: null, status: 'pending', items: [] };
      }
      const group = grouped[todo.type];
      group.count++;
      group.items.push({ id: todo.id, title: todo.title, link: todo.link, dueDate: todo.dueDate });

      if (todo.dueDate) {
        const due = new Date(todo.dueDate);
        if (!group.dueDate || due < new Date(group.dueDate)) {
          group.dueDate = due.toISOString();
        }
        if (due < now) {
          group.status = 'overdue';
        } else if (due < threeDaysFromNow && group.status !== 'overdue') {
          group.status = 'warning';
        }
      }

      if (todo.status === 'overdue') {
        group.status = 'overdue';
      }
    }

    res.json({ success: true, data: grouped });
  }),
};
