import { query, memoryDB, USE_MEMORY_DB, memoryStore } from '../config/database';
import { Department, Position } from '../types';

const normalizeDepartmentName = (name: string | undefined): string => String(name || '').trim();

const departmentDedupeKey = (dept: Department): string => {
  const parentId = dept.parentId ? String(dept.parentId).trim() : '';
  return `${parentId}::${normalizeDepartmentName(dept.name)}`;
};

const compareDepartmentPriority = (left: Department, right: Department): number => {
  if (left.status !== right.status) {
    return left.status === 'active' ? -1 : 1;
  }
  const sortDiff = (left.sortOrder || 0) - (right.sortOrder || 0);
  if (sortDiff !== 0) return sortDiff;
  return String(left.createdAt || '').localeCompare(String(right.createdAt || ''));
};

export class OrganizationModel {
  // ============ 部门管理 ============

  // 获取所有部门（树形结构）
  static async getDepartmentTree(): Promise<Department[]> {
    if (USE_MEMORY_DB) {
      const depts = Array.from(memoryStore.departments?.values() || []);
      return this.buildTree(depts as Department[]);
    }

    const sql = `
      SELECT
        id, name, code, parent_id as "parentId",
        manager_id as "managerId", sort_order as "sortOrder",
        status, created_at as "createdAt", updated_at as "updatedAt"
      FROM departments
      WHERE status = 'active'
      ORDER BY sort_order, name
    `;
    const depts = await query(sql);
    return this.buildTree(depts.map(this.formatDepartment));
  }

  // 获取所有部门（扁平列表）
  static async findAllDepartments(): Promise<Department[]> {
    if (USE_MEMORY_DB) {
      return this.dedupeDepartments(Array.from(memoryStore.departments?.values() || []) as Department[]);
    }

    const sql = `
      SELECT
        id, name, code, parent_id as "parentId",
        manager_id as "managerId", sort_order as "sortOrder",
        status, created_at as "createdAt", updated_at as "updatedAt"
      FROM departments
      WHERE status = 'active'
      ORDER BY sort_order, name
    `;
    const results = await query(sql);
    return this.dedupeDepartments(results.map(this.formatDepartment));
  }

  // 根据ID获取部门
  static async findDepartmentById(id: string): Promise<Department | null> {
    if (USE_MEMORY_DB) {
      return memoryStore.departments?.get(id) as Department || null;
    }

    const sql = `
      SELECT
        id, name, code, parent_id as "parentId",
        manager_id as "managerId", sort_order as "sortOrder",
        status, created_at as "createdAt", updated_at as "updatedAt"
      FROM departments
      WHERE id = ?
    `;
    const results = await query(sql, [id]);
    return results.length > 0 ? this.formatDepartment(results[0]) : null;
  }
  
  // 创建部门
  static async createDepartment(dept: Omit<Department, 'createdAt' | 'updatedAt'>): Promise<Department> {
    const now = new Date().toISOString();
    const newDept: Department = { ...dept, createdAt: now, updatedAt: now };
    
    if (USE_MEMORY_DB) {
      if (!memoryStore.departments) memoryStore.departments = new Map();
      memoryStore.departments.set(dept.id, newDept);
      return newDept;
    }
    
    const sql = `
      INSERT INTO departments (id, name, code, parent_id, manager_id, sort_order, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      dept.id, dept.name, dept.code, dept.parentId || null,
      dept.managerId || null, dept.sortOrder, dept.status
    ]);
    
    return newDept;
  }
  
  // 更新部门
  static async updateDepartment(id: string, updates: Partial<Department>): Promise<Department | null> {
    if (USE_MEMORY_DB) {
      const existing = memoryStore.departments?.get(id) as Department;
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      memoryStore.departments?.set(id, updated);
      return updated;
    }
    
    const allowedFields = ['name', 'code', 'parent_id', 'manager_id', 'sort_order', 'status'];
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(dbField) && value !== undefined) {
        fields.push(`${dbField} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return this.findDepartmentById(id);
    
    const sql = `UPDATE departments SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    values.push(id);
    
    await query(sql, values);
    return this.findDepartmentById(id);
  }
  
  // 删除部门（软删除）
  static async deleteDepartment(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      const dept = memoryStore.departments?.get(id) as Department;
      if (!dept) return false;
      dept.status = 'inactive';
      dept.updatedAt = new Date().toISOString();
      memoryStore.departments?.set(id, dept);
      return true;
    }
    
    const sql = `UPDATE departments SET status = 'inactive', updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const result = await query(sql, [id]) as unknown as { affectedRows: number };
    return result.affectedRows > 0;
  }
  
  // ============ 岗位管理 ============
  
  // 获取所有岗位
  static async findAllPositions(): Promise<Position[]> {
    if (USE_MEMORY_DB) {
      return Array.from(memoryStore.positions?.values() || []) as Position[];
    }
    
    const sql = `
      SELECT 
        p.*,
        d.name as "departmentName"
      FROM positions p
      LEFT JOIN departments d ON p.department_id = d.id
      ORDER BY p.department_id, p.sort_order
    `;
    const results = await query(sql);
    return results.map(this.formatPosition);
  }
  
  // 根据部门获取岗位
  static async findPositionsByDepartment(departmentId: string): Promise<Position[]> {
    if (USE_MEMORY_DB) {
      return (Array.from(memoryStore.positions?.values() || []) as Position[])
        .filter(p => p.departmentId === departmentId);
    }
    
    const sql = `
      SELECT 
        p.*,
        d.name as "departmentName"
      FROM positions p
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE p.department_id = ?
      ORDER BY p.sort_order
    `;
    const results = await query(sql, [departmentId]);
    return results.map(this.formatPosition);
  }
  
  // 创建岗位
  static async createPosition(pos: Omit<Position, 'createdAt' | 'updatedAt'>): Promise<Position> {
    const now = new Date().toISOString();
    const newPos: Position = { ...pos, createdAt: now, updatedAt: now };
    
    if (USE_MEMORY_DB) {
      if (!memoryStore.positions) memoryStore.positions = new Map();
      memoryStore.positions.set(pos.id, newPos);
      return newPos;
    }
    
    const sql = `
      INSERT INTO positions (id, name, code, department_id, level, category, description, requirements, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    await query(sql, [
      pos.id, pos.name, pos.code, pos.departmentId,
      pos.level, pos.category, pos.description || null,
      pos.requirements || null, pos.status
    ]);
    
    return newPos;
  }
  
  // 更新岗位
  static async updatePosition(id: string, updates: Partial<Position>): Promise<Position | null> {
    if (USE_MEMORY_DB) {
      const existing = memoryStore.positions?.get(id) as Position;
      if (!existing) return null;
      const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
      memoryStore.positions?.set(id, updated);
      return updated;
    }
    
    const allowedFields = ['name', 'code', 'department_id', 'level', 'category', 'description', 'requirements', 'status'];
    const fields: string[] = [];
    const values: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      if (allowedFields.includes(dbField) && value !== undefined) {
        fields.push(`${dbField} = ?`);
        values.push(value);
      }
    });
    
    if (fields.length === 0) return this.findPositionById(id);
    
    const sql = `UPDATE positions SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    values.push(id);
    
    await query(sql, values);
    return this.findPositionById(id);
  }
  
  // 根据ID获取岗位
  static async findPositionById(id: string): Promise<Position | null> {
    if (USE_MEMORY_DB) {
      return memoryStore.positions?.get(id) as Position || null;
    }
    
    const sql = `
      SELECT 
        p.*,
        d.name as "departmentName"
      FROM positions p
      LEFT JOIN departments d ON p.department_id = d.id
      WHERE p.id = ?
    `;
    const results = await query(sql, [id]);
    return results.length > 0 ? this.formatPosition(results[0]) : null;
  }
  
  // 删除岗位
  static async deletePosition(id: string): Promise<boolean> {
    if (USE_MEMORY_DB) {
      return memoryStore.positions?.delete(id) || false;
    }
    
    const sql = 'DELETE FROM positions WHERE id = ?';
    const result = await query(sql, [id]) as unknown as { affectedRows: number };
    return result.affectedRows > 0;
  }
  
  // ============ 辅助方法 ============

  static dedupeDepartments(departments: Department[]): Department[] {
    const activeDepartments = departments
      .filter((dept) => !dept.status || dept.status === 'active')
      .map((dept) => ({ ...dept, name: normalizeDepartmentName(dept.name), children: undefined }));

    const chooseUnique = (items: Department[]): { unique: Department[]; alias: Map<string, string> } => {
      const grouped = new Map<string, Department[]>();
      for (const dept of items) {
        const key = departmentDedupeKey(dept);
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(dept);
      }

      const unique: Department[] = [];
      const alias = new Map<string, string>();
      for (const group of grouped.values()) {
        const keeper = [...group].sort(compareDepartmentPriority)[0];
        unique.push(keeper);
        for (const dept of group) {
          if (dept.id !== keeper.id) {
            alias.set(dept.id, keeper.id);
          }
        }
      }
      return { unique, alias };
    };

    const firstPass = chooseUnique(activeDepartments);
    const canonicalized = activeDepartments.map((dept) => ({
      ...dept,
      parentId: dept.parentId && firstPass.alias.has(dept.parentId)
        ? firstPass.alias.get(dept.parentId)
        : dept.parentId,
    }));
    const secondPass = chooseUnique(canonicalized);

    return secondPass.unique.sort((a, b) => {
      const sortDiff = (a.sortOrder || 0) - (b.sortOrder || 0);
      if (sortDiff !== 0) return sortDiff;
      return a.name.localeCompare(b.name);
    });
  }
  
  private static buildTree(departments: Department[]): Department[] {
    const deduped = this.dedupeDepartments(departments);
    const deptMap = new Map<string, Department>();
    const roots: Department[] = [];
    
    deduped.forEach(dept => {
      const node = { ...dept, children: [] };
      deptMap.set(dept.id, node);
    });
    
    deduped.forEach(dept => {
      const node = deptMap.get(dept.id)!;
      if (dept.parentId && deptMap.has(dept.parentId)) {
        const parent = deptMap.get(dept.parentId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    });
    
    return roots;
  }
  
  private static formatDepartment(row: any): Department {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      parentId: row.parentId || row.parentid || row.parent_id,
      managerId: row.managerId || row.managerid || row.manager_id,
      managerName: row.managerName || row.managername || row.manager_name,
      sortOrder: row.sortOrder || row.sortorder || row.sort_order || 0,
      status: row.status,
      createdAt: row.createdAt || row.createdat || row.created_at,
      updatedAt: row.updatedAt || row.updatedat || row.updated_at
    };
  }
  
  private static formatPosition(row: any): Position {
    return {
      id: row.id,
      name: row.name,
      code: row.code,
      departmentId: row.departmentId || row.departmentid || row.department_id,
      departmentName: row.departmentName || row.departmentname || row.department_name,
      level: row.level,
      category: row.category,
      description: row.description,
      requirements: row.requirements,
      status: row.status,
      createdAt: row.createdAt || row.created_at,
      updatedAt: row.updatedAt || row.updated_at
    };
  }
}
