import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';
import logger from '../config/logger';
import { getDepartmentType } from './levelTemplateRule.model';

export interface EmployeeTemplateBinding {
  id: string;
  employeeId: string;
  templateId: string;
  boundBy: string;
  boundAt: string;
  // join 后附加
  employeeName?: string;
  department?: string;
  templateName?: string;
  departmentType?: string;
}

export class EmployeeTemplateBindingModel {
  /**
   * 为员工绑定模板（upsert：已存在则更新）
   */
  static async upsert(employeeId: string, templateId: string, boundBy: string): Promise<EmployeeTemplateBinding> {
    const existing = await this.findByEmployee(employeeId);
    if (existing) {
      const sql = `
        UPDATE employee_template_bindings 
        SET template_id = $1, bound_by = $2, bound_at = NOW()
        WHERE employee_id = $3
        RETURNING *
      `;
      const results = await query(sql, [templateId, boundBy, employeeId]);
      return this.mapRow(results[0]);
    }

    const id = uuidv4();
    const sql = `
      INSERT INTO employee_template_bindings (id, employee_id, template_id, bound_by)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const results = await query(sql, [id, employeeId, templateId, boundBy]);
    return this.mapRow(results[0]);
  }

  /**
   * 批量绑定（部门经理一次性为多个下属设置模板）
   */
  static async batchUpsert(bindings: Array<{ employeeId: string; templateId: string }>, boundBy: string): Promise<number> {
    let count = 0;
    for (const b of bindings) {
      await this.upsert(b.employeeId, b.templateId, boundBy);
      count++;
    }
    return count;
  }

  /**
   * 查询员工的绑定模板
   */
  static async findByEmployee(employeeId: string): Promise<EmployeeTemplateBinding | null> {
    const sql = `
      SELECT b.*, t.name as template_name, t.department_type
      FROM employee_template_bindings b
      LEFT JOIN assessment_templates t ON t.id = b.template_id
      WHERE b.employee_id = $1
    `;
    const results = await query(sql, [employeeId]);
    if (results.length === 0) return null;
    const row = results[0];
    return {
      ...this.mapRow(row),
      templateName: row.template_name,
      departmentType: row.department_type
    };
  }

  /**
   * 获取模板解析结果：优先绑定 → 自动匹配 → 默认兜底
   * 返回带完整指标数据的模板
   */
  static async resolveTemplate(employeeId: string, employee: {
    role?: string; level?: string; position?: string; department?: string;
  }): Promise<{ source: 'binding' | 'matched' | 'default'; template: any } | null> {
    // 动态导入避免循环依赖
    const { AssessmentTemplateModel } = await import('./assessmentTemplate.model');

    // 1. 优先查绑定
    const binding = await this.findByEmployee(employeeId);
    if (binding) {
      const template = await AssessmentTemplateModel.findById(binding.templateId, true);
      if (template) {
        return { source: 'binding', template };
      }
    }

    // 2. 自动匹配（岗位+层级+角色+部门）
    const matched = await AssessmentTemplateModel.findMatchingTemplate(employee);
    if (matched) {
      const template = await AssessmentTemplateModel.findById(matched.id, true);
      if (template) {
        return { source: 'matched', template };
      }
    }

    // 3. 部门类型默认模板兜底
    const deptType = getDepartmentType(employee.department || '');

    const defaultTemplate = await AssessmentTemplateModel.getDefaultTemplate(deptType);
    if (defaultTemplate) {
      return { source: 'default', template: defaultTemplate };
    }

    return null;
  }

  /**
   * 查询经理下属的所有绑定
   */
  static async findByManager(managerId: string): Promise<EmployeeTemplateBinding[]> {
    const sql = `
      SELECT b.*, e.name as employee_name, e.department, t.name as template_name, t.department_type
      FROM employee_template_bindings b
      JOIN employees e ON e.id = b.employee_id
      LEFT JOIN assessment_templates t ON t.id = b.template_id
      WHERE e.manager_id = $1
      ORDER BY e.department, e.name
    `;
    const results = await query(sql, [managerId]);
    return results.map(r => ({
      ...this.mapRow(r),
      employeeName: r.employee_name,
      department: r.department,
      templateName: r.template_name,
      departmentType: r.department_type
    }));
  }

  /**
   * 查询所有绑定（HR/管理员用）
   */
  static async findAll(filters?: { department?: string; templateId?: string }): Promise<EmployeeTemplateBinding[]> {
    let sql = `
      SELECT b.*, e.name as employee_name, e.department, t.name as template_name, t.department_type
      FROM employee_template_bindings b
      JOIN employees e ON e.id = b.employee_id
      LEFT JOIN assessment_templates t ON t.id = b.template_id
      WHERE 1=1
    `;
    const params: any[] = [];
    let idx = 1;

    if (filters?.department) {
      sql += ` AND e.department = $${idx++}`;
      params.push(filters.department);
    }
    if (filters?.templateId) {
      sql += ` AND b.template_id = $${idx++}`;
      params.push(filters.templateId);
    }

    sql += ` ORDER BY e.department, e.name`;
    const results = await query(sql, params);
    return results.map(r => ({
      ...this.mapRow(r),
      employeeName: r.employee_name,
      department: r.department,
      templateName: r.template_name,
      departmentType: r.department_type
    }));
  }

  /**
   * 删除绑定
   */
  static async delete(employeeId: string): Promise<boolean> {
    const sql = 'DELETE FROM employee_template_bindings WHERE employee_id = $1';
    await query(sql, [employeeId]);
    return true;
  }

  /**
   * 统计：已绑定 / 未绑定员工数
   */
  static async getBindingStats(): Promise<{ total: number; bound: number; unbound: number; byDepartment: Record<string, { total: number; bound: number }> }> {
    const totalSql = `SELECT count(*) as cnt FROM employees WHERE status = 'active' AND role IN ('employee', 'manager')`;
    const totalResult = await query(totalSql);
    const total = parseInt(totalResult[0]?.cnt || '0');

    const boundSql = `SELECT count(*) as cnt FROM employee_template_bindings`;
    const boundResult = await query(boundSql);
    const bound = parseInt(boundResult[0]?.cnt || '0');

    const deptSql = `
      SELECT e.department, count(e.id) as total,
        count(b.id) as bound
      FROM employees e
      LEFT JOIN employee_template_bindings b ON b.employee_id = e.id
      WHERE e.status = 'active' AND e.role IN ('employee', 'manager')
      GROUP BY e.department
      ORDER BY e.department
    `;
    const deptResults = await query(deptSql);
    const byDepartment: Record<string, { total: number; bound: number }> = {};
    for (const r of deptResults) {
      byDepartment[r.department] = {
        total: parseInt(r.total),
        bound: parseInt(r.bound)
      };
    }

    return { total, bound, unbound: total - bound, byDepartment };
  }

  private static mapRow(row: any): EmployeeTemplateBinding {
    return {
      id: row.id,
      employeeId: row.employee_id,
      templateId: row.template_id,
      boundBy: row.bound_by,
      boundAt: row.bound_at
    };
  }
}
