"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeModel = void 0;
const database_1 = require("../config/database");
const cache_1 = require("../config/cache");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
function invalidateEmployeeCache() {
    cache_1.cache.invalidateByPrefix('employee:');
}
class EmployeeModel {
    // 根据ID查找员工（MySQL + optional read cache）
    static async findById(id) {
        if (database_1.USE_MEMORY_DB) {
            return database_1.memoryDB.employees.findById(id);
        }
        const cacheKey = cache_1.CACHE_KEYS.employee(id);
        const cached = cache_1.cache.get(cacheKey);
        if (cached)
            return cached;
        const sql = `
      SELECT 
        id, name, department, sub_department as subDepartment, 
        role, level, manager_id as managerId, avatar, created_at as createdAt, updated_at as updatedAt
      FROM employees 
      WHERE id = ?
    `;
        const results = (await (0, database_1.query)(sql, [id]));
        const row = results.length > 0 ? results[0] : null;
        if (row)
            cache_1.cache.set(cacheKey, row);
        return row;
    }
    // 根据姓名查找员工（MySQL + optional read cache）
    static async findByName(name) {
        if (database_1.USE_MEMORY_DB) {
            return database_1.memoryDB.employees.findByName(name);
        }
        const cacheKey = cache_1.CACHE_KEYS.employeeByName(name);
        const cached = cache_1.cache.get(cacheKey);
        if (cached)
            return cached;
        const sql = `
      SELECT 
        id, name, department, sub_department as subDepartment, 
        role, level, manager_id as managerId, avatar, password,
        created_at as createdAt, updated_at as updatedAt
      FROM employees 
      WHERE name = ?
    `;
        const results = (await (0, database_1.query)(sql, [name]));
        const row = results.length > 0 ? results[0] : null;
        if (row)
            cache_1.cache.set(cacheKey, row);
        return row;
    }
    // 获取所有员工
    static async findAll() {
        if (database_1.USE_MEMORY_DB) {
            return database_1.memoryDB.employees.findAll();
        }
        const sql = `
      SELECT 
        id, name, department, sub_department as subDepartment, 
        role, level, manager_id as managerId, avatar,
        created_at as createdAt, updated_at as updatedAt
      FROM employees
      ORDER BY department, sub_department, role, name
    `;
        return await (0, database_1.query)(sql);
    }
    // 根据角色获取员工
    static async findByRole(role) {
        if (database_1.USE_MEMORY_DB) {
            return database_1.memoryDB.employees.findByRole(role);
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
        return await (0, database_1.query)(sql, [role]);
    }
    // 获取经理的所有下属
    static async findByManagerId(managerId) {
        if (database_1.USE_MEMORY_DB) {
            return database_1.memoryDB.employees.findByManagerId(managerId);
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
        return await (0, database_1.query)(sql, [managerId]);
    }
    // 获取部门下的所有员工
    static async findByDepartment(department) {
        if (database_1.USE_MEMORY_DB) {
            return database_1.memoryDB.employees.findAll().filter(e => e.department === department || e.subDepartment === department);
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
        return await (0, database_1.query)(sql, [department, department]);
    }
    // 创建员工
    static async create(employee) {
        if (database_1.USE_MEMORY_DB) {
            return database_1.memoryDB.employees.create(employee);
        }
        const sql = `
      INSERT INTO employees (id, name, department, sub_department, role, level, manager_id, avatar, password)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
        // 加密密码
        const hashedPassword = await bcryptjs_1.default.hash(employee.password, 10);
        await (0, database_1.query)(sql, [
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
        return this.findById(employee.id);
    }
    // 更新员工
    static async update(id, updates) {
        if (database_1.USE_MEMORY_DB) {
            const result = database_1.memoryDB.employees.update(id, updates);
            return result || null;
        }
        const allowedFields = ['name', 'department', 'sub_department', 'role', 'level', 'manager_id', 'avatar'];
        const fields = [];
        const values = [];
        Object.entries(updates).forEach(([key, value]) => {
            const dbField = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            if (allowedFields.includes(dbField) && value !== undefined) {
                fields.push(`${dbField} = ?`);
                values.push(value);
            }
        });
        if (fields.length === 0)
            return this.findById(id);
        const sql = `UPDATE employees SET ${fields.join(', ')} WHERE id = ?`;
        values.push(id);
        await (0, database_1.query)(sql, values);
        invalidateEmployeeCache();
        return this.findById(id);
    }
    // 删除员工
    static async delete(id) {
        if (database_1.USE_MEMORY_DB) {
            return database_1.memoryDB.employees.delete(id);
        }
        const sql = 'DELETE FROM employees WHERE id = ?';
        const result = (await (0, database_1.query)(sql, [id]));
        if ((result?.affectedRows ?? 0) > 0)
            invalidateEmployeeCache();
        return (result?.affectedRows ?? 0) > 0;
    }
    // 验证密码
    static async verifyPassword(plainPassword, hashedPassword) {
        return bcryptjs_1.default.compare(plainPassword, hashedPassword);
    }
    // 修改密码
    static async updatePassword(id, newPassword) {
        if (database_1.USE_MEMORY_DB) {
            const emp = database_1.memoryDB.employees.findById(id);
            if (!emp)
                return false;
            const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
            database_1.memoryDB.employees.update(id, { password: hashedPassword });
            return true;
        }
        const hashedPassword = await bcryptjs_1.default.hash(newPassword, 10);
        const sql = 'UPDATE employees SET password = ? WHERE id = ?';
        const result = (await (0, database_1.query)(sql, [hashedPassword, id]));
        if ((result?.affectedRows ?? 0) > 0)
            invalidateEmployeeCache();
        return (result?.affectedRows ?? 0) > 0;
    }
    // 批量插入员工（初始化用）
    static async batchInsert(employees) {
        if (database_1.USE_MEMORY_DB) {
            for (const emp of employees) {
                database_1.memoryDB.employees.create(emp);
            }
            return;
        }
        for (const employee of employees) {
            const hashedPassword = await bcryptjs_1.default.hash(employee.password, 10);
            await (0, database_1.query)(`INSERT INTO employees (id, name, department, sub_department, role, level, manager_id, avatar, password)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (id) DO UPDATE SET 
         name = EXCLUDED.name, 
         department = EXCLUDED.department, 
         sub_department = EXCLUDED.sub_department,
         role = EXCLUDED.role,
         level = EXCLUDED.level,
         manager_id = EXCLUDED.manager_id,
         password = EXCLUDED.password`, [
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
        }
    }
}
exports.EmployeeModel = EmployeeModel;
//# sourceMappingURL=employee.model.js.map