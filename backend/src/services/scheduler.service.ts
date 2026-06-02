import cron from 'node-cron';
import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { NotificationModel, CreateNotificationInput } from '../models/notification.model';
import { TodoModel } from '../models/todo.model';
import { EmployeeModel } from '../models/employee.model';
import { PerformanceModel } from '../models/performance.model';
import { AssessmentPublicationModel } from '../models/assessmentPublication.model';
import { scoreToLevel, levelToScore } from '../utils/helpers';
import { getPerformanceRankingConfig, savePerformanceRankingConfig } from './performanceRankingConfig.service';
import { isSelfAssessmentEligibleRecord, resolveAssessorId } from './selfAssessmentEligibility.service';
import { resolveTaskTemplateForEmployee } from './taskTemplateResolver.service';
import { ProgressMonitorService } from './progressMonitor.service';
import { ArchiveService } from './archive.service';
import { getMonthlyStats, detectAnomalousScores } from './assessmentStats.service';
import { EmailService } from './email.service';
import { generateMonthlyReportCharts } from './chart.service';
import { WecomWebhookService } from './wecomWebhook.service';
import { resolveEmployeeWecomUserId } from './wecomDirectory.service';
import { formatPublicationReadinessMessage, validatePublicationReadiness } from './publicationReadiness.service';
import { SatisfactionSurveyService } from './satisfactionSurvey.service';
import logger from '../config/logger';
import { randomUUID } from 'crypto';

type ReminderRecipientLog = {
  employeeId?: string;
  employeeName?: string;
  department?: string;
  subDepartment?: string;
  role?: string;
  taskType: string;
  wecomUserId?: string;
  sent: boolean;
  reason?: string;
  pendingCount?: number;
  pendingEmployees?: Array<{ employeeId: string; employeeName: string }>;
};

type ReminderSendStats = {
  pendingCount: number;
  notificationCount: number;
  emailCount: number;
  wecomCount: number;
  recipientCount?: number;
  todoCount?: number;
  recipientDetails?: ReminderRecipientLog[];
};

type DepartmentProgressStats = {
  departmentCount: number;
  recipientCount: number;
  wecomCount: number;
  totalPendingCount: number;
  recipientDetails?: ReminderRecipientLog[];
};

type DailyReminderOptions = {
  allowDuplicateWecom?: boolean;
  requestedBy?: string;
};

const LOGIN_METHOD_GUIDE = '登录方式：姓名/工号 + 身份证后六位。系统不再使用随机初始密码或管理员自定义密码。';
const EMPLOYEE_SUMMARY_OPERATION_GUIDE = '登录系统 → 月度总结 → 填写工作总结和下月计划；标签和合理化建议为非强制；绩效结果会关联薪资绩效工资。';
const MANAGER_SCORING_OPERATION_GUIDE = '登录系统 → 部门经理工作台/评分 → 完成打分、评价语和标签；查看部门员工报表；结果会关联薪资绩效工资。';
const TASK_GENERATED_OPERATION_GUIDE = `员工：${EMPLOYEE_SUMMARY_OPERATION_GUIDE} 经理：${MANAGER_SCORING_OPERATION_GUIDE}`;

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
   * 仅在 1 月考核上年 12 月、7 月考核 6 月时准备半年度满意度调查。
   */
  static async ensureCurrentHalfYearSatisfactionSurvey(referenceDate: Date = new Date()) {
    return SatisfactionSurveyService.ensureSurveyForAssessmentDate(referenceDate, 'system');
  }

  static getPerformanceDeadline(month: string): Date {
    const [yearText, monthText] = month.split('-');
    return new Date(Number(yearText), Number(monthText), 7);
  }

  /**
   * HR/Admin 单独为某个员工生成某月绩效任务。
   * 只按当前考核范围、有效上级和模板规则生成，不会为不参与考核人员创建幽灵任务。
   */
  static async generatePerformanceTaskForEmployee(employeeId: string, month: string): Promise<{
    month: string;
    employeeId: string;
    employeeName?: string;
    status: 'created' | 'exists' | 'updated_assessor';
    record: any;
    todoCount: number;
    notificationCount: number;
  }> {
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee || (employee.status && employee.status !== 'active')) {
      throw new Error('员工不存在或已离职，不能生成绩效任务');
    }

    if (await AssessmentPublicationModel.isPublished(month)) {
      throw new Error('该月份绩效结果已发布，不能生成或重建任务');
    }

    const allEmployees = await EmployeeModel.findAll();
    const rankingConfig = await getPerformanceRankingConfig();
    const validIds = new Set<string>(
      allEmployees
        .filter((item: any) => !item.status || item.status === 'active')
        .map((item: any) => String(item.id))
    );

    if (!isSelfAssessmentEligibleRecord(employee, rankingConfig, { validEmployeeIds: validIds })) {
      throw new Error('该员工不在当前绩效考核范围内，不能生成任务');
    }

    const assessorId = resolveAssessorId(employee, validIds);
    if (!assessorId) {
      throw new Error('该员工未维护有效直属上级，不能生成绩效任务');
    }

    const template = await resolveTaskTemplateForEmployee(employee, rankingConfig);
    if (!template) {
      throw new Error('该员工没有可用考核模板，请先配置模板规则');
    }

    const existing = await PerformanceModel.findByEmployeeIdAndMonth(employee.id, month);
    if (existing) {
      if (
        existing.assessorId !== assessorId &&
        existing.status !== 'completed' &&
        existing.status !== 'scored'
      ) {
        const previousAssessorId = existing.assessorId;
        const updated = await PerformanceModel.update(existing.id, {
          assessorId,
          templateId: template.id,
          templateName: template.name,
          departmentType: template.departmentType,
        });
        let todoCount = 0;
        let notificationCount = 0;

        if (existing.status === 'submitted') {
          const reviewRelatedId = TodoModel.performanceReviewRelatedId(existing.id);
          await query(
            `DELETE FROM todos WHERE employee_id = $1 AND type = 'performance_review' AND related_id = $2`,
            [previousAssessorId, reviewRelatedId],
          );

          await query(
            `DELETE FROM notifications
             WHERE user_id = $1
               AND (
                 title LIKE $2
                 OR content LIKE $2
                 OR link LIKE $3
               )`,
            [previousAssessorId, `%${employee.name}%`, `%month=${month}%`],
          );

          const newAssessor = await EmployeeModel.findById(assessorId);
          if (newAssessor) {
            if (!await TodoModel.findExisting(assessorId, 'performance_review', reviewRelatedId)) {
              await TodoModel.create({
                employeeId: assessorId,
                type: 'performance_review',
                title: `评分${employee.name}${month}月绩效`,
                description: `${employee.name}已提交${month}月工作总结；因直属上级关系更新，请由你完成绩效评分。`,
                dueDate: existing.deadline ? new Date(existing.deadline) : this.getPerformanceDeadline(month),
                link: `/manager/dashboard?month=${month}`,
                relatedId: reviewRelatedId,
              });
              todoCount = 1;
            }
            notificationCount = await NotificationModel.createBatch([{
              userId: assessorId,
              type: 'reminder',
              title: `请评分${employee.name}${month}月绩效`,
              content: `${employee.name}的${month}月绩效任务已按最新直属上级关系转给你，请完成评分。操作方法：${MANAGER_SCORING_OPERATION_GUIDE}`,
              link: `/manager/dashboard?month=${month}`,
            }]);
          }
        }

        return {
          month,
          employeeId: employee.id,
          employeeName: employee.name,
          status: 'updated_assessor',
          record: updated || existing,
          todoCount,
          notificationCount,
        };
      }

      return {
        month,
        employeeId: employee.id,
        employeeName: employee.name,
        status: 'exists',
        record: existing,
        todoCount: 0,
        notificationCount: 0,
      };
    }

    const deadline = this.getPerformanceDeadline(month);
    const record = await PerformanceModel.saveSummary({
      id: `rec-${employee.id}-${month}`,
      employeeId: employee.id,
      assessorId,
      month,
      selfSummary: '',
      nextMonthPlan: '',
      groupType: 'all',
      deadline,
      templateId: template.id,
      templateName: template.name,
      departmentType: template.departmentType,
    });

    let todoCount = 0;
    const relatedId = TodoModel.performanceSummaryRelatedId(month);
    const existingTodo = await TodoModel.findExisting(employee.id, 'work_summary', relatedId);
    if (!existingTodo) {
      await TodoModel.create({
        employeeId: employee.id,
        type: 'work_summary',
        title: `提交${month}月度工作总结`,
        description: `请填写${month}工作总结和下月计划，供经理评分。操作方法：${EMPLOYEE_SUMMARY_OPERATION_GUIDE}`,
        dueDate: deadline,
        link: `/employee/summary?month=${month}`,
        relatedId,
      });
      todoCount = 1;
    }

    const notificationCount = await NotificationModel.createBatch([{
      userId: employee.id,
      type: 'reminder',
      title: `请提交${month}月度工作总结`,
      content: `系统已单独生成${month}绩效考核任务，请尽快填写上月工作总结和本月计划。操作方法：${EMPLOYEE_SUMMARY_OPERATION_GUIDE} ${LOGIN_METHOD_GUIDE}`,
      link: `/employee/summary?month=${month}`,
    }]);

    return {
      month,
      employeeId: employee.id,
      employeeName: employee.name,
      status: 'created',
      record,
      todoCount,
      notificationCount,
    };
  }

  private static async excludeEmployeeFromAssessment(employeeId: string, operatedBy: string = 'system'): Promise<boolean> {
    const normalizedEmployeeId = String(employeeId || '').trim();
    if (!normalizedEmployeeId) return false;

    const config = await getPerformanceRankingConfig();
    const alreadyExcluded = (config.participation.excludedEmployeeIds || [])
      .some((id) => String(id || '').trim() === normalizedEmployeeId);
    const wasExplicitlyIncluded = (config.participation.includedEmployeeIds || [])
      .some((id) => String(id || '').trim() === normalizedEmployeeId);
    const excludedEmployeeIds = Array.from(new Set([
      ...(config.participation.excludedEmployeeIds || []),
      normalizedEmployeeId,
    ]));
    const includedEmployeeIds = (config.participation.includedEmployeeIds || [])
      .filter((id) => String(id || '').trim() !== normalizedEmployeeId);

    if (alreadyExcluded && !wasExplicitlyIncluded) {
      return false;
    }

    await savePerformanceRankingConfig({
      ...config,
      participation: {
        ...config.participation,
        includedEmployeeIds,
        excludedEmployeeIds,
      },
    }, operatedBy);
    return true;
  }

  static async deletePerformanceTaskForEmployee(employeeId: string, month: string, options: {
    excludeFromAssessment?: boolean;
    operatedBy?: string;
  } = {}): Promise<{
    month: string;
    employeeId: string;
    recordDeleted: boolean;
    todoDeletedCount: number;
    notificationDeletedCount: number;
    assessmentExcluded: boolean;
  }> {
    if (await AssessmentPublicationModel.isPublished(month)) {
      throw new Error('该月份绩效结果已发布，如需删除请先取消发布');
    }

    const assessmentExcluded = options.excludeFromAssessment === true
      ? await this.excludeEmployeeFromAssessment(employeeId, options.operatedBy || 'system')
      : false;

    const record = await PerformanceModel.findByEmployeeIdAndMonth(employeeId, month);
    if (!record) {
      return {
        month,
        employeeId,
        recordDeleted: false,
        todoDeletedCount: 0,
        notificationDeletedCount: 0,
        assessmentExcluded,
      };
    }

    const recordDeleted = await PerformanceModel.delete(record.id);
    const todoResult = await query(`
      DELETE FROM todos
      WHERE (employee_id = $1 AND type = 'work_summary' AND related_id = $2)
         OR (type = 'performance_review' AND related_id = $3)
    `, [employeeId, TodoModel.performanceSummaryRelatedId(month), TodoModel.performanceReviewRelatedId(record.id)]);

    const notificationUsers = Array.from(new Set([employeeId, record.assessorId].filter(Boolean)));
    const notificationResult = notificationUsers.length > 0 ? await query(`
      DELETE FROM notifications
      WHERE user_id = ANY($1::text[])
        AND (
          title LIKE $2
          OR content LIKE $2
          OR link LIKE $3
        )
    `, [notificationUsers, `%${month}%`, `%month=${month}%`]) : { rowCount: 0 };

    return {
      month,
      employeeId,
      recordDeleted,
      todoDeletedCount: (todoResult as any).affectedRows ?? (todoResult as any).rowCount ?? 0,
      notificationDeletedCount: (notificationResult as any).affectedRows ?? (notificationResult as any).rowCount ?? 0,
      assessmentExcluded,
    };
  }

  static async remindPerformanceTaskForEmployee(employeeId: string, month: string): Promise<{
    month: string;
    employeeId: string;
    employeeName?: string;
    taskType: '员工提交总结' | '经理评分' | '无需提醒';
    recipient?: ReminderRecipientLog;
    notificationCount: number;
    todoCount: number;
  }> {
    const record = await PerformanceModel.findByEmployeeIdAndMonth(employeeId, month);
    if (!record) {
      throw new Error('该员工该月份绩效任务尚未生成，无法发送提醒');
    }

    const employee = await EmployeeModel.findById(record.employeeId);
    if (!employee || (employee.status && employee.status !== 'active')) {
      throw new Error('员工不存在或已离职，不能发送提醒');
    }

    const now = new Date();
    const deadline = record.deadline ? new Date(record.deadline) : this.getPerformanceDeadline(month);
    const deadlineDate = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}`;
    const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));

    if (record.status === 'draft') {
      const touser = await resolveEmployeeWecomUserId({
        id: String(employee.id || '').trim(),
        name: String(employee.name || '').trim(),
        wecomUserId: String((employee as any).wecomUserId || '').trim(),
      });
      const sent = touser ? await WecomWebhookService.sendReminder({
        cycleName: `${month}月工作总结`,
        taskType: '员工提交总结',
        daysLeft,
        deadlineDate,
        pendingCount: 1,
        employeeNames: [employee.name],
        operationGuide: EMPLOYEE_SUMMARY_OPERATION_GUIDE,
        actionPath: `/employee/summary?month=${month}`,
      }, touser) : false;

      const relatedId = TodoModel.performanceSummaryRelatedId(month);
      let todoCount = 0;
      if (!await TodoModel.findExisting(employee.id, 'work_summary', relatedId)) {
        await TodoModel.create({
          employeeId: employee.id,
          type: 'work_summary',
          title: `提交${month}月度工作总结`,
          description: `请填写${month}工作总结和下月计划，供经理评分。操作方法：${EMPLOYEE_SUMMARY_OPERATION_GUIDE}`,
          dueDate: deadline,
          link: `/employee/summary?month=${month}`,
          relatedId,
        });
        todoCount = 1;
      }

      const notificationCount = await NotificationModel.createBatch([{
        userId: employee.id,
        type: 'reminder',
        title: `请提交${month}月度工作总结`,
        content: `${month}月绩效考核待提交：${EMPLOYEE_SUMMARY_OPERATION_GUIDE} ${LOGIN_METHOD_GUIDE}`,
        link: `/employee/summary?month=${month}`,
      }]);

      return {
        month,
        employeeId: employee.id,
        employeeName: employee.name,
        taskType: '员工提交总结',
        notificationCount,
        todoCount,
        recipient: {
          employeeId: employee.id,
          employeeName: employee.name,
          department: employee.department,
          subDepartment: employee.subDepartment,
          taskType: '员工提交总结',
          wecomUserId: touser || undefined,
          sent,
          ...(sent ? {} : { reason: touser ? '企业微信发送失败' : '未匹配到企业微信用户ID' }),
        },
      };
    }

    if (record.status === 'submitted') {
      const manager = record.assessorId ? await EmployeeModel.findById(record.assessorId) : null;
      if (!manager || (manager.status && manager.status !== 'active')) {
        throw new Error('该绩效任务没有有效考评人，不能发送经理评分提醒');
      }

      const touser = await resolveEmployeeWecomUserId({
        id: String(manager.id || '').trim(),
        name: String(manager.name || '').trim(),
        wecomUserId: String((manager as any).wecomUserId || '').trim(),
      });
      const sent = touser ? await WecomWebhookService.sendReminder({
        cycleName: `${month}月经理打分`,
        taskType: '经理评分',
        daysLeft,
        deadlineDate,
        pendingCount: 1,
        employeeNames: [employee.name],
        operationGuide: MANAGER_SCORING_OPERATION_GUIDE,
        actionPath: `/manager/dashboard?month=${month}`,
      }, touser) : false;

      const relatedId = TodoModel.performanceReviewRelatedId(record.id);
      let todoCount = 0;
      if (!await TodoModel.findExisting(manager.id, 'performance_review', relatedId)) {
        await TodoModel.create({
          employeeId: manager.id,
          type: 'performance_review',
          title: `评分${employee.name}${month}月绩效`,
          description: `${employee.name}已提交${month}月工作总结，请完成绩效评分。`,
          dueDate: deadline,
          link: `/manager/dashboard?month=${month}`,
          relatedId,
        });
        todoCount = 1;
      }

      const notificationCount = await NotificationModel.createBatch([{
        userId: manager.id,
        type: 'reminder',
        title: `请评分${employee.name}${month}月绩效`,
        content: `${employee.name}已提交${month}月工作总结。操作方法：${MANAGER_SCORING_OPERATION_GUIDE} ${LOGIN_METHOD_GUIDE}`,
        link: `/manager/dashboard?month=${month}`,
      }]);

      return {
        month,
        employeeId: employee.id,
        employeeName: employee.name,
        taskType: '经理评分',
        notificationCount,
        todoCount,
        recipient: {
          employeeId: manager.id,
          employeeName: manager.name,
          department: manager.department,
          subDepartment: manager.subDepartment,
          taskType: '经理评分',
          wecomUserId: touser || undefined,
          sent,
          pendingCount: 1,
          pendingEmployees: [{ employeeId: employee.id, employeeName: employee.name }],
          ...(sent ? {} : { reason: touser ? '企业微信发送失败' : '未匹配到企业微信用户ID' }),
        },
      };
    }

    return {
      month,
      employeeId: employee.id,
      employeeName: employee.name,
      taskType: '无需提醒',
      notificationCount: 0,
      todoCount: 0,
    };
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
    taskGeneratedWecomCount?: number;
    satisfactionSurveyPeriod?: string;
    total: number;
  }> {
    const previousMonthDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - 1, 1);
    const targetMonth = `${previousMonthDate.getFullYear()}-${String(previousMonthDate.getMonth() + 1).padStart(2, '0')}`;
    const todoRelatedId = TodoModel.performanceSummaryRelatedId(targetMonth);
    const summaryLink = `/employee/summary?month=${targetMonth}`;
    const dueDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 7);

    const allEmployees = await EmployeeModel.findAll();
    const validIds = new Set<string>(
      allEmployees
        .filter((employee: any) => !employee.status || employee.status === 'active')
        .map((employee: any) => employee.id)
    );
    const rankingConfig = await getPerformanceRankingConfig();
    const assessableEmployees = allEmployees
      .filter((employee: any) => isSelfAssessmentEligibleRecord(employee, rankingConfig, { validEmployeeIds: validIds }));

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

      const groupType = 'all';
      const assessorId = resolveAssessorId(employee, validIds);
      if (!assessorId) {
        skippedCount++;
        continue;
      }

      const template = await resolveTaskTemplateForEmployee(employee, rankingConfig);
      if (!template) {
        logger.warn(`[Scheduler] 跳过 ${employee.name || employee.id} ${targetMonth} 绩效任务：没有可用考核模板`);
        skippedCount++;
        continue;
      }

      await PerformanceModel.saveSummary({
        id: `rec-${employee.id}-${targetMonth}`,
        employeeId: employee.id,
        assessorId,
        month: targetMonth,
        selfSummary: '',
        nextMonthPlan: '',
        groupType,
        deadline: dueDate,
        templateId: template.id,
        templateName: template.name,
        departmentType: template.departmentType
      });
      createdCount++;

      notifications.push({
        userId: employee.id,
        type: 'reminder',
        title: `请提交${targetMonth}月度工作总结`,
        content: `系统已生成${targetMonth}绩效考核任务，请尽快填写上月工作总结和本月计划。操作方法：${EMPLOYEE_SUMMARY_OPERATION_GUIDE} ${LOGIN_METHOD_GUIDE}`,
        link: summaryLink
      });

      const existingTodo = await TodoModel.findExisting(employee.id, 'work_summary', todoRelatedId);
      if (!existingTodo) {
        await TodoModel.create({
          employeeId: employee.id,
          type: 'work_summary',
          title: `提交${targetMonth}月度工作总结`,
          description: `请填写${targetMonth}工作总结和下月计划，供经理评分。操作方法：${EMPLOYEE_SUMMARY_OPERATION_GUIDE}`,
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

    // 企业微信通知：只发给本期参与考核员工和对应经理
    const taskGeneratedRecipients = await this.resolveWecomRecipientsForEmployees(assessableEmployees, allEmployees, true);
    let taskGeneratedWecomCount = 0;
    if (taskGeneratedRecipients.length > 0 && createdCount > 0) {
      const sent = await WecomWebhookService.sendTaskGenerated({
        month: targetMonth,
        totalCount: createdCount,
        dueDate: dueDate.toLocaleDateString('zh-CN'),
        operationGuide: TASK_GENERATED_OPERATION_GUIDE,
      }, taskGeneratedRecipients.join(','));
      taskGeneratedWecomCount = sent ? taskGeneratedRecipients.length : 0;
    }

    const satisfactionSurvey = await SatisfactionSurveyService.ensureSurveyForPerformanceMonth(targetMonth, 'system');

    return {
      month: targetMonth,
      createdCount,
      skippedCount,
      notificationCount,
      todoCount,
      emailCount,
      taskGeneratedWecomCount,
      ...(satisfactionSurvey ? { satisfactionSurveyPeriod: satisfactionSurvey.period } : {}),
      total: assessableEmployees.length
    };
  }

  /**
   * 每日催办工作流（1-6号）
   * 1. 催员工写总结（draft → submitted）
   * 2. 催经理打分（submitted → scored）
   * 3. 统计部门完成率，推送到企业微信
   */
  static async dailyReminderWorkflow(forceToday: boolean = false, requestedTargetMonth?: string, options: DailyReminderOptions = {}): Promise<any> {
    const startedAt = Date.now();
    let targetMonth = requestedTargetMonth;
    try {
      const now = new Date();
      const dayOfMonth = now.getDate();

      // 只在1-6号执行催办（手动触发时跳过日期检查）
      if (!forceToday && dayOfMonth > 6) {
        logger.info('[Scheduler] dailyReminderWorkflow: 非1-6号，跳过催办');
        const result = { month: targetMonth, skipped: true, reason: '非1-6号自动催办窗口' };
        await this.writeAutomationLog('send_reminders', targetMonth, 'skipped', result, Date.now() - startedAt);
        return result;
      }

      // 计算目标绩效月份；手动补发可指定月份，定时任务默认催办上月。
      const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
      targetMonth = requestedTargetMonth && monthPattern.test(requestedTargetMonth)
        ? requestedTargetMonth
        : `${new Date(now.getFullYear(), now.getMonth() - 1, 1).getFullYear()}-${String(new Date(now.getFullYear(), now.getMonth() - 1, 1).getMonth() + 1).padStart(2, '0')}`;
      const [targetYearText, targetMonthText] = targetMonth.split('-');
      const deadline = new Date(Number(targetYearText), Number(targetMonthText), 7);
      const deadlineDate = `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}`;
      const daysLeft = Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      const isLastDay = daysLeft <= 1;

      logger.info(`[Scheduler] 催办 ${targetMonth}，今天是${dayOfMonth}号，距截止还有${daysLeft}天`);

      // ========== 第一阶段：催未写总结的员工 ==========
      const employeeStats = await this.remindEmployeesToSubmit(targetMonth, daysLeft, isLastDay, deadlineDate, forceToday, false);

      // ========== 第二阶段：催经理给已提交的员工打分 ==========
      const managerStats = await this.remindManagersToScore(targetMonth, daysLeft, isLastDay, deadlineDate, forceToday, false);

      // ========== 企业微信综合催办：同一接收人当天默认最多一条 ==========
      const combinedWecomStats = await this.sendCombinedPerformanceReminders(
        targetMonth,
        daysLeft,
        deadlineDate,
        options.allowDuplicateWecom === true,
      );

      // ========== 第三阶段：统计部门完成率并推送 ==========
      const departmentStats = await this.pushDepartmentProgress(targetMonth, dayOfMonth, daysLeft, false);

      const result = {
        month: targetMonth,
        force: forceToday,
        allowDuplicateWecom: options.allowDuplicateWecom === true,
        requestedBy: options.requestedBy,
        daysLeft,
        employeeReminders: employeeStats,
        managerReminders: managerStats,
        combinedWecomReminders: combinedWecomStats,
        departmentProgress: departmentStats,
      };
      await this.writeAutomationLog('send_reminders', targetMonth, 'success', result, Date.now() - startedAt);
      return result;

    } catch (err) {
      logger.error(`[Scheduler] dailyReminderWorkflow 出错: ${err}`);
      const result = { month: targetMonth, error: err instanceof Error ? err.message : String(err) };
      await this.writeAutomationLog('send_reminders', targetMonth, 'failed', result, Date.now() - startedAt);
      return result;
    }
  }

  /**
   * 催未写总结的员工（draft 状态）
   */
  private static async remindEmployeesToSubmit(month: string, daysLeft: number, isLastDay: boolean, deadlineDate: string, forceToday: boolean, sendWecom: boolean = true): Promise<ReminderSendStats> {
    if (USE_MEMORY_DB) return { pendingCount: 0, notificationCount: 0, emailCount: 0, wecomCount: 0 };

    const assessableEmployeeIds = await this.getAssessableEmployeeIdSet();
    if (assessableEmployeeIds.size === 0) return { pendingCount: 0, notificationCount: 0, emailCount: 0, wecomCount: 0 };

    // 查找 draft 状态的记录
    const sql = `
      SELECT pr.employee_id as "employeeId", pr.id as "recordId",
             e.name as "employeeName", e.email, e.department, e.sub_department as "subDepartment", e.manager_id as "managerId",
             e.wecom_user_id as "wecomUserId"
      FROM performance_records pr
      JOIN employees e ON e.id = pr.employee_id
      WHERE pr.month = $1 AND pr.status = 'draft'
        AND pr.employee_id = ANY($2::text[])
        AND (e.status = 'active' OR e.status IS NULL)
      ORDER BY e.department, e.name
    `;
    const pending = await query(sql, [month, Array.from(assessableEmployeeIds)]);

    if (pending.length === 0) {
      logger.info(`[Scheduler] ${month} 所有员工已完成总结提交`);
      return { pendingCount: 0, notificationCount: 0, emailCount: 0, wecomCount: 0 };
    }

    const urgency = isLastDay ? '🔴【最后一天】' : daysLeft <= 2 ? '🟠【紧急】' : '🟡【提醒】';
    logger.info(`[Scheduler] ${month} 还有 ${pending.length} 人未提交总结`);

    // 站内通知
    const notifications: CreateNotificationInput[] = pending.map((r: any) => ({
      userId: r.employeeId,
      type: isLastDay ? 'deadline' : 'reminder',
      title: `${urgency}请提交${month}月度工作总结（还剩${daysLeft}天）`,
      content: `${month}月绩效考核待提交：${EMPLOYEE_SUMMARY_OPERATION_GUIDE} ${LOGIN_METHOD_GUIDE}`,
      link: '/employee/summary',
    }));
    const filteredNotifications = forceToday ? notifications : await this.filterNotificationsAlreadySentToday(notifications);
    const notificationCount = await NotificationModel.createBatch(filteredNotifications);

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
    const recipientDetails: ReminderRecipientLog[] = [];
    for (const row of pending) {
      const touser = await resolveEmployeeWecomUserId({
        id: String(row.employeeId || '').trim(),
        name: String(row.employeeName || '').trim(),
        wecomUserId: String(row.wecomUserId || '').trim(),
      });
      let sent = false;
      let reason: string | undefined;
      if (!sendWecom) {
        reason = '由综合绩效催办统一发送';
      } else if (!touser) {
        reason = '未匹配到企业微信用户ID';
      } else {
        sent = await WecomWebhookService.sendReminder({
          cycleName: `${month}月工作总结`,
          taskType: '员工提交总结',
          daysLeft,
          deadlineDate: deadlineDate || '',
          pendingCount: 1,
          employeeNames: [row.employeeName],
          operationGuide: EMPLOYEE_SUMMARY_OPERATION_GUIDE,
          actionPath: `/employee/summary?month=${month}`,
        }, touser);
        if (!sent) reason = '企业微信发送失败';
      }
      if (sent) wecomCount++;
      recipientDetails.push({
        employeeId: String(row.employeeId || ''),
        employeeName: String(row.employeeName || ''),
        department: row.department ? String(row.department) : undefined,
        subDepartment: row.subDepartment ? String(row.subDepartment) : undefined,
        taskType: '员工提交总结',
        wecomUserId: touser || undefined,
        sent,
        ...(reason ? { reason } : {}),
      });
    }

    logger.info(`[Scheduler] 催员工提交: ${pending.length}人, 邮件${emailCount}封, 企业微信${wecomCount}条`);
    return { pendingCount: pending.length, notificationCount, emailCount, wecomCount, recipientDetails };
  }

  /**
   * 催经理给已提交的员工打分（submitted 状态）
   * 按经理分组，列出其下属中待打分的人员
   */
  private static async remindManagersToScore(month: string, daysLeft: number, isLastDay: boolean, deadlineDate: string, forceToday: boolean, sendWecom: boolean = true): Promise<ReminderSendStats> {
    if (USE_MEMORY_DB) return { pendingCount: 0, notificationCount: 0, emailCount: 0, wecomCount: 0, recipientCount: 0 };

    const assessableEmployeeIds = await this.getAssessableEmployeeIdSet();
    if (assessableEmployeeIds.size === 0) return { pendingCount: 0, notificationCount: 0, emailCount: 0, wecomCount: 0, recipientCount: 0 };

    // 查找 submitted 状态的记录（员工已提交，等经理打分）
    const sql = `
      SELECT pr.employee_id as "employeeId", pr.assessor_id as "assessorId",
             pr.id as "recordId", pr.deadline,
             e.name as "employeeName", e.department,
             mgr.name as "managerName", mgr.email as "managerEmail",
             mgr.wecom_user_id as "managerWecomUserId"
      FROM performance_records pr
      JOIN employees e ON e.id = pr.employee_id
      LEFT JOIN employees mgr ON mgr.id = pr.assessor_id
      WHERE pr.month = $1 AND pr.status = 'submitted'
        AND pr.employee_id = ANY($2::text[])
        AND (e.status = 'active' OR e.status IS NULL)
        AND mgr.id IS NOT NULL
        AND (mgr.status = 'active' OR mgr.status IS NULL)
      ORDER BY pr.assessor_id, e.department
    `;
    const submitted = await query(sql, [month, Array.from(assessableEmployeeIds)]);

    if (submitted.length === 0) {
      logger.info(`[Scheduler] ${month} 无待打分记录`);
      return { pendingCount: 0, notificationCount: 0, emailCount: 0, wecomCount: 0, recipientCount: 0 };
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
    let notificationCount = 0;
    let emailCount = 0;
    let wecomCount = 0;
    let todoCount = 0;
    const recipientDetails: ReminderRecipientLog[] = [];

    for (const [managerId, group] of Object.entries(byManager)) {
      const names = group.employees.map((e: any) => e.employeeName).join('、');
      const count = group.employees.length;

      for (const employeeRecord of group.employees) {
        const relatedId = TodoModel.performanceReviewRelatedId(String(employeeRecord.recordId));
        const existingTodo = await TodoModel.findExisting(managerId, 'performance_review', relatedId);
        if (!existingTodo) {
          await TodoModel.create({
            employeeId: managerId,
            type: 'performance_review',
            title: `评分${employeeRecord.employeeName}${month}月绩效`,
            description: `${employeeRecord.employeeName}已提交${month}月工作总结，请完成绩效评分。`,
            dueDate: employeeRecord.deadline ? new Date(employeeRecord.deadline) : undefined,
            link: `/manager/dashboard?month=${month}`,
            relatedId,
          });
          todoCount++;
        }
      }

      // 站内通知经理
      const managerNotifications: CreateNotificationInput[] = [{
        userId: managerId,
        type: isLastDay ? 'deadline' : 'reminder',
        title: `${urgency}${count}名下属${month}月绩效待打分（还剩${daysLeft}天）`,
        content: `以下员工已提交${month}月工作总结。操作方法：${MANAGER_SCORING_OPERATION_GUIDE} ${LOGIN_METHOD_GUIDE} 待评分员工：${names}`,
        link: '/manager/dashboard',
      }];
      const filteredManagerNotifications = forceToday ? managerNotifications : await this.filterNotificationsAlreadySentToday(managerNotifications);
      notificationCount += await NotificationModel.createBatch(filteredManagerNotifications);

      // 邮件通知经理（测试模式跳过）
      if (!process.env.WECOM_TEST_USER && group.manager.email) {
        try {
          await EmailService.sendDeadlineReminder(
            group.manager.email, group.manager.name, `${month}月绩效打分`,
            'performance_review', deadlineDate || `${daysLeft}天后`, '/manager/dashboard'
          );
          emailCount++;
        } catch (e) {
          logger.warn(`[Scheduler] 经理催办邮件失败 ${group.manager.name}: ${e}`);
        }
      }

      const touser = await resolveEmployeeWecomUserId({
        id: String(managerId || '').trim(),
        name: String(group.manager.name || '').trim(),
        wecomUserId: String(group.manager.managerWecomUserId || '').trim(),
      });
      let sent = false;
      let reason: string | undefined;
      if (!sendWecom) {
        reason = '由综合绩效催办统一发送';
      } else if (touser) {
        sent = await WecomWebhookService.sendReminder({
          cycleName: `${month}月经理打分`,
          taskType: '经理评分',
          daysLeft,
          deadlineDate: deadlineDate || '',
          pendingCount: count,
          employeeNames: group.employees.map((e: any) => e.employeeName),
          operationGuide: MANAGER_SCORING_OPERATION_GUIDE,
          actionPath: `/manager/dashboard?month=${month}`,
        }, touser);
        if (sent) {
          wecomCount++;
        } else {
          reason = '企业微信发送失败';
        }
      } else {
        reason = '未匹配到企业微信用户ID';
      }
      recipientDetails.push({
        employeeId: String(managerId || ''),
        employeeName: String(group.manager.name || ''),
        taskType: '经理评分',
        wecomUserId: touser || undefined,
        sent,
        pendingCount: count,
        pendingEmployees: group.employees.map((employee: any) => ({
          employeeId: String(employee.employeeId || ''),
          employeeName: String(employee.employeeName || ''),
        })),
        ...(reason ? { reason } : {}),
      });

      logger.info(`[Scheduler] 催经理 ${group.manager.name} 打分: ${count}人 (${names})`);
    }
    return { pendingCount: submitted.length, notificationCount, emailCount, wecomCount, recipientCount: Object.keys(byManager).length, todoCount, recipientDetails };
  }

  private static async hasWecomReminderSentToday(month: string, employeeId: string): Promise<boolean> {
    if (USE_MEMORY_DB) return false;
    const rows = await query(`
      WITH logs AS (
        SELECT details
        FROM automation_logs
        WHERE job_type = 'send_reminders'
          AND month = $1
          AND status = 'success'
          AND COALESCE(executed_at, created_at)::date = CURRENT_DATE
      ),
      recipients AS (
        SELECT jsonb_array_elements(COALESCE(details->'combinedWecomReminders'->'recipientDetails', '[]'::jsonb)) AS item FROM logs
        UNION ALL
        SELECT jsonb_array_elements(COALESCE(details->'employeeReminders'->'recipientDetails', '[]'::jsonb)) AS item FROM logs
        UNION ALL
        SELECT jsonb_array_elements(COALESCE(details->'managerReminders'->'recipientDetails', '[]'::jsonb)) AS item FROM logs
        UNION ALL
        SELECT jsonb_array_elements(COALESCE(details->'departmentProgress'->'recipientDetails', '[]'::jsonb)) AS item FROM logs
      )
      SELECT COUNT(*)::int AS count
      FROM recipients
      WHERE item->>'employeeId' = $2
        AND item->>'sent' = 'true'
    `, [month, employeeId]);
    return Number(rows?.[0]?.count || 0) > 0;
  }

  private static async sendCombinedPerformanceReminders(
    month: string,
    daysLeft: number,
    deadlineDate: string,
    allowDuplicateWecom: boolean = false,
  ): Promise<ReminderSendStats> {
    if (USE_MEMORY_DB) return { pendingCount: 0, notificationCount: 0, emailCount: 0, wecomCount: 0, recipientCount: 0 };

    const assessableEmployeeIds = await this.getAssessableEmployeeIdSet();
    if (assessableEmployeeIds.size === 0) return { pendingCount: 0, notificationCount: 0, emailCount: 0, wecomCount: 0, recipientCount: 0 };
    const assessableIds = Array.from(assessableEmployeeIds);

    const draftRows = await query(`
      SELECT pr.employee_id as "employeeId",
             e.name as "employeeName",
             e.department,
             e.sub_department as "subDepartment",
             e.wecom_user_id as "wecomUserId"
      FROM performance_records pr
      JOIN employees e ON e.id = pr.employee_id
      WHERE pr.month = $1 AND pr.status = 'draft'
        AND pr.employee_id = ANY($2::text[])
        AND (e.status = 'active' OR e.status IS NULL)
      ORDER BY e.department, e.name
    `, [month, assessableIds]);

    const scoreRows = await query(`
      SELECT pr.employee_id as "employeeId", pr.assessor_id as "assessorId",
             e.name as "employeeName",
             mgr.name as "managerName",
             mgr.department as "managerDepartment",
             mgr.sub_department as "managerSubDepartment",
             mgr.wecom_user_id as "managerWecomUserId"
      FROM performance_records pr
      JOIN employees e ON e.id = pr.employee_id
      LEFT JOIN employees mgr ON mgr.id = pr.assessor_id
      WHERE pr.month = $1 AND pr.status = 'submitted'
        AND pr.employee_id = ANY($2::text[])
        AND (e.status = 'active' OR e.status IS NULL)
        AND mgr.id IS NOT NULL
        AND (mgr.status = 'active' OR mgr.status IS NULL)
      ORDER BY pr.assessor_id, e.department, e.name
    `, [month, assessableIds]);

    const byRecipient = new Map<string, {
      employeeId: string;
      employeeName: string;
      department?: string;
      subDepartment?: string;
      wecomUserId?: string;
      selfSummaryPending: boolean;
      scorePendingEmployees: Array<{ employeeId: string; employeeName: string }>;
    }>();

    const ensureRecipient = (payload: { employeeId: string; employeeName: string; department?: string; subDepartment?: string; wecomUserId?: string }) => {
      const id = String(payload.employeeId || '').trim();
      if (!byRecipient.has(id)) {
        byRecipient.set(id, {
          employeeId: id,
          employeeName: String(payload.employeeName || id),
          department: payload.department,
          subDepartment: payload.subDepartment,
          wecomUserId: payload.wecomUserId,
          selfSummaryPending: false,
          scorePendingEmployees: [],
        });
      }
      const recipient = byRecipient.get(id)!;
      recipient.employeeName = recipient.employeeName || String(payload.employeeName || id);
      recipient.department = recipient.department || payload.department;
      recipient.subDepartment = recipient.subDepartment || payload.subDepartment;
      recipient.wecomUserId = recipient.wecomUserId || payload.wecomUserId;
      return recipient;
    };

    for (const row of draftRows) {
      const recipient = ensureRecipient({
        employeeId: String(row.employeeId || ''),
        employeeName: String(row.employeeName || ''),
        department: row.department ? String(row.department) : undefined,
        subDepartment: row.subDepartment ? String(row.subDepartment) : undefined,
        wecomUserId: row.wecomUserId ? String(row.wecomUserId) : undefined,
      });
      recipient.selfSummaryPending = true;
    }

    for (const row of scoreRows) {
      const recipient = ensureRecipient({
        employeeId: String(row.assessorId || ''),
        employeeName: String(row.managerName || row.assessorId || ''),
        department: row.managerDepartment ? String(row.managerDepartment) : undefined,
        subDepartment: row.managerSubDepartment ? String(row.managerSubDepartment) : undefined,
        wecomUserId: row.managerWecomUserId ? String(row.managerWecomUserId) : undefined,
      });
      recipient.scorePendingEmployees.push({
        employeeId: String(row.employeeId || ''),
        employeeName: String(row.employeeName || ''),
      });
    }

    let wecomCount = 0;
    const recipientDetails: ReminderRecipientLog[] = [];
    for (const recipient of byRecipient.values()) {
      const touser = await resolveEmployeeWecomUserId({
        id: recipient.employeeId,
        name: recipient.employeeName,
        wecomUserId: recipient.wecomUserId || '',
      });
      let sent = false;
      let reason: string | undefined;

      if (!touser) {
        reason = '未匹配到企业微信用户ID';
      } else if (!allowDuplicateWecom && await this.hasWecomReminderSentToday(month, recipient.employeeId)) {
        reason = '今日已发送过催办，默认不重复发送';
      } else {
        sent = await WecomWebhookService.sendCombinedPerformanceReminder({
          month,
          daysLeft,
          deadlineDate,
          selfSummaryPending: recipient.selfSummaryPending,
          scorePendingEmployeeNames: recipient.scorePendingEmployees.map((employee) => employee.employeeName),
        }, touser);
        if (!sent) reason = '企业微信发送失败';
      }

      if (sent) wecomCount++;
      recipientDetails.push({
        employeeId: recipient.employeeId,
        employeeName: recipient.employeeName,
        department: recipient.department,
        subDepartment: recipient.subDepartment,
        taskType: '综合绩效催办',
        wecomUserId: touser || undefined,
        sent,
        pendingCount: (recipient.selfSummaryPending ? 1 : 0) + recipient.scorePendingEmployees.length,
        pendingEmployees: recipient.scorePendingEmployees,
        ...(reason ? { reason } : {}),
      });
    }

    return {
      pendingCount: draftRows.length + scoreRows.length,
      notificationCount: 0,
      emailCount: 0,
      wecomCount,
      recipientCount: byRecipient.size,
      recipientDetails,
    };
  }

  /**
   * 统计部门完成率并推送到企业微信
   */
  private static async pushDepartmentProgress(month: string, dayOfMonth: number, daysLeft: number, sendWecom: boolean = true): Promise<DepartmentProgressStats> {
    if (USE_MEMORY_DB) return { departmentCount: 0, recipientCount: 0, wecomCount: 0, totalPendingCount: 0 };

    const assessableEmployeeIds = await this.getAssessableEmployeeIdSet();
    if (assessableEmployeeIds.size === 0) return { departmentCount: 0, recipientCount: 0, wecomCount: 0, totalPendingCount: 0 };

    // 按部门统计各状态数量
    const sql = `
      SELECT e.department,
             COUNT(*) FILTER (WHERE pr.status = 'draft') as "draftCount",
             COUNT(*) FILTER (WHERE pr.status = 'submitted') as "submittedCount",
             COUNT(*) FILTER (WHERE pr.status IN ('scored', 'completed')) as "doneCount",
             COUNT(*) as total,
             array_remove(array_agg(DISTINCT pr.assessor_id) FILTER (WHERE pr.status IN ('draft', 'submitted')), NULL) as "assessorIds"
      FROM performance_records pr
      JOIN employees e ON e.id = pr.employee_id
      WHERE pr.month = $1
        AND pr.employee_id = ANY($2::text[])
        AND (e.status = 'active' OR e.status IS NULL)
      GROUP BY e.department
      ORDER BY e.department
    `;
    const deptStats = await query(sql, [month, Array.from(assessableEmployeeIds)]);

    if (deptStats.length === 0) return { departmentCount: 0, recipientCount: 0, wecomCount: 0, totalPendingCount: 0 };

    const allEmployees = await EmployeeModel.findAll();
    const activeEmployees = allEmployees.filter((employee: any) => !employee.status || employee.status === 'active');
    const activeEmployeeById = new Map<string, any>(
      activeEmployees.map((employee: any) => [String(employee.id), employee])
    );

    // 计算总完成率
    let totalDone = 0, totalAll = 0;
    for (const d of deptStats) {
      // doneCount = 已打分 + 已完成 = 绩效流程走完
      totalDone += parseInt(d.doneCount) + parseInt(d.submittedCount);
      totalAll += parseInt(d.total);
    }
    const overallRate = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0;

    const resolveDepartmentRecipients = async (assessorIds: string[]) => {
      const uniqueAssessorIds = Array.from(new Set(assessorIds.map((id) => String(id || '').trim()).filter(Boolean)));
      const recipients = await Promise.all(
        uniqueAssessorIds.map(async (employeeId) => {
          const employee = activeEmployeeById.get(employeeId);
          if (!employee) {
            return {
              employeeId,
              employeeName: '',
              taskType: '部门进度催办',
              sent: false,
              reason: '考评人不存在或已离职',
            } as ReminderRecipientLog;
          }
          const wecomUserId = await resolveEmployeeWecomUserId({
            id: String(employee.id || '').trim(),
            name: String(employee.name || '').trim(),
            wecomUserId: String(employee.wecomUserId || '').trim(),
          });
          return {
            employeeId: String(employee.id || ''),
            employeeName: String(employee.name || ''),
            department: employee.department ? String(employee.department) : undefined,
            subDepartment: employee.subDepartment ? String(employee.subDepartment) : undefined,
            role: employee.role ? String(employee.role) : undefined,
            taskType: '部门进度催办',
            wecomUserId: wecomUserId || undefined,
            sent: false,
            reason: wecomUserId ? undefined : '未匹配到企业微信用户ID',
          } as ReminderRecipientLog;
        }),
      );
      return recipients;
    };

    let recipientCount = 0;
    let wecomCount = 0;
    let totalPendingCount = 0;
    const recipientDetails: ReminderRecipientLog[] = [];

    for (const d of deptStats) {
      const completedCount = parseInt(d.doneCount);
      const submittedCount = parseInt(d.submittedCount);
      const draftCount = parseInt(d.draftCount);
      const totalCount = parseInt(d.total);
      const done = completedCount + submittedCount;
      const rate = totalCount > 0 ? Math.round((done / totalCount) * 100) : 0;
      totalPendingCount += draftCount + submittedCount;

      const rawAssessorIds = Array.isArray(d.assessorIds) ? d.assessorIds : [];
      const departmentRecipientDetails = await resolveDepartmentRecipients(rawAssessorIds);
      if (departmentRecipientDetails.length > 0 && (draftCount > 0 || submittedCount > 0)) {
        const deliverableRecipients = departmentRecipientDetails
          .filter((recipient) => recipient.wecomUserId)
          .map((recipient) => recipient.wecomUserId as string);
        const recipientTarget = Array.from(new Set(deliverableRecipients)).join(',');
        let progressSent = false;
        if (sendWecom && recipientTarget) {
          progressSent = await WecomWebhookService.sendDepartmentProgress({
            month,
            dayOfMonth,
            daysLeft,
            department: String(d.department || ''),
            totalCount,
            completedCount,
            submittedCount,
            draftCount,
          }, recipientTarget);
        }

        for (const recipient of departmentRecipientDetails) {
          const sent = Boolean(sendWecom && progressSent && recipient.wecomUserId);
          recipientDetails.push({
            ...recipient,
            department: String(d.department || recipient.department || ''),
            sent,
            pendingCount: draftCount + submittedCount,
            ...(sent ? { reason: undefined } : { reason: sendWecom ? (recipient.reason || (recipientTarget ? '企业微信发送失败' : '未匹配到企业微信用户ID')) : '部门进度不再单独推送，避免重复催办' }),
          });
        }

        if (progressSent) {
          recipientCount += deliverableRecipients.length;
          wecomCount += deliverableRecipients.length;
        }

        if (sendWecom && dayOfMonth === 6 && (draftCount > 0 || submittedCount > 0) && recipientTarget) {
          await WecomWebhookService.sendDepartmentDeadlineAlert({
          month,
          dayOfMonth,
          daysLeft,
          department: String(d.department || ''),
          totalCount,
          completedCount,
          submittedCount,
          draftCount,
          }, recipientTarget);
        }
      }
    }

    logger.info(`[Scheduler] 部门进度精准发送: ${deptStats.length}个部门, 接收人${recipientCount}人, 总完成率${overallRate}%`);
    return { departmentCount: deptStats.length, recipientCount, wecomCount, totalPendingCount, recipientDetails };
  }

  private static async getAssessableEmployeeIdSet(): Promise<Set<string>> {
    const allEmployees = await EmployeeModel.findAll();
    const rankingConfig = await getPerformanceRankingConfig();
    const validIds = new Set<string>(
      allEmployees
        .filter((employee: any) => !employee.status || employee.status === 'active')
        .map((employee: any) => String(employee.id))
    );
    return new Set(
      allEmployees
        .filter((employee: any) => isSelfAssessmentEligibleRecord(employee, rankingConfig, { validEmployeeIds: validIds }))
        .map((employee: any) => String(employee.id)),
    );
  }

  private static async resolveWecomRecipientsForEmployees(employees: any[], allEmployees: any[], includeManagers: boolean): Promise<string[]> {
    const recipientEmployees = new Map<string, any>();
    const employeeById = new Map<string, any>(allEmployees.map((employee: any) => [String(employee.id), employee]));

    for (const employee of employees) {
      recipientEmployees.set(String(employee.id), employee);
      if (includeManagers && employee.managerId) {
        const manager = employeeById.get(String(employee.managerId));
        if (manager && (!manager.status || manager.status === 'active')) {
          recipientEmployees.set(String(manager.id), manager);
        }
      }
    }

    const recipients = await Promise.all(
      Array.from(recipientEmployees.values()).map(async (employee: any) => {
        try {
          return await resolveEmployeeWecomUserId({
            id: String(employee.id || '').trim(),
            name: String(employee.name || '').trim(),
            wecomUserId: String(employee.wecomUserId || '').trim(),
          });
        } catch (error) {
          logger.warn(`[Scheduler] 解析企业微信接收人失败 ${employee.name || employee.id}: ${error}`);
          return null;
        }
      }),
    );
    return Array.from(new Set(recipients.filter((item): item is string => Boolean(item))));
  }

  private static async filterNotificationsAlreadySentToday(inputs: CreateNotificationInput[]): Promise<CreateNotificationInput[]> {
    if (USE_MEMORY_DB || inputs.length === 0) return inputs;
    const filtered: CreateNotificationInput[] = [];
    for (const input of inputs) {
      const rows = await query(`
        SELECT COUNT(*) AS count
        FROM notifications
        WHERE user_id = $1
          AND title = $2
          AND created_at::date = CURRENT_DATE
      `, [input.userId, input.title]);
      if (Number(rows?.[0]?.count || 0) === 0) {
        filtered.push(input);
      }
    }
    return filtered;
  }

  private static async writeAutomationLog(
    jobType: 'send_reminders',
    month: string | undefined,
    status: 'success' | 'failed' | 'skipped',
    details: Record<string, unknown>,
    durationMs: number,
  ) {
    if (USE_MEMORY_DB) return;
    try {
      await query(`
        INSERT INTO automation_logs (id, job_type, month, status, details, duration_ms, executed_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [randomUUID(), jobType, month || null, status, JSON.stringify(details), durationMs, new Date()]);
    } catch (error) {
      logger.warn(`[Scheduler] 写入催办自动化日志失败: ${error}`);
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
          <tr><td>在职总人数</td><td>${progress.totalEmployees}</td></tr>
          <tr><td>参与考核人数</td><td>${progress.eligibleEmployees}</td></tr>
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
            activeTotal: progress.totalEmployees,
            eligibleEmployees: progress.eligibleEmployees,
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
  static async autoPublishPreviousMonth(referenceDate: Date = new Date(), options: {
    forceDistribution?: boolean;
    forceReason?: string;
    publishedBy?: string;
  } = {}): Promise<{
    month: string;
    published: boolean;
    reason: string;
    forceDistribution?: boolean;
    readiness?: Awaited<ReturnType<typeof validatePublicationReadiness>>;
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
      .filter((e: any) => isSelfAssessmentEligibleRecord(e, rankingConfig, { validEmployeeIds: validIds }));
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
      const blockingViolations = readiness.violations.filter((violation) => violation.type !== 'forced_distribution');
      const forcedDistributionViolations = readiness.violations.filter((violation) => violation.type === 'forced_distribution');
      const forceReason = String(options.forceReason || '').trim();

      if (
        blockingViolations.length > 0
        || forcedDistributionViolations.length === 0
        || options.forceDistribution !== true
      ) {
        return {
          month: targetMonth,
          published: false,
          reason: formatPublicationReadinessMessage(readiness),
          readiness
        };
      }

      if (forceReason.length < 10) {
        return {
          month: targetMonth,
          published: false,
          reason: '启用 2-7-1 豁免发布时，请填写不少于10个字的豁免原因',
          readiness
        };
      }
    }

    // 自动发布
    const adminUser = allEmployees.find((e: any) => e.role === 'admin');
    const publishedBy = options.publishedBy || adminUser?.id || 'system';
    const forceReason = String(options.forceReason || '').trim();

    await AssessmentPublicationModel.publish(targetMonth, publishedBy, readiness.ok ? {} : {
      forceDistribution: true,
      forceReason,
      readinessSnapshot: readiness,
    });
    logger.info(`[Scheduler] ${targetMonth} 绩效结果已自动发布${!readiness.ok ? `（2-7-1豁免：${forceReason}）` : ''}`);

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

    return {
      month: targetMonth,
      published: true,
      reason: readiness.ok
        ? `自动发布完成 (${completedRecords.length} 条记录)`
        : `自动发布完成（已记录2-7-1豁免原因，${completedRecords.length} 条记录）`,
      forceDistribution: !readiness.ok,
      readiness: readiness.ok ? undefined : readiness,
    };
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
      .filter((e: any) => isSelfAssessmentEligibleRecord(e, rankingConfig, { validEmployeeIds: validIds }));
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
