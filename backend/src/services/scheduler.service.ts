import cron from 'node-cron';
import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { NotificationModel, CreateNotificationInput } from '../models/notification.model';
import { TodoModel } from '../models/todo.model';
import { EmployeeModel } from '../models/employee.model';
import { PerformanceModel } from '../models/performance.model';
import { AssessmentPublicationModel } from '../models/assessmentPublication.model';
import { getGroupType, scoreToLevel, levelToScore } from '../utils/helpers';
import { getPerformanceRankingConfig, isParticipatingRecord } from './performanceRankingConfig.service';
import { ProgressMonitorService } from './progressMonitor.service';
import { ArchiveService } from './archive.service';
import { getMonthlyStats, detectAnomalousScores } from './assessmentStats.service';
import { EmailService } from './email.service';
import { generateMonthlyReportCharts } from './chart.service';
import logger from '../config/logger';

export class SchedulerService {
  private static initialized = false;

  static init() {
    if (this.initialized) return;
    this.initialized = true;

    // 每月 1 日早上 8:00 自动生成上月绩效任务，并提醒员工提交工作总结
    cron.schedule('0 8 1 * *', async () => {
      logger.info('[Scheduler] 执行月初绩效任务生成...');
      try {
        const result = await this.generatePreviousMonthPerformanceTasks();
        logger.info(`[Scheduler] 月初绩效任务生成完成: ${JSON.stringify(result)}`);
      } catch (err) {
        logger.error(`[Scheduler] 月初绩效任务生成出错: ${err}`);
      }
    });

    // 每天早上 8:00 检查截止日期和过期待办
    cron.schedule('0 8 * * *', async () => {
      logger.info('[Scheduler] 执行每日定时任务...');
      try {
        await this.checkDeadlines();
        await this.checkOverdueTodos();
      } catch (err) {
        logger.error(`[Scheduler] 每日任务出错: ${err}`);
      }
    });

    // 每小时更新过期状态
    cron.schedule('0 * * * *', async () => {
      try {
        const count = await TodoModel.checkOverdue();
        if (count > 0) logger.info(`[Scheduler] 标记 ${count} 个待办为逾期`);
      } catch (err) {
        logger.error(`[Scheduler] 过期检查出错: ${err}`);
      }
    });

    // 每月 6 日凌晨 2:00 自动生成上月统计报告
    cron.schedule('0 2 6 * *', async () => {
      logger.info('[Scheduler] 执行月度统计报告生成...');
      try {
        const result = await this.generateMonthlyStatisticsReport();
        logger.info(`[Scheduler] 月度统计报告生成完成: ${JSON.stringify(result)}`);
      } catch (err) {
        logger.error(`[Scheduler] 月度统计报告生成出错: ${err}`);
      }
    });

    // 每月 10 日凌晨 3:00 自动发布（兜底）
    cron.schedule('0 3 10 * *', async () => {
      logger.info('[Scheduler] 检查自动发布...');
      try {
        const result = await this.autoPublishPreviousMonth();
        logger.info(`[Scheduler] 自动发布检查完成: ${JSON.stringify(result)}`);
      } catch (err) {
        logger.error(`[Scheduler] 自动发布出错: ${err}`);
      }
    });

    // 每季度首月（1/4/7/10）2 日凌晨 4:00 自动推送上季度绩效到薪资系统
    cron.schedule('0 4 2 1,4,7,10 *', async () => {
      logger.info('[Scheduler] 执行季度绩效推送...');
      try {
        const result = await this.pushPreviousQuarterResults();
        logger.info(`[Scheduler] 季度推送完成: ${JSON.stringify(result)}`);
      } catch (err) {
        logger.error(`[Scheduler] 季度推送出错: ${err}`);
      }
    });

    logger.info('✅ 定时任务已启动');
  }

  /**
   * 每月 1 日生成上月绩效任务，并通知员工/经理提交上月工作总结。
   */
  static async generatePreviousMonthPerformanceTasks(referenceDate: Date = new Date()): Promise<{
    month: string;
    createdCount: number;
    skippedCount: number;
    notificationCount: number;
    todoCount: number;
    emailCount: number;
    total: number;
  }> {
    const previousMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const targetMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const todoRelatedId = `performance-summary-${targetMonth}`;
    const summaryLink = `/employee/summary?month=${targetMonth}`;
    const dueDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 7);

    const allEmployees = await EmployeeModel.findAll();
    const validIds = new Set<string>(allEmployees.map((employee: any) => employee.id));
    const rankingConfig = await getPerformanceRankingConfig();
    const assessableEmployees = allEmployees
      .filter((employee: any) => employee.role === 'employee' || employee.role === 'manager')
      .filter((employee: any) => !employee.status || employee.status === 'active')
      .filter((employee: any) => isParticipatingRecord(employee, rankingConfig));

    let createdCount = 0;
    let skippedCount = 0;
    let todoCount = 0;
    let emailCount = 0;
    const notifications: CreateNotificationInput[] = [];

    for (const employee of assessableEmployees) {
      const existing = await PerformanceModel.findByEmployeeIdAndMonth(employee.id, targetMonth);
      if (existing) {
        skippedCount++;
        continue;
      }

      const groupType = getGroupType(employee.level);
      let assessorId = 'gm001';
      if (employee.role === 'employee' && employee.managerId && validIds.has(employee.managerId)) {
        assessorId = employee.managerId;
      }

      await PerformanceModel.saveSummary({
        id: `rec-${employee.id}-${targetMonth}`,
        employeeId: employee.id,
        assessorId,
        month: targetMonth,
        selfSummary: '',
        nextMonthPlan: '',
        groupType
      });
      createdCount++;

      notifications.push({
        userId: employee.id,
        type: 'reminder',
        title: `请提交${targetMonth}月度工作总结`,
        content: `系统已生成${targetMonth}绩效考核任务，请尽快填写上月工作总结和本月计划。`,
        link: summaryLink
      });

      const existingTodo = await TodoModel.findExisting(employee.id, 'work_summary', todoRelatedId);
      if (!existingTodo) {
        await TodoModel.create({
          employeeId: employee.id,
          type: 'work_summary',
          title: `提交${targetMonth}月度工作总结`,
          description: `请填写${targetMonth}工作总结和下月计划，供经理评分。`,
          dueDate,
          link: summaryLink,
          relatedId: todoRelatedId
        });
        todoCount++;
      }

      // 发送邮件通知（如果有邮箱）
      if (employee.email) {
        try {
          await EmailService.sendMonthlyTaskGenerated(
            employee.email,
            employee.name,
            targetMonth,
            summaryLink,
            dueDate.toLocaleDateString('zh-CN')
          );
          emailCount++;
        } catch (err) {
          logger.warn(`[Scheduler] 邮件通知发送失败 for ${employee.name}: ${err}`);
        }
      }
    }

    const notificationCount = await NotificationModel.createBatch(notifications);

    return {
      month: targetMonth,
      createdCount,
      skippedCount,
      notificationCount,
      todoCount,
      emailCount,
      total: assessableEmployees.length
    };
  }

  /**
   * 检查考核周期截止日期，发送提醒
   */
  static async checkDeadlines() {
    try {
      // 获取进行中的考核周期
      const activeCycles = await this.getActiveCycles();

      for (const cycle of activeCycles) {
        const reminderDays = cycle.reminderDays || 3;
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // 检查各截止日期
        const deadlines = [
          { date: cycle.selfAssessmentDeadline, type: 'work_summary', label: '自评' },
          { date: cycle.managerReviewDeadline, type: 'manager_review', label: '经理评审' },
          { date: cycle.hrReviewDeadline, type: 'hr_review', label: 'HR评审' },
          { date: cycle.appealDeadline, type: 'appeal_review', label: '申诉' },
        ];

        for (const dl of deadlines) {
          if (!dl.date) continue;
          const deadline = new Date(dl.date);
          const diffDays = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          if (diffDays === reminderDays) {
            // 提前N天提醒
            await this.sendDeadlineReminder(cycle, dl, diffDays, 'reminder');
          } else if (diffDays === 1) {
            // 最后一天提醒
            await this.sendDeadlineReminder(cycle, dl, diffDays, 'deadline');
          } else if (diffDays < 0 && cycle.autoSubmit) {
            // 超期自动提交
            await this.handleOverdue(cycle, dl);
          }
        }
      }
    } catch (err) {
      logger.error(`[Scheduler] checkDeadlines 出错: ${err}`);
    }
  }

  /**
   * 发送截止日期提醒给相关员工
   */
  private static async sendDeadlineReminder(
    cycle: any,
    deadline: { type: string; label: string },
    daysLeft: number,
    notificationType: 'reminder' | 'deadline'
  ) {
    // 根据类型确定通知的目标员工
    const employees = await this.getTargetEmployees(deadline.type);

    const notifications: CreateNotificationInput[] = employees.map((emp: any) => ({
      userId: emp.id,
      type: notificationType as any,
      title: daysLeft === 1
        ? `【最后提醒】${cycle.name} - ${deadline.label}明天截止`
        : `【提醒】${cycle.name} - ${deadline.label}还有${daysLeft}天截止`,
      content: `考核周期「${cycle.name}」的${deadline.label}将于${new Date(cycle[this.getDeadlineField(deadline.type)]).toLocaleDateString('zh-CN')}截止，请及时完成。`,
      link: this.getTodoLink(deadline.type),
    }));

    if (notifications.length > 0) {
      await NotificationModel.createBatch(notifications);
      logger.info(`[Scheduler] 发送了 ${notifications.length} 条${deadline.label}提醒`);
    }

    // 创建待办
    for (const emp of employees) {
      const existing = await TodoModel.findExisting(emp.id, deadline.type as any, cycle.id);
      if (!existing) {
        await TodoModel.create({
          employeeId: emp.id,
          type: deadline.type as any,
          title: `完成${deadline.label} - ${cycle.name}`,
          description: `请在截止日期前完成${deadline.label}`,
          dueDate: new Date(cycle[this.getDeadlineField(deadline.type)]),
          link: this.getTodoLink(deadline.type),
          relatedId: cycle.id,
        });
      }
    }
  }

  /**
   * 处理超期情况
   */
  private static async handleOverdue(cycle: any, deadline: { type: string; label: string }) {
    logger.info(`[Scheduler] 考核周期 ${cycle.name} 的 ${deadline.label} 已超期`);

    // 获取未完成的员工
    const employees = await this.getTargetEmployees(deadline.type);

    // 通知上级和HR
    const notifications: CreateNotificationInput[] = [];
    for (const emp of employees) {
      // 通知员工
      notifications.push({
        userId: emp.id,
        type: 'reminder',
        title: `【逾期】${cycle.name} - ${deadline.label}已超过截止日期`,
        content: `您的${deadline.label}已超过截止日期，请尽快完成或联系上级。`,
        link: this.getTodoLink(deadline.type),
      });

      // 通知经理（如果有）
      if (emp.managerId) {
        notifications.push({
          userId: emp.managerId,
          type: 'reminder',
          title: `【下属逾期】${emp.name}的${deadline.label}已超期`,
          content: `员工${emp.name}的${deadline.label}已超过截止日期。`,
        });
      }
    }

    if (notifications.length > 0) {
      await NotificationModel.createBatch(notifications);
    }
  }

  /**
   * 检查过期待办并通知
   */
  static async checkOverdueTodos() {
    const count = await TodoModel.checkOverdue();
    if (count > 0) {
      logger.info(`[Scheduler] 标记了 ${count} 个待办为逾期`);
    }
  }

  /**
   * 获取进行中的考核周期
   */
  private static async getActiveCycles(): Promise<any[]> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.assessmentCycles) return [];
      return Array.from(memoryStore.assessmentCycles.values()).filter((c: any) => c.status === 'active');
    }

    const sql = `
      SELECT id, name, type, year,
        start_date as "startDate", end_date as "endDate",
        self_assessment_deadline as "selfAssessmentDeadline",
        manager_review_deadline as "managerReviewDeadline",
        hr_review_deadline as "hrReviewDeadline",
        appeal_deadline as "appealDeadline",
        status, reminder_days as "reminderDays",
        auto_submit as "autoSubmit"
      FROM assessment_cycles
      WHERE status = 'active'
    `;
    return await query(sql, []);
  }

  /**
   * 根据任务类型获取目标员工
   */
  private static async getTargetEmployees(type: string): Promise<any[]> {
    if (USE_MEMORY_DB) {
      if (!memoryStore.employees) return [];
      const employees = Array.from(memoryStore.employees.values()).filter((e: any) => e.status === 'active');
      switch (type) {
        case 'work_summary':
          return employees;
        case 'manager_review':
          return employees.filter((e: any) => e.role === 'manager' || e.role === 'gm');
        case 'hr_review':
          return employees.filter((e: any) => e.role === 'hr' || e.role === 'admin');
        case 'appeal_review':
          return employees.filter((e: any) => e.role === 'hr' || e.role === 'admin');
        default:
          return employees;
      }
    }

    let sql: string;
    switch (type) {
      case 'work_summary':
        sql = `SELECT id, name, manager_id as "managerId" FROM employees WHERE status = 'active'`;
        break;
      case 'manager_review':
        sql = `SELECT id, name, manager_id as "managerId" FROM employees WHERE status = 'active' AND role IN ('manager', 'gm')`;
        break;
      case 'hr_review':
      case 'appeal_review':
        sql = `SELECT id, name, manager_id as "managerId" FROM employees WHERE status = 'active' AND role IN ('hr', 'admin')`;
        break;
      default:
        sql = `SELECT id, name, manager_id as "managerId" FROM employees WHERE status = 'active'`;
    }
    return await query(sql, []);
  }

  private static getDeadlineField(type: string): string {
    const map: Record<string, string> = {
      work_summary: 'selfAssessmentDeadline',
      manager_review: 'managerReviewDeadline',
      hr_review: 'hrReviewDeadline',
      appeal_review: 'appealDeadline',
    };
    return map[type] || 'selfAssessmentDeadline';
  }

  private static getTodoLink(type: string): string {
    const map: Record<string, string> = {
      work_summary: '/employee/summary',
      manager_review: '/manager/scoring',
      hr_review: '/hr/assessment-publication',
      appeal_review: '/hr/appeals',
      goal_approval: '/manager/goal-approval',
    };
    return map[type] || '/employee/dashboard';
  }

  /**
   * 每月 6 日自动生成上月统计报告
   */
  static async generateMonthlyStatisticsReport(referenceDate: Date = new Date()): Promise<{
    month: string;
    progress: Record<string, any>;
    stats: Record<string, any>;
    charts: { paths: string[]; summary: string };
    emailSent: boolean;
  }> {
    // 计算上月
    const previousMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const targetMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

    logger.info(`[Scheduler] 生成 ${targetMonth} 月度统计报告`);

    // 获取进度快照
    const progress = await ProgressMonitorService.getMonthProgress(targetMonth);

    // 获取统计信息
    const stats = await getMonthlyStats(targetMonth);
    const anomalies = await detectAnomalousScores();

    // 生成图表
    let charts = { paths: [] as string[], summary: '' };
    try {
      charts = await generateMonthlyReportCharts(targetMonth);
    } catch (err) {
      logger.warn(`[Scheduler] 图表生成失败: ${err}`);
    }

    // 按部门聚合统计
    const deptStats: Record<string, { count: number; avgScore: number }> = {};
    for (const dp of progress.departmentProgress) {
      deptStats[dp.department] = {
        count: dp.total,
        avgScore: dp.rate
      };
    }

    logger.info(`[Scheduler] ${targetMonth} 统计报告: 完成率 ${progress.participationRate}%, 均分 ${stats.avgScore}`);

    // 邮件发送给 HR 和 admin
    let emailSent = false;
    try {
      const allEmployees = await EmployeeModel.findAll();
      const hrAdmins = allEmployees.filter((e: any) => 
        (e.role === 'hr' || e.role === 'admin') && e.email
      );

      const chartSummary = charts.paths.length > 0 
        ? `图表已生成: ${charts.paths.join(', ')}`
        : '图表生成失败';

      const emailHtml = `
        <h2>${targetMonth} 月度绩效统计报告</h2>
        <table>
          <tr><td>总人数</td><td>${progress.totalEmployees}</td></tr>
          <tr><td>已完成</td><td>${progress.completedCount}</td></tr>
          <tr><td>完成率</td><td>${progress.participationRate}%</td></tr>
          <tr><td>平均分</td><td>${stats.avgScore}</td></tr>
          <tr><td>L5/L4/L3/L2/L1</td><td>${stats.l5Count}/${stats.l4Count}/${stats.l3Count}/${stats.l2Count}/${stats.l1Count}</td></tr>
        </table>
        <p>${chartSummary}</p>
      `;

      for (const admin of hrAdmins) {
        const email = admin.email as string;
        await EmailService.sendMonthlyReport(
          [email],
          targetMonth,
          {
            total: progress.totalEmployees,
            completed: progress.completedCount,
            rate: progress.participationRate,
            avgScore: stats.avgScore,
            levelDistribution: { L5: stats.l5Count, L4: stats.l4Count, L3: stats.l3Count, L2: stats.l2Count, L1: stats.l1Count }
          },
          charts.paths.length > 0 ? charts.paths[0] : ''
        );
      }
      if (hrAdmins.length > 0) emailSent = true;
    } catch (err) {
      logger.warn(`[Scheduler] 月度报告邮件发送失败: ${err}`);
    }

    return {
      month: targetMonth,
      progress: {
        totalEmployees: progress.totalEmployees,
        eligibleEmployees: progress.eligibleEmployees,
        draftCount: progress.draftCount,
        submittedCount: progress.submittedCount,
        scoredCount: progress.scoredCount,
        completedCount: progress.completedCount,
        participationRate: progress.participationRate,
        departmentProgress: progress.departmentProgress,
        managerProgress: progress.managerProgress
      },
      stats: {
        monthlyStats: stats,
        anomalies: anomalies || []
      },
      charts,
      emailSent
    };
  }

  /**
   * 每月 10 日自动发布上月绩效（兜底）
   * 条件：上月所有 eligible 员工的记录都是 completed/scored 状态，且未发布
   */
  static async autoPublishPreviousMonth(referenceDate: Date = new Date()): Promise<{
    month: string;
    published: boolean;
    reason: string;
  }> {
    const previousMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const targetMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;

    // 检查是否已发布
    const alreadyPublished = await AssessmentPublicationModel.isPublished(targetMonth);
    if (alreadyPublished) {
      return { month: targetMonth, published: false, reason: '已发布' };
    }

    // 检查是否已归档（归档说明已经发布过）
    const alreadyArchived = await ArchiveService.isArchived(targetMonth);
    if (alreadyArchived) {
      return { month: targetMonth, published: false, reason: '已归档' };
    }

    // 获取所有 eligible 员工
    const allEmployees = await EmployeeModel.findAll();
    const eligibleEmployees = allEmployees.filter(
      (e: any) => (e.role === 'employee' || e.role === 'manager') && e.status !== 'disabled'
    );

    // 检查所有员工是否都已完成
    const records = await PerformanceModel.findByMonth(targetMonth);
    const completedRecords = records.filter(
      r => r.status === 'completed' || r.status === 'scored'
    );

    if (completedRecords.length < eligibleEmployees.length) {
      return {
        month: targetMonth,
        published: false,
        reason: `未完成: ${completedRecords.length}/${eligibleEmployees.length}`
      };
    }

    // 自动发布
    const adminUser = allEmployees.find((e: any) => e.role === 'admin');
    const publishedBy = adminUser?.id || 'system';

    await AssessmentPublicationModel.publish(targetMonth, publishedBy);
    logger.info(`[Scheduler] ${targetMonth} 绩效结果已自动发布`);

    // 发布后自动归档
    try {
      const archiveResult = await ArchiveService.archiveMonth(targetMonth, publishedBy);
      logger.info(`[Scheduler] ${targetMonth} 归档完成: ${archiveResult.completedRecords} 条记录`);
    } catch (err) {
      logger.error(`[Scheduler] ${targetMonth} 归档失败: ${err}`);
    }

    return { month: targetMonth, published: true, reason: `自动发布完成 (${completedRecords.length} 条记录)` };
  }

  /**
   * 季度首月自动推送上季度绩效到薪资系统
   * 季度分数 = 该季度3个月度分数的平均值
   */
  static async pushPreviousQuarterResults(referenceDate: Date = new Date()): Promise<{
    quarter: string;
    pushed: boolean;
    count: number;
    reason?: string;
  }> {
    // 计算上季度
    const month = referenceDate.getMonth() + 1; // 1-12
    const year = referenceDate.getFullYear();
    
    let prevQuarter: string;
    let prevYear = year;
    let prevQ: number;
    
    if (month === 1) { // 1月 → 上一年Q4
      prevYear = year - 1;
      prevQ = 4;
    } else if (month <= 3) { // 2-3月 → 上一年Q4
      prevYear = year - 1;
      prevQ = 4;
    } else if (month <= 6) { // 4-6月 → Q1
      prevQ = 1;
    } else if (month <= 9) { // 7-9月 → Q2
      prevQ = 2;
    } else { // 10-12月 → Q3
      prevQ = 3;
    }
    
    prevQuarter = `${prevYear}-Q${prevQ}`;
    
    // 季度对应的3个月
    const startMonth = (prevQ - 1) * 3 + 1;
    const months = [0, 1, 2].map(offset => `${prevYear}-${String(startMonth + offset).padStart(2, '0')}`);
    
    logger.info(`[Scheduler] 推送上季度绩效: ${prevQuarter} (${months.join(', ')})`);
    
    // 获取所有员工
    const allEmployees = await EmployeeModel.findAll();
    const eligibleEmployees = allEmployees.filter(
      (e: any) => (e.role === 'employee' || e.role === 'manager') && e.status !== 'disabled'
    );
    
    // 聚合季度分数
    const scoreAgg = new Map<string, {
      employeeExternalId: string;
      employeeName: string;
      department: string;
      subDepartment: string;
      sum: number;
      count: number;
    }>();
    
    for (const monthStr of months) {
      const records = await PerformanceModel.findByMonth(monthStr);
      for (const record of records) {
        if (record.status !== 'completed') continue;
        const empId = record.employeeId;
        if (!empId) continue;
        
        const totalScore = Number(record.totalScore || 0);
        const empName = (record as any).employeeName || '';
        const dept = (record as any).department || '';
        const subDept = (record as any).subDepartment || '';
        
        const prev = scoreAgg.get(empId);
        if (!prev) {
          scoreAgg.set(empId, {
            employeeExternalId: empId,
            employeeName: empName,
            department: dept,
            subDepartment: subDept,
            sum: totalScore,
            count: 1
          });
        } else {
          prev.sum += totalScore;
          prev.count += 1;
          prev.employeeName = empName || prev.employeeName;
          prev.department = dept || prev.department;
          prev.subDepartment = subDept || prev.subDepartment;
        }
      }
    }
    
    // 检查是否所有人都完成了
    const completedEmployeeIds = new Set(scoreAgg.keys());
    const incomplete = eligibleEmployees.filter((e: any) => !completedEmployeeIds.has(e.id));
    
    if (incomplete.length > 0) {
      return {
        quarter: prevQuarter,
        pushed: false,
        count: 0,
        reason: `${incomplete.length} 名员工未完成季度考核`
      };
    }
    
    // 构建推送数据
    const results = Array.from(scoreAgg.values()).map(agg => {
      const avg = agg.count > 0 ? agg.sum / agg.count : 0;
      const quarterScore = Math.round(avg * 100) / 100;
      const level = scoreToLevel(quarterScore) as 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
      const coefficient = levelToScore(level);
      return {
        employeeExternalId: agg.employeeExternalId,
        employeeName: agg.employeeName,
        department: agg.department,
        subDepartment: agg.subDepartment,
        quarterScore,
        monthsCount: agg.count,
        rank: 0,
        level,
        coefficient
      };
    });
    
    // 排序并设置排名
    results.sort((a, b) => {
      if (b.quarterScore !== a.quarterScore) return b.quarterScore - a.quarterScore;
      return a.employeeExternalId.localeCompare(b.employeeExternalId);
    });
    results.forEach((item, idx) => { item.rank = idx + 1; });
    
    // 推送到薪资系统
    const salaryBaseUrl = (process.env.SALARY_SYSTEM_BASE_URL || '').trim();
    const pushToken = (process.env.SALARY_SYSTEM_PUSH_TOKEN || '').trim();
    
    if (!salaryBaseUrl || !pushToken) {
      return {
        quarter: prevQuarter,
        pushed: false,
        count: 0,
        reason: '未配置薪资系统推送环境变量 (SALARY_SYSTEM_BASE_URL / SALARY_SYSTEM_PUSH_TOKEN)'
      };
    }
    
    const base = salaryBaseUrl.endsWith('/') ? salaryBaseUrl.slice(0, -1) : salaryBaseUrl;
    const url = `${base}/api/integrations/performance/quarter-results`;
    
    const payload = {
      quarter: prevQuarter,
      effectiveQuarter: `${prevYear}-Q${prevQ + 1 > 4 ? 1 : prevQ + 1}`,
      publishedAt: new Date().toISOString(),
      results
    };
    
    try {
      const axios = (await import('axios')).default;
      await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Performance-Push-Token': pushToken
        },
        timeout: 15_000
      });
      
      logger.info(`[Scheduler] 季度绩效推送成功: ${prevQuarter}, ${results.length} 人`);
      return { quarter: prevQuarter, pushed: true, count: results.length };
    } catch (err) {
      logger.error(`[Scheduler] 季度绩效推送失败: ${err}`);
      return {
        quarter: prevQuarter,
        pushed: false,
        count: 0,
        reason: `推送失败: ${err instanceof Error ? err.message : String(err)}`
      };
    }
  }
}
