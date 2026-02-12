import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { EmployeeModel } from './employee.model';
import type { Appeal } from '../types';
import logger from '../config/logger';

export class AppealModel {
  /**
   * 创建申诉记录
   */
  static async create(data: Omit<Appeal, 'id' | 'createdAt' | 'updatedAt'>): Promise<Appeal> {
    const id = `appeal-${data.employeeId}-${data.performanceRecordId}-${Date.now()}`;
    
    if (USE_MEMORY_DB) {
      const record: Appeal = {
        id,
        ...data,
        status: 'pending',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      if (!memoryStore.appeals) {
        memoryStore.appeals = new Map();
      }
      memoryStore.appeals.set(id, record);
      logger.info(`创建申诉记录到内存: ${id}`);
      
      return record;
    }
    
    const sql = `
      INSERT INTO appeals (
        id, performance_record_id, employee_id, reason, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;
    
    const results = await query(sql, [
      id,
      data.performanceRecordId,
      data.employeeId,
      data.reason,
      'pending'
    ]);
    
    return this.formatAppeal(results[0]);
  }
  
  /**
   * 根据ID查找申诉
   */
  static async findById(id: string): Promise<Appeal | null> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.appeals) {
        return null;
      }
      const appeal = memoryStore.appeals.get(id);
      return appeal || null;
    }
    
    const sql = `
      SELECT 
        a.*,
        e.name as employee_name,
        e.department,
        e.sub_department,
        hr.name as hr_name
      FROM appeals a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN employees hr ON a.hr_id = hr.id
      WHERE a.id = $1
    `;
    
    const results = await query(sql, [id]);
    return results.length > 0 ? this.formatAppeal(results[0]) : null;
  }
  
  /**
   * 获取员工自己的申诉列表
   */
  static async findByEmployeeId(employeeId: string): Promise<Appeal[]> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.appeals) {
        return [];
      }
      const allAppeals = Array.from(memoryStore.appeals.values());
      return allAppeals.filter(a => a.employeeId === employeeId);
    }
    
    const sql = `
      SELECT 
        a.*,
        e.name as employee_name,
        e.department,
        e.sub_department,
        hr.name as hr_name
      FROM appeals a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN employees hr ON a.hr_id = hr.id
      WHERE a.employee_id = $1
      ORDER BY a.created_at DESC
    `;
    
    const results = await query(sql, [employeeId]);
    return results.map(r => this.formatAppeal(r));
  }
  
  /**
   * 获取所有申诉（HR查看）
   */
  static async findAll(filters?: {
    status?: 'pending' | 'approved' | 'rejected';
    department?: string;
  }): Promise<Appeal[]> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.appeals) {
        return [];
      }
      let allAppeals = Array.from(memoryStore.appeals.values());
      
      if (filters?.status) {
        allAppeals = allAppeals.filter(a => a.status === filters.status);
      }
      
      if (filters?.department) {
        allAppeals = allAppeals.filter(a => a.department === filters.department);
      }
      
      return allAppeals;
    }
    
    let sql = `
      SELECT 
        a.*,
        e.name as employee_name,
        e.department,
        e.sub_department,
        hr.name as hr_name
      FROM appeals a
      JOIN employees e ON a.employee_id = e.id
      LEFT JOIN employees hr ON a.hr_id = hr.id
      WHERE 1=1
    `;
    
    const params: any[] = [];
    let paramIndex = 1;
    
    if (filters?.status) {
      sql += ` AND a.status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }
    
    if (filters?.department) {
      sql += ` AND e.department = $${paramIndex}`;
      params.push(filters.department);
      paramIndex++;
    }
    
    sql += ` ORDER BY a.created_at DESC`;
    
    const results = await query(sql, params);
    return results.map(r => this.formatAppeal(r));
  }
  
  /**
   * 处理申诉（HR操作）
   */
  static async review(
    id: string,
    hrId: string,
    status: 'approved' | 'rejected',
    hrComment?: string
  ): Promise<Appeal> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.appeals) {
        throw new Error('申诉记录不存在');
      }
      
      const appeal = memoryStore.appeals.get(id);
      if (!appeal) {
        throw new Error('申诉记录不存在');
      }
      
      const hr = await EmployeeModel.findById(hrId);
      
      const updated: Appeal = {
        ...appeal,
        status,
        hrId,
        hrName: hr?.name,
        hrComment,
        updatedAt: new Date()
      };
      
      memoryStore.appeals.set(id, updated);
      logger.info(`更新申诉记录: ${id}, 状态: ${status}`);
      
      return updated;
    }
    
    const sql = `
      UPDATE appeals
      SET status = $1, hr_id = $2, hr_comment = $3, updated_at = NOW()
      WHERE id = $4
    `;
    
    await query(sql, [status, hrId, hrComment, id]);
    
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('申诉记录不存在');
    }
    
    return updated;
  }
  
  /**
   * 检查员工是否已对某绩效记录提交申诉
   */
  static async existsByPerformanceRecord(
    employeeId: string,
    performanceRecordId: string
  ): Promise<boolean> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.appeals) {
        return false;
      }
      const allAppeals = Array.from(memoryStore.appeals.values());
      return allAppeals.some(
        a => a.employeeId === employeeId && a.performanceRecordId === performanceRecordId
      );
    }
    
    const sql = `
      SELECT COUNT(*) as count
      FROM appeals
      WHERE employee_id = $1 AND performance_record_id = $2
    `;
    
    const results = await query(sql, [employeeId, performanceRecordId]);
    return results[0].count > 0;
  }
  
  /**
   * 格式化申诉记录
   */
  private static formatAppeal(row: any): Appeal {
    return {
      id: row.id,
      performanceRecordId: row.performance_record_id,
      employeeId: row.employee_id,
      employeeName: row.employee_name,
      department: row.department,
      subDepartment: row.sub_department,
      reason: row.reason,
      status: row.status,
      hrComment: row.hr_comment,
      hrId: row.hr_id,
      hrName: row.hr_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
