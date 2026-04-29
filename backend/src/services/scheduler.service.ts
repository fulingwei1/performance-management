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
import { WecomWebhookService } from './wecomWebhook.service';
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
        groupType,
        deadline: dueDate
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

    // 企业微信通知：月度任务已生成
    await WecomWebhookService.sendTaskGenerated({
      month: targetMonth,
      totalCount: createdCount,
      dueDate: dueDate.toLocaleDateString('zh-CN'),
    });

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
   * 检查绩效记录截止日期，发送提醒
   */
  static async checkDeadlines() {
    try {
      const reminderDays = 3;
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // 查找所有未完成且快到 deadline 的绩效记录
      const pendingRecords = await this.getPendingRecordsForReminder(reminderDays);

      if (pendingRecords.length === 0) {
        logger.info('[Scheduler] checkDeadlines: 无需催办的记录');
        return;
      }

      // 按 month 分组
      const byMonth: Record<string, any[]> = {};
      for (const r of pendingRecords) {
        const m = r.month;
        if (!byMonth[m]) byMonth[m] = [];
        byMonth[m].push(r);
      }

      for (const [month, records] of Object.entries(byMonth)) {
        const deadline = records[0].deadline;
        const deadlineDate = new Date(deadline).toLocaleDateString('zh-CN');
        const diffDays = Math.ceil((new Date(deadline).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        const isUrgent = diffDays <= 1;
        const label = isUrgent ? '【最后提醒】' : '【提醒】';

        // 1. 站内通知
        const notifications: CreateNotificationInput[] = records.map((r: any) => ({
          userId: r.employeeId,
          type: isUrgent ? 'deadline' as any : 'reminder' as any,
          title: `${label}${month}月绩效考核还有${diffDays}天截止`,
          content: `${month}月绩效考核将于${deadlineDate}截止，请及时完成自评。`,
          link: '/performance/self-assessment',
        }));

        if (notifications.length > 0) {
          await NotificationModel.createBatch(notifications);
          logger.info(`[Scheduler] 发送了 ${notifications.length} 条 ${month} 绩效催办站内通知`);
        }

        // 2. 邮件催办
        let emailSent = 0;
        for (const r of records) {
          if (r.email) {
            const ok = await EmailService.sendDeadlineReminder(
              r.email, r.employeeName, `${month}月绩效`, 'self_assessment', deadlineDate, '/performance/self-assessment'
            );
            if (ok) emailSent++;
          }
        }
        if (emailSent > 0) {
          logger.info(`[Scheduler] 催办邮件已发送 ${emailSent}/${records.length} 封 (${month})`);
        }

        // 3. 企业微信催办
        await WecomWebhookService.sendReminder({
          cycleName: `${month}月绩效考核`,
          taskType: '绩效自评',
          daysLeft: diffDays,
          deadlineDate,
          pendingCount: records.length,
          employeeNames: records.map((r: any) => r.employeeName),
        });

        logger.info(`[Scheduler] ${month} 催办完成: ${records.length} 人, 邮件 ${emailSent} 封`);
      }
    } catch (err) {
      logger.error(`[Scheduler] checkDeadlines 出错: ${err}`);
    }
  }

  /**
   * 获取需要催办的绩效记录（未完成且 deadline 在 reminderDays 天内）
   */
  private static async getPendingRecordsForReminder(reminderDays: number): Promise<any[]> {
    if (USE_MEMORY_DB) return [];

    const sql = `
      SELECT pr.employee_id as "employeeId", pr.month, pr.deadline,
             e.name as "employeeName", e.email
      FROM performance_records pr
      JOIN employees e ON e.id = pr.employee_id
      WHERE pr.status IN ('draft', 'scored')
        AND pr.deadline IS NOT NULL
        AND pr.deadline >= CURRENT_DATE
        AND pr.deadline <= CURRENT_DATE + INTERVAL '${reminderDays} days'
      ORDER BY pr.deadline ASC, pr.month
    `;
    return await query(sql, []);
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
   * 获取有未完成绩效记录的月份（替代原 assessment_cycles 查询）
   * 返回 { month, deadline, pendingCount }[]
   */
  private static async getPendingRecordMonths(): Promise<any[]> {
    if (USE_MEMORY_DB) {
      // 内存模式无此功能
      return [];
    }

    const sql = `
      SELECT month, MAX(deadline) as deadline, COUNT(*) as "pendingCount"
      FROM performance_records
      WHERE status IN ('draft', 'scored')
        AND deadline IS NOT NULL
        AND deadline >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY month
      ORDER BY month DESC
    `;
    return await query(sql, []);
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

    // 企业微信通知：结果已发布
    const avgScore = completedRecords.reduce((sum, r) => sum + (parseFloat((r as any).totalScore || (r as any).total_score) || 0), 0) / completedRecords.length;
    await WecomWebhookService.sendResultPublished({
      month: targetMonth,
      completedCount: completedRecords.length,
      avgScore: parseFloat(avgScore.toFixed(2)),
    });

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
