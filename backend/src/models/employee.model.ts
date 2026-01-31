import { query, memoryDB, USE_MEMORY_DB } from '../config/database';
import { cache, CACHE_KEYS } from '../config/cache';
import { Employee, EmployeeLevel, EmployeeRole } from '../types';
import bcrypt from 'bcryptjs';

function invalidateEmployeeCache(): void {
  cache.invalidateByPrefix('employee:');
}

export class EmployeeModel {
  // 根据ID查找员工（MySQL + optional read cache）
  static async findById(id: string): Promise<(Employee & { password?: string }) | null> {
    if (USE_MEMORY_DB) {
      return memoryDB.employees.findById(id) as (Employee & { password?: string }) | null;
    }
    const cacheKey = CACHE_KEYS.employee(id);
    const cached = cache.get<Employee & { password?: string }>(cacheKey);
    if (cached) return cached;

    const sql = `
      SELECT 
        id, name, department, sub_department as subDepartment, 
        role, level, manager_id as managerId, avatar, created_at as createdAt, updated_at as updatedAt
      FROM employees 
      WHERE id = ?
    `;
    const results = (await query(sql, [id])) as (Employee & { password?: string })[];
    const row = results.length > 0 ? results[0] : null;
    if (row) cache.set(cacheKey, row);
    return row;
  }

  // 根据姓名查找员工（MySQL + optional read cache）
  static async findByName(name: string): Promise<(Employee & { password?: string }) | null> {
    if (USE_MEMORY_DB) {
      return memoryDB.employees.findByName(name) as (Employee & { password?: string }) | null;
    }
    const cacheKey = CACHE_KEYS.employeeByName(name);
    const cached = cache.get<Employee & { password?: string }>(cacheKey);
    if (cached) return cached;

    const sql = `
      SELECT 
        id, name, department, sub_department as subDepartment, 
        role, level, manager_id as managerId, avatar, password,
        created_at as createdAt, updated_at as updatedAt
      FROM employees 
      WHERE name = ?
    `;
    const results = (await query(sql, [name])) as (Employee & { password?: string })[];
    const row = results.length > 0 ? results[0] : null;
    if (row) cache.set(cacheKey, row);
    return row;
  }

  // 获取所有员工
  static async findAll(): Promise<Employee[]> {
    if (USE_MEMORY_DB) {
      return memoryDB.employees.findAll();
    }
    
    const sql = `
      SELECT 
        id, name, department, sub_department as subDepartment, 
        role, level, manager_id as managerId, avatar,
        created_at as createdAt, updated_at as updatedAt
      FROM employees
      ORDER BY department, sub_department, role, name
    `;
    return await query(sql) as Employee[];
  }

  // 根据角色获取员工
  static async findByRole(role: EmployeeRole): Promise<Employee[]> {
    if (USE_MEMORY_DB) {
      return memoryDB.employees.findByRole(role);
    }
    
    const sql = `
      SELECT 
        id, name, department, sub_department as subDepartment, 
        role, level, manager_id as managerId, avatar,
        created_at as createdAt, updated_at as updatedAt
      FROM employees 
      WHERE role = ?
      ORDER BY name
    `;
    return await query(sql, [role]) as Employee[];
  }

  // 获取经理的所有下属
  static async findByManagerId(managerId: string): Promise<Employee[]> {
    if (USE_MEMORY_DB) {
      return memoryDB.employees.findByManagerId(managerId);
    }
    
    const sql = `
      SELECT 
        id, name, department, sub_department as subDepartment, 
        role, level, manager_id as managerId, avatar,
        created_at as createdAt, updated_at as updatedAt
      FROM employees 
      WHERE manager_id = ?
      ORDER BY name
    `;
    return await query(sql, [managerId]) as Employee[];
  }

  // 获取部门下的所有员工
  static async findByDepartment(department: string): Promise<Employee[]> {
    if (USE_MEMORY_DB) {
      return memoryDB.employees.findAll().filter(e =>
        e.department === department || e.subDepartment === department
      );
    }

    const sql = `
      SELECT
        id, name, department, sub_department as subDepartment,
        role, level, manager_id as managerId, avatar,
        created_at as createdAt, updated_at as updatedAt
      FROM employees
      WHERE department = ? OR sub_department = ?
      ORDER BY name
    `;
    return await query(sql, [department, department]) as Employee[];
  }

  // 创建员工
  static async create(employee: Omit<Employee, 'createdAt' | 'updatedAt'> & { password: string }): Promise<Employee> {
    if (USE_MEMORY_DB) {
      return memoryDB.employees.create(employee);
    }
    
    const sql = `
      INSERT INTO employees (id, name, department, sub_department, role, level, manager_id, avatar, password)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(employee.password, 10);
    
    await query(sql, [
      employee.id,
      employee.name,
      employee.department,
      employee.subDepartment,
      employee.role,
      employee.level,
      employee.managerId || null,
      employee.avatar || null,
      hashedPassword
    ]);
    invalidateEmployeeCache();
    return this.findById(employee.id) as Promise<Employee>;
  }

  // 更新员工
  static async update(id: string, updates: Partial<Employee>): Promise<Employee | null> {
    if (USE_MEMORY_DB) {
      const result = memoryDB.employees.update(id, updates);
      return result || null;
    }
    
    const allowedFields = ['name', 'department', 'sub_department', 'role', 'level', 'manager_id', 'avatar'];
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(dbField) && value !== undefined) {
        fields.push(`${dbField} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return this.findById(id);
    
    const sql = `UPDATE employees SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    
    await query(sql, values);
    invalidateEmployeeCache();
    return this.findById(id);
  }

  // 删除员工
  static async delete(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      return memoryDB.employees.delete(id);
    }
    const sql = 'DELETE FROM employees WHERE id = ?';
    const result = (await query(sql, [id])) as { affectedRows?: number };
    if ((result?.affectedRows ?? 0) > 0) invalidateEmployeeCache();
    return (result?.affectedRows ?? 0) > 0;
  }

  // 验证密码
  static async verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  // 修改密码
  static async updatePassword(id: string, newPassword: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      const emp = memoryDB.employees.findById(id);
      if (!emp) return false;
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      memoryDB.employees.update(id, { password: hashedPassword } as Partial<Employee>);
      return true;
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const sql = 'UPDATE employees SET password = ? WHERE id = ?';
    const result = (await query(sql, [hashedPassword, id])) as { affectedRows?: number };
    if ((result?.affectedRows ?? 0) > 0) invalidateEmployeeCache();
    return (result?.affectedRows ?? 0) > 0;
  }

  // 批量插入员工（初始化用）
  static async batchInsert(employees: Array<Omit<Employee, 'createdAt' | 'updatedAt'> & { password: string }>): Promise<void> {
    if (USE_MEMORY_DB) {
      for (const emp of employees) {
        memoryDB.employees.create(emp);
      }
      return;
    }
    
    for (const employee of employees) {
      const hashedPassword = await bcrypt.hash(employee.password, 10);
      await query(
        `INSERT INTO employees (id, name, department, sub_department, role, level, manager_id, avatar, password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name, 
         department = EXCLUDED.department, 
         sub_department = EXCLUDED.sub_department,
         role = EXCLUDED.role,
         level = EXCLUDED.level,
         manager_id = EXCLUDED.manager_id`,
        [
          employee.id,
          employee.name,
          employee.department,
          employee.subDepartment,
          employee.role,
          employee.level,
          employee.managerId || null,
          employee.avatar || null,
          hashedPassword
        ]
      );
    }
  }
}
