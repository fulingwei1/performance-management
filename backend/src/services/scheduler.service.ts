import cron from 'node-cron';
import { query, USE_MEMORY_DB, memoryStore } from '../config/database';
import { NotificationModel, CreateNotificationInput } from '../models/notification.model';
import { TodoModel } from '../models/todo.model';
import logger from '../config/logger';

export class SchedulerService {
  private static initialized = false;

  static init() {
    if (this.initialized) return;
    this.initialized = true;

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

    logger.info('✅ 定时任务已启动');
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
      work_summary: '/monthly-report',
      manager_review: '/performance/review',
      hr_review: '/performance/review',
      appeal_review: '/appeals',
      goal_approval: '/objectives',
    };
    return map[type] || '/dashboard';
  }
}
