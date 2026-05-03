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
import { WecomWebhookService, sendAppMessage } from './wecomWebhook.service';
import { resolveEmployeeWecomUserId } from './wecomDirectory.service';
import { OrganizationModel } from '../models/organization.model';
import { formatPublicationReadinessMessage, validatePublicationReadiness } from './publicationReadiness.service';
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

    // 每天 9:00 执行催办（1-6号催员工写总结 + 催经理打分 + 部门完成率统计）
    cron.schedule('0 9 * * *', async () => {
      logger.info('[Scheduler] 执行每日催办任务...');
      try {
        await this.dailyReminderWorkflow();
        await this.checkOverdueTodos();
      } catch (err) {
        logger.error(`[Scheduler] 每日催办出错: ${err}`);
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

    // 每月 8-10 日凌晨 3:00 自动发布（兜底重试）
    cron.schedule('0 3 8-10 * *', async () => {
      logger.info('[Scheduler] 检查自动发布...');
      try {
        const result = await this.autoPublishPreviousMonth();
        logger.info(`[Scheduler] 自动发布检查完成: ${JSON.stringify(result)}`);
      } catch (err) {
        logger.error(`[Scheduler] 自动发布出错: ${err}`);
      }
    });

    // 每季度首月（1/4/7/10）10 日凌晨 4:00 检查上季度薪资对接是否具备推送条件
    // 现阶段不自动写入薪资系统，需要系统管理员在“手动触发”页确认后推送。
    cron.schedule('0 4 10 1,4,7,10 *', async () => {
      logger.info('[Scheduler] 检查季度绩效薪资对接...');
      try {
        const result = await this.pushPreviousQuarterResults();
        logger.info(`[Scheduler] 季度薪资对接检查完成: ${JSON.stringify(result)}`);
      } catch (err) {
        logger.error(`[Scheduler] 季度薪资对接检查出错: ${err}`);
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
      .filter((employee: any) => isParticipatingRecord(employee, rankingConfig))
      .filter((employee: any) => employee.role !== 'manager' || (employee.managerId && employee.managerId !== employee.id && validIds.has(employee.managerId)));

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
      if (employee.managerId && employee.managerId !== employee.id && validIds.has(employee.managerId)) {
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
   * 每日催办工作流（1-6号）
   * 1. 催员工写总结（draft → submitted）
   * 2. 催经理打分（submitted → scored）
   * 3. 统计部门完成率，推送到企业微信
   */
  static async dailyReminderWorkflow(forceToday: boolean = false, requestedTargetMonth?: string) {
    try {
      const now = new Date();
      const dayOfMonth = now.getDate();

      // 只在1-6号执行催办（手动触发时跳过日期检查）
      if (!forceToday && dayOfMonth > 6) {
        logger.info('[Scheduler] dailyReminderWorkflow: 非1-6号，跳过催办');
        return;
      }

      // 计算目标绩效月份；手动补发可指定月份，定时任务默认催办上月。
      const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
      const targetMonth = requestedTargetMonth && monthPattern.test(requestedTargetMonth)
        ? requestedTargetMonth
        : `${new Date(now.getFullYear(), now.getMonth() - 1, 1).getFullYear()}-${String(new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth() + 1).padStart(2, '0')}`;
      const [targetYearText, targetMonthText] = targetMonth.split('-');
      const deadline = new Date(Number(targetYearText), Number(targetMonthText), 7);
      const deadlineDate = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}`;
      const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      const isLastDay = daysLeft <= 1;

      logger.info(`[Scheduler] 催办 ${targetMonth}，今天是${dayOfMonth}号，距截止还有${daysLeft}天`);

      // ========== 第一阶段：催未写总结的员工 ==========
      await this.remindEmployeesToSubmit(targetMonth, daysLeft, isLastDay, deadlineDate);

      // ========== 第二阶段：催经理给已提交的员工打分 ==========
      await this.remindManagersToScore(targetMonth, daysLeft, isLastDay, deadlineDate);

      // ========== 第三阶段：统计部门完成率并推送 ==========
      await this.pushDepartmentProgress(targetMonth, dayOfMonth, daysLeft);

    } catch (err) {
      logger.error(`[Scheduler] dailyReminderWorkflow 出错: ${err}`);
    }
  }

  /**
   * 催未写总结的员工（draft 状态）
   */
  private static async remindEmployeesToSubmit(month: string, daysLeft: number, isLastDay: boolean, deadlineDate: string) {
    if (USE_MEMORY_DB) return;

    // 查找 draft 状态的记录
    const sql = `
      SELECT pr.employee_id as "employeeId", pr.id as "recordId",
             e.name as "employeeName", e.email, e.department, e.manager_id as "managerId",
             e.wecom_user_id as "wecomUserId"
      FROM performance_records pr
      JOIN employees e ON e.id = pr.employee_id
      WHERE pr.month = $1 AND pr.status = 'draft'
        AND (e.status = 'active' OR e.status IS NULL)
      ORDER BY e.department, e.name
    `;
    const pending = await query(sql, [month]);

    if (pending.length === 0) {
      logger.info(`[Scheduler] ${month} 所有员工已完成总结提交`);
      return;
    }

    const urgency = isLastDay ? '🔴【最后一天】' : daysLeft <= 2 ? '🟠【紧急】' : '🟡【提醒】';
    logger.info(`[Scheduler] ${month} 还有 ${pending.length} 人未提交总结`);

    // 站内通知
    const notifications: CreateNotificationInput[] = pending.map((r: any) => ({
      userId: r.employeeId,
      type: isLastDay ? 'deadline' : 'reminder',
      title: `${urgency}请提交${month}月度工作总结（还剩${daysLeft}天）`,
      content: `${month}月绩效考核截止日期临近，请尽快填写工作总结和下月计划。`,
      link: '/employee/summary',
    }));
    await NotificationModel.createBatch(notifications);

    // 邮件（测试模式只发汇总不逐人发，生产模式批量并发+限速）
    const isTest = !!process.env.WECOM_TEST_USER;
    let emailCount = 0;
    if (isTest) {
      // 测试模式：跳过逐人邮件，日志记录即可
      logger.info(`[Scheduler] 测试模式: 跳过 ${pending.length} 人催办邮件`);
    } else {
      // 生产模式：批量并发（每批5封，间隔1秒避免限频）
      const batchSize = 5;
      for (let i = 0; i < pending.length; i += batchSize) {
        const batch = pending.slice(i, i + batchSize);
        const results = await Promise.allSettled(
          batch.filter((r: any) => r.email).map((r: any) =>
            EmailService.sendDeadlineReminder(
              r.email, r.employeeName, `${month}月绩效`, 'work_summary',
              deadlineDate || `${daysLeft}天后`, '/employee/summary'
            )
          )
        );
        emailCount += results.filter(r => r.status === 'fulfilled' && r.value).length;
        if (i + batchSize < pending.length) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // 限速
        }
      }
    }

    let wecomCount = 0;
    for (const row of pending) {
      const touser = await resolveEmployeeWecomUserId({
        id: String(row.employeeId || '').trim(),
        name: String(row.employeeName || '').trim(),
        wecomUserId: String(row.wecomUserId || '').trim(),
      });
      if (!touser) continue;
      const sent = await WecomWebhookService.sendReminder({
        cycleName: `${month}月工作总结`,
        taskType: '员工提交总结',
        daysLeft,
        deadlineDate: deadlineDate || '',
        pendingCount: 1,
        employeeNames: [row.employeeName],
      }, touser);
      if (sent) wecomCount++;
    }

    logger.info(`[Scheduler] 催员工提交: ${pending.length}人, 邮件${emailCount}封, 企业微信${wecomCount}条`);
  }

  /**
   * 催经理给已提交的员工打分（submitted 状态）
   * 按经理分组，列出其下属中待打分的人员
   */
  private static async remindManagersToScore(month: string, daysLeft: number, isLastDay: boolean, deadlineDate: string) {
    if (USE_MEMORY_DB) return;

    // 查找 submitted 状态的记录（员工已提交，等经理打分）
    const sql = `
      SELECT pr.employee_id as "employeeId", pr.assessor_id as "assessorId",
             e.name as "employeeName", e.department,
             mgr.name as "managerName", mgr.email as "managerEmail",
             mgr.wecom_user_id as "managerWecomUserId"
      FROM performance_records pr
      JOIN employees e ON e.id = pr.employee_id
      LEFT JOIN employees mgr ON mgr.id = pr.assessor_id
      WHERE pr.month = $1 AND pr.status = 'submitted'
        AND (e.status = 'active' OR e.status IS NULL)
      ORDER BY pr.assessor_id, e.department
    `;
    const submitted = await query(sql, [month]);

    if (submitted.length === 0) {
      logger.info(`[Scheduler] ${month} 无待打分记录`);
      return;
    }

    logger.info(`[Scheduler] ${month} 有 ${submitted.length} 条待经理打分`);

    // 按经理分组
    const byManager: Record<string, { manager: any; employees: any[] }> = {};
    for (const r of submitted) {
      const mid = r.assessorId || 'gm001';
      if (!byManager[mid]) {
        byManager[mid] = {
          manager: { id: mid, name: r.managerName, email: r.managerEmail, managerWecomUserId: r.managerWecomUserId },
          employees: []
        };
      }
      byManager[mid].employees.push(r);
    }

    const urgency = isLastDay ? '🔴【最后一天】' : daysLeft <= 2 ? '🟠【紧急】' : '🟡【提醒】';

    for (const [managerId, group] of Object.entries(byManager)) {
      const names = group.employees.map((e: any) => e.employeeName).join('、');
      const count = group.employees.length;

      // 站内通知经理
      await NotificationModel.createBatch([{
        userId: managerId,
        type: isLastDay ? 'deadline' : 'reminder',
        title: `${urgency}${count}名下属${month}月绩效待打分（还剩${daysLeft}天）`,
        content: `以下员工已提交${month}月工作总结，请尽快完成评分：${names}`,
        link: '/manager/dashboard',
      }]);

      // 邮件通知经理（测试模式跳过）
      if (!process.env.WECOM_TEST_USER && group.manager.email) {
        try {
          await EmailService.sendDeadlineReminder(
            group.manager.email, group.manager.name, `${month}月绩效打分`,
            'manager_scoring', deadlineDate || `${daysLeft}天后`, '/manager/dashboard'
          );
        } catch (e) {
          logger.warn(`[Scheduler] 经理催办邮件失败 ${group.manager.name}: ${e}`);
        }
      }

      const touser = await resolveEmployeeWecomUserId({
        id: String(managerId || '').trim(),
        name: String(group.manager.name || '').trim(),
        wecomUserId: String(group.manager.managerWecomUserId || '').trim(),
      });
      if (touser) {
        await WecomWebhookService.sendReminder({
          cycleName: `${month}月经理打分`,
          taskType: '经理评分',
          daysLeft,
          deadlineDate: deadlineDate || '',
          pendingCount: count,
          employeeNames: group.employees.map((e: any) => e.employeeName),
        }, touser);
      }

      logger.info(`[Scheduler] 催经理 ${group.manager.name} 打分: ${count}人 (${names})`);
    }
  }

  /**
   * 统计部门完成率并推送到企业微信
   */
  private static async pushDepartmentProgress(month: string, dayOfMonth: number, daysLeft: number) {
    if (USE_MEMORY_DB) return;

    // 按部门统计各状态数量
    const sql = `
      SELECT e.department,
             COUNT(*) FILTER (WHERE pr.status = 'draft') as "draftCount",
             COUNT(*) FILTER (WHERE pr.status = 'submitted') as "submittedCount",
             COUNT(*) FILTER (WHERE pr.status IN ('scored', 'completed')) as "doneCount",
             COUNT(*) as total
      FROM performance_records pr
      JOIN employees e ON e.id = pr.employee_id
      WHERE pr.month = $1
        AND (e.status = 'active' OR e.status IS NULL)
      GROUP BY e.department
      ORDER BY e.department
    `;
    const deptStats = await query(sql, [month]);

    if (deptStats.length === 0) return;

    const allEmployees = await EmployeeModel.findAll();
    const activeEmployees = allEmployees.filter((employee: any) => !employee.status || employee.status === 'active');
    const allDepartments = await OrganizationModel.findAllDepartments();

    // 计算总完成率
    let totalDone = 0, totalAll = 0;
    for (const d of deptStats) {
      // doneCount = 已打分 + 已完成 = 绩效流程走完
      totalDone += parseInt(d.doneCount) + parseInt(d.submittedCount);
      totalAll += parseInt(d.total);
    }
    const overallRate = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

    const recipientsCache = new Map<string, string[]>();
    const resolveDepartmentRecipients = async (departmentName: string) => {
      if (recipientsCache.has(departmentName)) {
        return recipientsCache.get(departmentName)!;
      }

      const matchedTopDepartment = allDepartments.find((department: any) => department.name === departmentName && !department.parentId);
      const recipientIds = new Set<string>();

      if (matchedTopDepartment?.managerId) {
        recipientIds.add(matchedTopDepartment.managerId);
      }

      activeEmployees
        .filter((employee: any) => employee.department === departmentName && employee.role === 'manager')
        .forEach((employee: any) => recipientIds.add(employee.id));

      const recipients = await Promise.all(
        Array.from(recipientIds).map(async (employeeId) => {
          const employee = activeEmployees.find((candidate: any) => candidate.id === employeeId);
          if (!employee) return null;
          return resolveEmployeeWecomUserId({
            id: String(employee.id || '').trim(),
            name: String(employee.name || '').trim(),
            wecomUserId: String(employee.wecomUserId || '').trim(),
          });
        }),
      );

      const resolvedRecipients = Array.from(new Set(recipients.filter((item): item is string => Boolean(item))));
      recipientsCache.set(departmentName, resolvedRecipients);
      return resolvedRecipients;
    };

    const summaryRecipients = await Promise.all(
      activeEmployees
        .filter((employee: any) => ['hr', 'admin', 'gm'].includes(employee.role))
        .map(async (employee: any) => resolveEmployeeWecomUserId({
          id: String(employee.id || '').trim(),
          name: String(employee.name || '').trim(),
          wecomUserId: String(employee.wecomUserId || '').trim(),
        })),
    );
    const resolvedSummaryRecipients = Array.from(new Set(summaryRecipients.filter((item): item is string => Boolean(item))));

    const summaryLines = [`📊 **${month}月绩效考核进度**（${dayOfMonth}号，还剩${daysLeft}天）\n`];
    summaryLines.push(`总体完成率：**${overallRate}%**（${totalDone}/${totalAll}）\n`);

    for (const d of deptStats) {
      const completedCount = parseInt(d.doneCount);
      const submittedCount = parseInt(d.submittedCount);
      const draftCount = parseInt(d.draftCount);
      const totalCount = parseInt(d.total);
      const done = completedCount + submittedCount;
      const rate = totalCount > 0 ? Math.round((done / totalCount) * 100) : 0;
      const bar = '█'.repeat(Math.floor(rate / 10)) + '░'.repeat(10 - Math.floor(rate / 10));
      const status = rate === 100 ? '✅' : draftCount > 0 ? '⚠️' : '🔄';
      summaryLines.push(`${status} **${d.department}** ${bar} ${rate}%（${done}/${totalCount}，${draftCount}人未提交）`);

      const departmentRecipients = await resolveDepartmentRecipients(String(d.department || '').trim());
      if (departmentRecipients.length > 0) {
        await WecomWebhookService.sendDepartmentProgress({
          month,
          dayOfMonth,
          daysLeft,
          department: String(d.department || ''),
          totalCount,
          completedCount,
          submittedCount,
          draftCount,
        }, departmentRecipients.join(','));

        if (dayOfMonth === 6 && (draftCount > 0 || submittedCount > 0)) {
          await WecomWebhookService.sendDepartmentDeadlineAlert({
            month,
            dayOfMonth,
            daysLeft,
            department: String(d.department || ''),
            totalCount,
            completedCount,
            submittedCount,
            draftCount,
          }, departmentRecipients.join(','));
        }
      }
    }

    if (resolvedSummaryRecipients.length > 0) {
      await sendAppMessage(resolvedSummaryRecipients.join(','), summaryLines.join('\n'));
      logger.info(`[Scheduler] 部门进度汇总已精准发送给 HR/Admin/GM: ${resolvedSummaryRecipients.length} 人`);
    } else {
      logger.warn('[Scheduler] 未找到可接收部门进度汇总的 HR/Admin/GM 企业微信账号');
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
   * 每月 8 日自动发布上月绩效（兜底）
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

    // 只按“参与绩效考核”的在职员工自动发布
    const allEmployees = await EmployeeModel.findAll();
    const rankingConfig = await getPerformanceRankingConfig();
    const validIds = new Set<string>(
      allEmployees
        .filter((e: any) => !e.status || e.status === 'active')
        .map((e: any) => e.id)
    );
    const eligibleEmployees = allEmployees
      .filter((e: any) => (e.role === 'employee' || e.role === 'manager') && (!e.status || e.status === 'active'))
      .filter((e: any) => isParticipatingRecord(e, rankingConfig))
      .filter((e: any) => e.role !== 'manager' || (e.managerId && e.managerId !== e.id && validIds.has(e.managerId)));
    const eligibleEmployeeIds = new Set<string>(eligibleEmployees.map((employee: any) => employee.id));

    // 检查所有员工是否都已完成
    const records = await PerformanceModel.findByMonth(targetMonth);
    const completedRecords = records.filter(
      r => eligibleEmployeeIds.has(r.employeeId) && (r.status === 'completed' || r.status === 'scored')
    );

    if (eligibleEmployees.length === 0) {
      return {
        month: targetMonth,
        published: false,
        reason: '当前没有参与考核的员工'
      };
    }

    if (completedRecords.length < eligibleEmployees.length) {
      return {
        month: targetMonth,
        published: false,
        reason: `未完成: ${completedRecords.length}/${eligibleEmployees.length}`
      };
    }

    const readiness = await validatePublicationReadiness(targetMonth);
    if (!readiness.ok) {
      return {
        month: targetMonth,
        published: false,
        reason: formatPublicationReadinessMessage(readiness)
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
   * 季度首月 10 日检查上季度绩效薪资对接条件；写入薪资系统前需要管理员确认
   * 季度分数 = 该季度 3 个月已完成月度绩效的等权平均值
   */
  static async pushPreviousQuarterResults(referenceDate: Date = new Date(), confirmation?: {
    confirmedByAdmin?: boolean;
    confirmedBy?: string;
  }): Promise<{
    quarter: string;
    pushed: boolean;
    count: number;
    reason?: string;
    requiresConfirmation?: boolean;
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
    
    const allEmployees = await EmployeeModel.findAll();
    const rankingConfig = await getPerformanceRankingConfig();
    const validIds = new Set<string>(
      allEmployees
        .filter((e: any) => !e.status || e.status === 'active')
        .map((e: any) => e.id)
    );
    const eligibleEmployees = allEmployees
      .filter((e: any) => (e.role === 'employee' || e.role === 'manager') && (!e.status || e.status === 'active'))
      .filter((e: any) => isParticipatingRecord(e, rankingConfig))
      .filter((e: any) => e.role !== 'manager' || (e.managerId && e.managerId !== e.id && validIds.has(e.managerId)));
    const eligibleEmployeeIds = new Set<string>(eligibleEmployees.map((employee: any) => employee.id));

    if (eligibleEmployees.length === 0) {
      return {
        quarter: prevQuarter,
        pushed: false,
        count: 0,
        reason: '当前季度没有参与考核的员工'
      };
    }

    const scoreAgg = new Map<string, {
      employeeExternalId: string;
      employeeName: string;
      department: string;
      subDepartment: string;
      monthScores: Record<string, number>;
    }>();

    for (const monthStr of months) {
      const records = await PerformanceModel.findByMonth(monthStr);
      for (const record of records) {
        if (!eligibleEmployeeIds.has(record.employeeId)) continue;
        if (record.status !== 'completed' && record.status !== 'scored') continue;
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
            monthScores: { [monthStr]: totalScore }
          });
        } else {
          prev.monthScores[monthStr] = totalScore;
          prev.employeeName = empName || prev.employeeName;
          prev.department = dept || prev.department;
          prev.subDepartment = subDept || prev.subDepartment;
        }
      }
    }

    const incomplete = eligibleEmployees.filter((employee: any) => {
      const summary = scoreAgg.get(employee.id);
      if (!summary) return true;
      return months.some((monthStr) => summary.monthScores[monthStr] === undefined);
    });

    if (incomplete.length > 0) {
      return {
        quarter: prevQuarter,
        pushed: false,
        count: 0,
        reason: `${incomplete.length} 名员工月度绩效尚未全部完成，无法汇总季度结果`
      };
    }
    
    // 构建推送数据
    const results = Array.from(scoreAgg.values()).map(agg => {
      const monthScores = months.map((monthStr) => Number(agg.monthScores[monthStr] || 0));
      const avg = monthScores.reduce((sum, score) => sum + score, 0) / months.length;
      const quarterScore = Math.round(avg * 100) / 100;
      const level = scoreToLevel(quarterScore) as 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
      const coefficient = levelToScore(level);
      return {
        employeeExternalId: agg.employeeExternalId,
        employeeName: agg.employeeName,
        department: agg.department,
        subDepartment: agg.subDepartment,
        quarterScore,
        monthsCount: months.length,
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

    if (confirmation?.confirmedByAdmin !== true) {
      return {
        quarter: prevQuarter,
        pushed: false,
        count: results.length,
        requiresConfirmation: true,
        reason: '季度绩效结果已准备好，但暂未推送到薪资系统：需要系统管理员确认后才会写入绩效工资计算'
      };
    }
    
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
      effectiveQuarter: prevQ === 4 ? `${prevYear + 1}-Q1` : `${prevYear}-Q${prevQ + 1}`,
      publishedAt: new Date().toISOString(),
      adminConfirmed: true,
      confirmedBy: confirmation.confirmedBy || 'admin',
      confirmedAt: new Date().toISOString(),
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
