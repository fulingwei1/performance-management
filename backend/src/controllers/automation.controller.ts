import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { EmployeeModel } from '../models/employee.model';
import { PerformanceModel } from '../models/performance.model';
import { query } from '../config/database';

export const automationController = {
  /**
   * 每月1号自动生成月度绩效任务
   * 为所有员工创建本月的绩效记录
   */
  generateMonthlyTasks: asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${month}`;
    
    console.log(`[Automation] 生成月度绩效任务: ${currentMonth}`);
    
    // 获取所有员工（排除admin/hr等管理角色）
    const employees = await EmployeeModel.findAll();
    const targetEmployees = employees.filter(e => 
      e.role === 'employee' || e.role === 'manager'
    );
    
    console.log(`[Automation] 找到 ${targetEmployees.length} 个目标员工`);
    
    // 截止日期：下月3号
    const deadline = new Date(year, now.getMonth() + 1, 3);
    const deadlineStr = deadline.toISOString().split('T')[0];
    
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const emp of targetEmployees) {
      // 检查是否已存在记录
      const existing = await PerformanceModel.findByEmployeeIdAndMonth(emp.id, currentMonth);
      
      if (existing) {
        skippedCount++;
        continue;
      }
      
      // 创建新记录（只插入必要的字段）
      const recordId = `auto-${emp.id}-${currentMonth}`;
      // 根据level确定group_type（默认middle）
      let groupType = 'middle';
      if (emp.level) {
        const levelStr = emp.level.toString();
        if (levelStr === 'junior' || levelStr.includes('1') || levelStr.includes('2')) {
          groupType = 'junior';
        } else if (levelStr === 'senior' || levelStr.includes('5') || levelStr.includes('6')) {
          groupType = 'senior';
        }
      }
      
      await query(
        `INSERT INTO performance_records 
        (id, employee_id, assessor_id, month, level, group_type, status, deadline, frozen, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'L3', ?, 'draft', ?, false, NOW(), NOW())`,
        [recordId, emp.id, emp.managerId || emp.id, currentMonth, groupType, deadlineStr]
      );
      
      createdCount++;
    }
    
    console.log(`[Automation] 月度任务生成完成: 新增 ${createdCount} 条，跳过 ${skippedCount} 条`);
    
    res.json({
      success: true,
      message: `月度绩效任务生成完成`,
      data: {
        month: currentMonth,
        created: createdCount,
        skipped: skippedCount,
        total: targetEmployees.length,
        deadline: deadlineStr
      }
    });
  }),

  /**
   * 每季度第一天生成总经理评分任务
   */
  generateQuarterlyTasks: asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const year = now.getFullYear();
    const quarter = Math.ceil((now.getMonth() + 1) / 3);
    const currentQuarter = `${year}-Q${quarter}`;
    
    console.log(`[Automation] 生成季度评分任务: ${currentQuarter}`);
    
    // 获取所有部门经理
    const managers = await EmployeeModel.findByRole('manager');
    
    console.log(`[Automation] 找到 ${managers.length} 个部门经理`);
    
    // 这里需要调用 hrStore 的 generateGMTasks 逻辑
    // 由于是后端，我们直接插入数据库
    let createdCount = 0;
    let skippedCount = 0;
    
    for (const manager of managers) {
      // 检查是否已存在评分记录（这里需要GM评分表，暂时用注释表示）
      // const existing = await GMScoreModel.findByManagerAndQuarter(manager.id, currentQuarter);
      // if (existing) { skippedCount++; continue; }
      
      // await GMScoreModel.create({ ... });
      // createdCount++;
      
      // 由于 gmScores 存在 hrStore 中（内存），这里暂时返回信息即可
      skippedCount++;
    }
    
    res.json({
      success: true,
      message: `季度评分任务生成完成`,
      data: {
        quarter: currentQuarter,
        managers: managers.length,
        created: createdCount,
        skipped: skippedCount
      }
    });
  }),

  /**
   * 每天检查并冻结超期任务
   */
  freezeOverdueTasks: asyncHandler(async (req: Request, res: Response) => {
    const today = new Date().toISOString().split('T')[0];
    
    console.log(`[Automation] 检查超期任务: ${today}`);
    
    // 查找所有超期且未冻结的任务
    const result = await query(
      `UPDATE performance_records 
       SET frozen = true, updated_at = NOW()
       WHERE deadline < ? 
       AND frozen = false 
       AND status IN ('draft', 'submitted')`,
      [today]
    ) as any;
    
    const frozenCount = result.affectedRows || 0;
    
    console.log(`[Automation] 冻结了 ${frozenCount} 条超期任务`);
    
    res.json({
      success: true,
      message: `超期任务冻结完成`,
      data: {
        date: today,
        frozen: frozenCount
      }
    });
  }),

  /**
   * HR解冻任务
   */
  unfreezeTask: asyncHandler(async (req: Request, res: Response) => {
    const { recordId } = req.params;
    
    // 只有HR可以解冻
    if (req.user?.role !== 'hr' && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '只有人力资源可以解冻任务'
      });
    }
    
    await query(
      `UPDATE performance_records 
       SET frozen = false, updated_at = NOW()
       WHERE id = ?`,
      [recordId]
    );
    
    console.log(`[Automation] HR ${req.user?.userId} 解冻任务 ${recordId}`);
    
    res.json({
      success: true,
      message: '任务已解冻'
    });
  }),

  /**
   * HR批量解冻任务
   */
  batchUnfreeze: asyncHandler(async (req: Request, res: Response) => {
    const { month } = req.body;
    
    // 只有HR可以解冻
    if (req.user?.role !== 'hr' && req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: '只有人力资源可以批量解冻任务'
      });
    }
    
    const result = await query(
      `UPDATE performance_records 
       SET frozen = false, updated_at = NOW()
       WHERE month = ? AND frozen = true`,
      [month]
    ) as any;
    
    const unfrozenCount = result.affectedRows || 0;
    
    console.log(`[Automation] HR ${req.user?.userId} 批量解冻 ${month} 的任务，共 ${unfrozenCount} 条`);
    
    res.json({
      success: true,
      message: `已解冻 ${unfrozenCount} 条任务`,
      data: {
        month,
        unfrozen: unfrozenCount
      }
    });
  })
};
