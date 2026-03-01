import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type TodoType = 'work_summary' | 'goal_approval' | 'performance_review' | 'appeal_review' | 'manager_review' | 'hr_review';
export type TodoStatus = 'pending' | 'completed' | 'overdue';

export interface Todo {
  id: string;
  employeeId: string;
  type: TodoType;
  title: string;
  description?: string;
  dueDate?: Date;
  status: TodoStatus;
  link?: string;
  relatedId?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface CreateTodoInput {
  employeeId: string;
  type: TodoType;
  title: string;
  description?: string;
  dueDate?: Date;
  link?: string;
  relatedId?: string;
}

export class TodoModel {
  static async create(input: CreateTodoInput): Promise<Todo> {
    const id = uuidv4();

    if (USE_MEMORY_DB) {
      if (!memoryStore.todos) memoryStore.todos = new Map();
      const todo: Todo = {
        id,
        employeeId: input.employeeId,
        type: input.type as TodoType,
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        status: 'pending',
        link: input.link,
        relatedId: input.relatedId,
        createdAt: new Date(),
      };
      memoryStore.todos.set(id, todo);
      return todo;
    }

    const sql = `
      INSERT INTO todos (id, employee_id, type, title, description, due_date, link, related_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, employee_id as "employeeId", type, title, description,
        due_date as "dueDate", status, link, related_id as "relatedId",
        created_at as "createdAt", completed_at as "completedAt"
    `;
    const results = await query(sql, [
      id, input.employeeId, input.type, input.title,
      input.description || null, input.dueDate || null,
      input.link || null, input.relatedId || null
    ]);
    return results[0] as Todo;
  }

  static async findByEmployeeId(employeeId: string, status?: TodoStatus): Promise<Todo[]> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.todos) memoryStore.todos = new Map();
      let filtered = Array.from(memoryStore.todos.values()).filter((t: any) => t.employeeId === employeeId);
      if (status) filtered = filtered.filter((t: any) => t.status === status);
      return filtered.sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime()) as Todo[];
    }

    let sql = `
      SELECT id, employee_id as "employeeId", type, title, description,
        due_date as "dueDate", status, link, related_id as "relatedId",
        created_at as "createdAt", completed_at as "completedAt"
      FROM todos WHERE employee_id = $1
    `;
    const params: any[] = [employeeId];
    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    }
    sql += ` ORDER BY created_at DESC`;
    return await query(sql, params) as Todo[];
  }

  static async markCompleted(id: string, employeeId: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.todos) memoryStore.todos = new Map();
      const todo = memoryStore.todos.get(id) as Todo | undefined;
      if (todo && todo.employeeId === employeeId) {
        todo.status = 'completed';
        todo.completedAt = new Date();
        memoryStore.todos.set(id, todo);
        return true;
      }
      return false;
    }

    const sql = `
      UPDATE todos SET status = 'completed', completed_at = NOW()
      WHERE id = $1 AND employee_id = $2 AND status = 'pending'
    `;
    await query(sql, [id, employeeId]);
    return true;
  }

  static async checkOverdue(): Promise<number> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.todos) memoryStore.todos = new Map();
      const now = new Date();
      let count = 0;
      for (const [, todo] of memoryStore.todos.entries()) {
        const t = todo as Todo;
        if (t.status === 'pending' && t.dueDate && new Date(t.dueDate) < now) {
          t.status = 'overdue';
          count++;
        }
      }
      return count;
    }

    const sql = `
      UPDATE todos SET status = 'overdue'
      WHERE status = 'pending' AND due_date < CURRENT_DATE
    `;
    const result = await query(sql, []);
    return (result as any).rowCount || 0;
  }

  static async getStatistics(employeeId: string): Promise<{ pending: number; completed: number; overdue: number }> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.todos) memoryStore.todos = new Map();
      const todos = Array.from(memoryStore.todos.values()).filter((t: any) => t.employeeId === employeeId) as Todo[];
      return {
        pending: todos.filter(t => t.status === 'pending').length,
        completed: todos.filter(t => t.status === 'completed').length,
        overdue: todos.filter(t => t.status === 'overdue').length,
      };
    }

    const sql = `
      SELECT status, COUNT(*) as count
      FROM todos WHERE employee_id = $1
      GROUP BY status
    `;
    const results = await query(sql, [employeeId]);
    const stats = { pending: 0, completed: 0, overdue: 0 };
    for (const row of results) {
      const r = row as any;
      if (r.status in stats) {
        (stats as any)[r.status] = parseInt(r.count, 10);
      }
    }
    return stats;
  }

  static async findById(id: string): Promise<Todo | null> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.todos) memoryStore.todos = new Map();
      return (memoryStore.todos.get(id) as Todo) || null;
    }

    const sql = `
      SELECT id, employee_id as "employeeId", type, title, description,
        due_date as "dueDate", status, link, related_id as "relatedId",
        created_at as "createdAt", completed_at as "completedAt"
      FROM todos WHERE id = $1
    `;
    const results = await query(sql, [id]);
    return results.length > 0 ? (results[0] as Todo) : null;
  }

  // 查找已存在的待办（避免重复创建）
  static async findExisting(employeeId: string, type: string, relatedId: string): Promise<Todo | null> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.todos) memoryStore.todos = new Map();
      for (const todo of memoryStore.todos.values()) {
        const t = todo as Todo;
        if (t.employeeId === employeeId && t.type === type && t.relatedId === relatedId && t.status === 'pending') {
          return t;
        }
      }
      return null;
    }

    const sql = `
      SELECT id, employee_id as "employeeId", type, title, description,
        due_date as "dueDate", status, link, related_id as "relatedId",
        created_at as "createdAt", completed_at as "completedAt"
      FROM todos
      WHERE employee_id = $1 AND type = $2 AND related_id = $3 AND status = 'pending'
      LIMIT 1
    `;
    const results = await query(sql, [employeeId, type, relatedId]);
    return results.length > 0 ? (results[0] as Todo) : null;
  }
}
