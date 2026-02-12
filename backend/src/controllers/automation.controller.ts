import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { EmployeeModel } from '../models/employee.model';
import { PerformanceModel } from '../models/performance.model';
import { NotificationModel, CreateNotificationInput } from '../models/notification.model';
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
      // 根据level确定group_type（只有high/low两种，默认low）
      let groupType: 'high' | 'low' = 'low';
      if (emp.level) {
        const levelStr = emp.level.toString();
        // senior级别或包含5/6的归为high分组
        if (levelStr === 'senior' || levelStr.includes('5') || levelStr.includes('6')) {
          groupType = 'high';
        }
        // junior/intermediate级别归为low分组
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
  }),

  /**
   * 检查截止日期临近的任务并发送提醒
   * 查询所有未冻结、未提交且截止日期在3天内的任务
   */
  checkDeadlineReminders: asyncHandler(async (req: Request, res: Response) => {
    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    
    const todayStr = today.toISOString().split('T')[0];
    const threeDaysLaterStr = threeDaysLater.toISOString().split('T')[0];
    
    console.log(`[Automation] 检查截止日期提醒: ${todayStr} ~ ${threeDaysLaterStr}`);
    
    // 查询符合条件的任务
    const tasks = await query(
      `SELECT 
        pr.id, pr.employee_id, pr.month, pr.deadline, pr.status,
        e.name as employee_name
       FROM performance_records pr
       JOIN employees e ON pr.employee_id = e.id
       WHERE pr.frozen = false 
       AND pr.status IN ('draft')
       AND pr.deadline >= ?
       AND pr.deadline <= ?`,
      [todayStr, threeDaysLaterStr]
    ) as any[];
    
    console.log(`[Automation] 找到 ${tasks.length} 条需要提醒的任务`);
    
    if (tasks.length === 0) {
      return res.json({
        success: true,
        message: '没有需要提醒的任务',
        data: {
          checked: 0,
          reminded: 0
        }
      });
    }
    
    // 为每个任务创建提醒消息
    const notifications: CreateNotificationInput[] = tasks.map(task => {
      const daysLeft = Math.ceil((new Date(task.deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        userId: task.employee_id,
        type: 'reminder' as const,
        title: `绩效任务即将到期`,
        content: `您的 ${task.month} 月度绩效任务还有 ${daysLeft} 天到期（截止日期：${task.deadline}），请尽快完成提交。`,
        link: `/performance/my-tasks`
      };
    });
    
    // 批量创建通知
    const createdCount = await NotificationModel.createBatch(notifications);
    
    console.log(`[Automation] 成功创建 ${createdCount} 条提醒消息`);
    
    res.json({
      success: true,
      message: `提醒检查完成，已创建 ${createdCount} 条消息`,
      data: {
        checked: tasks.length,
        reminded: createdCount
      }
    });
  })
};
