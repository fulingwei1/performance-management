import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { SchedulerService } from '../services/scheduler.service';
import { ProgressMonitorService } from '../services/progressMonitor.service';
import { ArchiveService } from '../services/archive.service';
import { AssessmentPublicationModel } from '../models/assessmentPublication.model';
import { EmployeeModel } from '../models/employee.model';
import { WecomWebhookService } from '../services/wecomWebhook.service';
import { EmailService } from '../services/email.service';
import { formatPublicationReadinessMessage, validatePublicationReadiness } from '../services/publicationReadiness.service';
import { DemoDataService } from '../services/demoData.service';
import { query } from '../config/database';
import logger from '../config/logger';
import { randomUUID } from 'crypto';

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
type AutomationJobType = 'generate_tasks' | 'send_reminders' | 'publish_results' | 'archive_data' | 'generate_demo_data' | 'clear_demo_data';
let automationLogColumnsCache: Set<string> | null = null;

const requestedMonth = (req: Request): string | undefined => {
  const raw = req.body?.month ?? req.query?.month;
  if (typeof raw !== 'string') return undefined;
  const month = raw.trim();
  return monthPattern.test(month) ? month : undefined;
};

const referenceDateForTargetMonth = (month?: string): Date => {
  if (!month) return new Date();
  const [yearText, monthText] = month.split('-');
  return new Date(Number(yearText), Number(monthText), 1);
};

const booleanParam = (value: unknown): boolean => value === true || value === 'true';

async function getAutomationLogColumns(): Promise<Set<string>> {
  if (process.env.NODE_ENV === 'test') return new Set();
  if (automationLogColumnsCache) return automationLogColumnsCache;
  try {
    const rows = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'automation_logs'
    `);
    automationLogColumnsCache = new Set(rows.map((row: any) => String(row.column_name)));
  } catch (error) {
    logger.warn(`[Automation] 读取 automation_logs 表结构失败: ${error}`);
    automationLogColumnsCache = new Set();
  }
  return automationLogColumnsCache;
}

async function hasSuccessfulLogToday(jobType: string, month?: string): Promise<boolean> {
  const columns = await getAutomationLogColumns();
  const jobColumn = columns.has('job_type') ? 'job_type' : columns.has('task_type') ? 'task_type' : '';
  const dateColumn = ['executed_at', 'completed_at', 'created_at', 'started_at'].find((column) => columns.has(column));
  if (!jobColumn || !dateColumn) return false;

  const params: any[] = [jobType];
  const monthClause = month && columns.has('month') ? `AND month = $${params.push(month)}` : '';
  const rows = await query(`
    SELECT COUNT(*) AS count
    FROM automation_logs
    WHERE ${jobColumn} = $1
      ${monthClause}
      AND status = 'success'
      AND ${dateColumn}::date = CURRENT_DATE
  `, params);
  return Number(rows?.[0]?.count || 0) > 0;
}

async function writeAutomationLog(
  jobType: AutomationJobType,
  month: string | undefined,
  status: 'success' | 'failed' | 'skipped',
  details: Record<string, unknown>,
  durationMs: number,
) {
  const columns = await getAutomationLogColumns();
  if (columns.size === 0) return;

  const fieldNames: string[] = [];
  const values: any[] = [];
  const add = (column: string, value: any) => {
    if (!columns.has(column)) return;
    fieldNames.push(column);
    values.push(value);
  };

  const now = new Date();
  add('id', randomUUID());
  add('job_type', jobType);
  add('task_type', jobType);
  add('task_name', jobType);
  add('status', status);
  add('month', month);
  add('details', JSON.stringify(details));
  add('input_params', JSON.stringify({ month }));
  add('result_summary', JSON.stringify(details));
  add('duration_ms', durationMs);
  add('executed_at', now);
  add('started_at', now);
  add('completed_at', now);
  add('created_at', now);

  if (fieldNames.length === 0) return;
  const placeholders = fieldNames.map((_, index) => `$${index + 1}`).join(', ');
  try {
    await query(`INSERT INTO automation_logs (${fieldNames.join(', ')}) VALUES (${placeholders})`, values);
  } catch (error) {
    logger.warn(`[Automation] 写入自动化日志失败: ${error}`);
  }
}

export const automationController = {
  /**
   * 手动触发月初任务生成（也可由 cron 自动触发）
   */
  generateMonthlyTasks: asyncHandler(async (req: Request, res: Response) => {
    const month = requestedMonth(req);
    const refDate = referenceDateForTargetMonth(month);
    const startedAt = Date.now();
    const result = await SchedulerService.generatePreviousMonthPerformanceTasks(refDate);
    await writeAutomationLog('generate_tasks', result.month, 'success', result, Date.now() - startedAt);

    res.json({
      success: true,
      message: `${result.month} 月度任务生成完成`,
      data: result
    });
  }),

  /**
   * 手动触发月度统计报告生成
   */
  generateMonthlyStats: asyncHandler(async (req: Request, res: Response) => {
    const month = requestedMonth(req);
    const refDate = referenceDateForTargetMonth(month);
    const result = await SchedulerService.generateMonthlyStatisticsReport(refDate);

    res.json({
      success: true,
      message: `${result.month} 统计报告生成完成`,
      data: result
    });
  }),

  /**
   * 手动触发自动发布
   */
  autoPublish: asyncHandler(async (req: Request, res: Response) => {
    const month = requestedMonth(req);
    const refDate = referenceDateForTargetMonth(month);
    const startedAt = Date.now();
    const result = await SchedulerService.autoPublishPreviousMonth(refDate);
    await writeAutomationLog(
      'publish_results',
      result.month,
      result.published ? 'success' : 'skipped',
      result,
      Date.now() - startedAt,
    );

    res.json({
      success: result.published,
      message: result.reason,
      data: result
    });
  }),

  /**
   * 获取某月进度监控
   */
  getProgress: asyncHandler(async (req: Request, res: Response) => {
    const month = req.params.month as string;
    if (!month) {
      return res.status(400).json({ success: false, error: '缺少 month 参数' });
    }
    const result = await ProgressMonitorService.getMonthProgress(month);

    res.json({
      success: true,
      data: result
    });
  }),

  /**
   * 归档指定月份
   */
  archiveMonth: asyncHandler(async (req: Request, res: Response) => {
    const month = req.body.month as string | undefined;
    if (!month) {
      return res.status(400).json({ success: false, error: '缺少 month 参数' });
    }
    const userId = (req as any).user?.userId || 'system';
    const startedAt = Date.now();
    const result = await ArchiveService.archiveMonth(month, userId);
    await writeAutomationLog('archive_data', month, 'success', result as any, Date.now() - startedAt);

    res.json({
      success: true,
      message: `${month} 归档完成`,
      data: result
    });
  }),

  /**
   * 查询归档列表
   */
  listArchives: asyncHandler(async (req: Request, res: Response) => {
    const result = await ArchiveService.listArchives();

    res.json({
      success: true,
      data: result
    });
  }),

  /**
   * 手动触发催办提醒检查
   */
  checkDeadlineReminders: asyncHandler(async (req: Request, res: Response) => {
    const month = requestedMonth(req);
    const force = booleanParam(req.query?.force) || booleanParam(req.body?.force);
    if (!force && await hasSuccessfulLogToday('send_reminders', month)) {
      return res.json({
        success: true,
        skipped: true,
        message: `${month || '本期'} 今日已发送过催办；如确需重复补发，请选择强制补发。`
      });
    }

    const startedAt = Date.now();
    const result = await SchedulerService.dailyReminderWorkflow(force || Boolean(month), month);
    await SchedulerService.checkOverdueTodos();

    res.json({
      success: true,
      message: month ? `${month} 催办检查完成` : '催办检查完成',
      data: result,
      durationMs: Date.now() - startedAt,
    });
  }),

  /**
   * 手动触发季度绩效推送
   */
  pushQuarterResults: asyncHandler(async (req: Request, res: Response) => {
    const quarter = req.query.quarter as string | undefined;
    let result;
    
    if (quarter) {
      // 当前自动化兜底仍按上季度口径执行；写入薪资系统前必须由管理员显式确认。
      result = await SchedulerService.pushPreviousQuarterResults(new Date(), {
        confirmedByAdmin: req.body?.confirmedByAdmin === true,
        confirmedBy: req.user?.userId,
      });
    } else {
      result = await SchedulerService.pushPreviousQuarterResults(new Date(), {
        confirmedByAdmin: req.body?.confirmedByAdmin === true,
        confirmedBy: req.user?.userId,
      });
    }

    res.status(result.requiresConfirmation ? 409 : 200).json({
      success: result.pushed,
      message: result.pushed ? `季度 ${result.quarter} 推送成功 (${result.count} 人)` : result.reason,
      data: result
    });
  }),

  /**
   * 获取所有有记录的月份列表
   */
  listMonths: asyncHandler(async (req: Request, res: Response) => {
    const months = await ProgressMonitorService.listMonths();

    res.json({
      success: true,
      data: months
    });
  }),

  /**
   * 手动发布指定月份
   */
  publishMonth: asyncHandler(async (req: Request, res: Response) => {
    const month = req.body.month as string | undefined;
    if (!month) {
      return res.status(400).json({ success: false, error: '缺少 month 参数' });
    }

    const alreadyPublished = await AssessmentPublicationModel.isPublished(month);
    if (alreadyPublished) {
      return res.json({
        success: false,
        message: `${month} 已发布`
      });
    }

    const readiness = await validatePublicationReadiness(month);
    if (!readiness.ok) {
      return res.status(400).json({
        success: false,
        message: formatPublicationReadinessMessage(readiness),
        data: readiness
      });
    }

    const publishedBy = (req as any).user?.userId || 'system';
    await AssessmentPublicationModel.publish(month, publishedBy);
    logger.info(`[Automation] ${month} 手动发布完成`);

    res.json({
      success: true,
      message: `${month} 发布成功`
    });
  }),

  /**
   * 获取自动化执行日志（从 automation_logs 表）
   */
  getAutomationLogs: asyncHandler(async (req: Request, res: Response) => {
    const columns = await getAutomationLogColumns();
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const jobExpr = columns.has('job_type') && columns.has('task_type')
      ? 'COALESCE(job_type, task_type)'
      : columns.has('job_type')
        ? 'job_type'
        : 'task_type';
    const dateExpr = ['executed_at', 'completed_at', 'created_at', 'started_at'].find((column) => columns.has(column)) || 'created_at';

    const result = await query(`
      SELECT *, ${jobExpr} AS task_type, ${dateExpr} AS executed_at
      FROM automation_logs
      ORDER BY ${dateExpr} DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await query('SELECT COUNT(*) FROM automation_logs');
    const total = Number((countResult as any[])[0]?.count || 0);

    res.json({
      success: true,
      data: result,
      pagination: { page, limit, total }
    });
  }),

  /**
   * 查看演示数据状态
   */
  getDemoDataStatus: asyncHandler(async (_req: Request, res: Response) => {
    const result = await DemoDataService.getDemoDataStatus();
    res.json({
      success: true,
      data: result
    });
  }),

  /**
   * 生成演示绩效数据（仅 HR/admin）
   */
  generateDemoData: asyncHandler(async (req: Request, res: Response) => {
    const startedAt = Date.now();
    const month = requestedMonth(req);
    const monthCount = Number(req.body?.monthCount || req.query?.monthCount || 3);
    const result = await DemoDataService.generatePerformanceDemoData({
      endMonth: month,
      monthCount,
    });
    await writeAutomationLog('generate_demo_data', result.months[result.months.length - 1], 'success', result as any, Date.now() - startedAt);

    res.json({
      success: true,
      message: `已生成 ${result.createdCount} 条演示绩效数据`,
      data: result
    });
  }),

  /**
   * 清除演示绩效数据（仅 HR/admin）
   */
  clearDemoData: asyncHandler(async (_req: Request, res: Response) => {
    const startedAt = Date.now();
    const result = await DemoDataService.clearDemoData();
    await writeAutomationLog('clear_demo_data', undefined, 'success', result as any, Date.now() - startedAt);

    res.json({
      success: true,
      message: `已清除 ${result.totalDeleted} 条演示数据`,
      data: result
    });
  }),

  /**
   * HR 解冻任务（保留旧接口）
   */
  unfreezeTask: asyncHandler(async (req: Request, res: Response) => {
    const { recordId } = req.params;
    const { query } = await import('../config/database');

    await query(
      `UPDATE performance_records SET frozen = false, updated_at = NOW() WHERE id = $1`,
      [recordId]
    );

    logger.info(`HR 解冻任务 ${recordId}`);

    res.json({
      success: true,
      message: '任务已解冻'
    });
  }),

  /**
   * HR 批量解冻任务（保留旧接口）
   */
  batchUnfreeze: asyncHandler(async (req: Request, res: Response) => {
    const { query } = await import('../config/database');
    const month = req.body.month as string | undefined;

    const result = await query(
      `UPDATE performance_records SET frozen = false, updated_at = NOW() WHERE month = $1 AND frozen = true`,
      [month]
    ) as any;

    const unfrozenCount = (result as any).rowCount || 0;

    res.json({
      success: true,
      message: `已解冻 ${unfrozenCount} 条任务`,
      data: { month, unfrozen: unfrozenCount }
    });
  }),

  /**
   * 测试企业微信连通性
   */
  testWecom: asyncHandler(async (_req: Request, res: Response) => {
    const ok = await WecomWebhookService.testConnection();
    res.json({
      success: ok,
      message: ok ? '企业微信应用消息推送成功' : '企业微信推送失败，请检查配置和日志',
    });
  }),

  /**
   * 测试邮件发送连通性
   */
  testEmail: asyncHandler(async (req: Request, res: Response) => {
    const currentEmployee = req.user?.userId ? await EmployeeModel.findById(req.user.userId) : null;
    const targetEmail = req.body.email || currentEmployee?.email;
    if (!targetEmail) {
      res.status(400).json({ success: false, message: '请提供 email 参数' });
      return;
    }
    const ok = await EmailService.sendTestEmail(targetEmail);
    res.json({
      success: ok,
      message: ok ? `测试邮件已发送至 ${targetEmail}` : '邮件发送失败，请检查 SMTP 配置和日志',
    });
  })
};
