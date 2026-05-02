import { query, memoryDB, USE_MEMORY_DB } from '../config/database';
import { cache, CACHE_KEYS } from '../config/cache';
import { Employee, EmployeeLevel, EmployeeRole } from '../types';
import bcrypt from 'bcryptjs';

function invalidateEmployeeCache(): void {
  cache.invalidateByPrefix('employee:');
}

function isActiveEmployee(employee: any): boolean {
  return !employee?.status || employee.status === 'active';
}

function isAssessableRole(employee: any): boolean {
  return employee?.role === 'employee' || employee?.role === 'manager';
}

function isInDepartmentScope(employee: any, manager: any): boolean {
  if (!manager?.department || employee?.department !== manager.department) return false;
  const managerSubDepartment = String(manager.subDepartment || '').trim();
  if (!managerSubDepartment) return true;

  const employeeSubDepartment = String(employee.subDepartment || '').trim();
  return employeeSubDepartment === managerSubDepartment || employeeSubDepartment.startsWith(`${managerSubDepartment}/`);
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
        id, name, department, sub_department as "subDepartment",
        wecom_user_id as "wecomUserId",
        position, role, level, manager_id as "managerId", avatar, password, status,
        id_card_last6_hash as "idCardLast6Hash",
        created_at as "createdAt", updated_at as "updatedAt"
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
        id, name, department, sub_department as "subDepartment",
        wecom_user_id as "wecomUserId",
        position, role, level, manager_id as "managerId", avatar, password, status,
        id_card_last6_hash as "idCardLast6Hash",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM employees
      WHERE name = ?
    `;
    const results = (await query(sql, [name])) as (Employee & { password?: string })[];
    const row = results.length > 0 ? results[0] : null;
    if (row) cache.set(cacheKey, row);
    return row;
  }

  // 根据姓名查找员工（可能同名）
  static async findAllByName(name: string): Promise<Array<Employee & { password?: string }>> {
    if (USE_MEMORY_DB) {
      return memoryDB.employees.findAll().filter((e: any) => e.name === name) as Array<Employee & { password?: string }>;
    }
    const sql = `
      SELECT
        id, name, department, sub_department as "subDepartment",
        wecom_user_id as "wecomUserId",
        position, role, level, manager_id as "managerId", avatar, password, status,
        id_card_last6_hash as "idCardLast6Hash",
        created_at as "createdAt", updated_at as "updatedAt"
      FROM employees
      WHERE name = ?
    `;
    return (await query(sql, [name])) as Array<Employee & { password?: string }>;
  }

  // 获取所有员工
  static async findAll(): Promise<Employee[]> {
    if (USE_MEMORY_DB) {
      return memoryDB.employees.findAll();
    }

    const sql = `
      SELECT
        id, name, department, sub_department as "subDepartment",
        wecom_user_id as "wecomUserId",
        position, role, level, manager_id as "managerId", avatar, email, status,
        created_at as "createdAt", updated_at as "updatedAt"
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
        id, name, department, sub_department as "subDepartment",
        wecom_user_id as "wecomUserId",
        position, role, level, manager_id as "managerId", avatar, email, status,
        created_at as "createdAt", updated_at as "updatedAt"
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
        id, name, department, sub_department as "subDepartment",
        wecom_user_id as "wecomUserId",
        position, role, level, manager_id as "managerId", avatar, email, status,
        created_at as "createdAt", updated_at as "updatedAt"
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
        id, name, department, sub_department as "subDepartment",
        wecom_user_id as "wecomUserId",
        position, role, level, manager_id as "managerId", avatar, email, status,
        created_at as "createdAt", updated_at as "updatedAt"
      FROM employees
      WHERE department = ? OR sub_department = ?
      ORDER BY name
    `;
    return await query(sql, [department, department]) as Employee[];
  }

  // 获取经理负责的团队成员：优先使用直接上级关系；如果只有自己/没有直接下属，则按所在部门兜底
  static async findTeamForManager(managerId: string): Promise<Employee[]> {
    const manager = await this.findById(managerId);
    const directReports = (await this.findByManagerId(managerId))
      .filter((employee: any) => employee.id !== managerId)
      .filter(isActiveEmployee)
      .filter(isAssessableRole);

    if (directReports.length > 0 || !manager) {
      return directReports;
    }

    const employees = (await this.findAll() as any[])
      .filter((employee: any) => employee.id !== managerId)
      .filter(isActiveEmployee)
      .filter(isAssessableRole)
      .filter((employee: any) => isInDepartmentScope(employee, manager));

    return employees as Employee[];
  }

  static async isInManagerTeam(managerId: string, employeeId: string): Promise<boolean> {
    const team = await this.findTeamForManager(managerId);
    return team.some((employee) => employee.id === employeeId);
  }

  // 创建员工
  static async create(
    employee: Omit<Employee, 'createdAt' | 'updatedAt'> & { password: string; idCardLast6?: string }
  ): Promise<Employee> {
    if (USE_MEMORY_DB) {
      const { idCardLast6, ...rest } = employee as any;
      const hashedPassword = await bcrypt.hash(employee.password, 10);
      const idCardLast6Hash = idCardLast6 ? await bcrypt.hash(String(idCardLast6), 10) : undefined;
      return memoryDB.employees.create({
        ...rest,
        password: hashedPassword,
        ...(idCardLast6Hash ? { idCardLast6Hash } : {}),
      } as any);
    }
    
    const sql = `
      INSERT INTO employees (id, name, department, sub_department, role, level, manager_id, avatar, wecom_user_id, password, id_card_last6_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    // 加密密码
    const hashedPassword = await bcrypt.hash(employee.password, 10);
    const idCardLast6Hash = employee.idCardLast6 ? await bcrypt.hash(employee.idCardLast6, 10) : null;
    
    await query(sql, [
      employee.id,
      employee.name,
      employee.department,
      employee.subDepartment,
      employee.role,
      employee.level,
      employee.managerId || null,
      employee.avatar || null,
      employee.wecomUserId || null,
      hashedPassword,
      idCardLast6Hash
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
    
    const allowedFields = ['name', 'department', 'sub_department', 'position', 'role', 'level', 'manager_id', 'avatar', 'status', 'wecom_user_id'];
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

  // 更新身份证后六位（用于登录，存 bcrypt hash）
  static async updateIdCardLast6(id: string, idCardLast6: string): Promise<boolean> {
    const normalized = idCardLast6.trim().toUpperCase();
    const hashed = await bcrypt.hash(normalized, 10);

    if (USE_MEMORY_DB) {
      const emp = memoryDB.employees.findById(id);
      if (!emp) return false;
      memoryDB.employees.update(id, { idCardLast6Hash: hashed } as any);
      return true;
    }

    const sql = 'UPDATE employees SET id_card_last6_hash = ? WHERE id = ?';
    const result = (await query(sql, [hashed, id])) as { affectedRows?: number };
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
         manager_id = EXCLUDED.manager_id,
         password = EXCLUDED.password`,
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
