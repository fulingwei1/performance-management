import { Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { SchedulerService } from '../services/scheduler.service';
import { ProgressMonitorService } from '../services/progressMonitor.service';
import { AssessmentPublicationModel } from '../models/assessmentPublication.model';
import { formatPublicationReadinessMessage, validatePublicationReadiness } from '../services/publicationReadiness.service';
import { DemoDataService } from '../services/demoData.service';
import { query } from '../config/database';
import logger from '../config/logger';
import { randomUUID } from 'crypto';

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
type AutomationJobType = 'generate_tasks' | 'send_reminders' | 'publish_results' | 'generate_demo_data' | 'clear_demo_data';
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
   * 手动触发自动发布
   */
  autoPublish: asyncHandler(async (req: Request, res: Response) => {
    const month = requestedMonth(req);
    const refDate = referenceDateForTargetMonth(month);
    const forceDistribution = req.body?.forceDistribution === true;
    const forceReason = typeof req.body?.forceReason === 'string' ? req.body.forceReason.trim() : '';
    const startedAt = Date.now();
    const result = await SchedulerService.autoPublishPreviousMonth(refDate, {
      forceDistribution,
      forceReason,
      publishedBy: req.user?.userId,
    });
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
   * 手动发布指定月份
   */
  publishMonth: asyncHandler(async (req: Request, res: Response) => {
    const month = req.body.month as string | undefined;
    const forceDistribution = req.body.forceDistribution === true;
    const forceReason = typeof req.body.forceReason === 'string' ? req.body.forceReason.trim() : '';
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
      const blockingViolations = readiness.violations.filter((violation) => violation.type !== 'forced_distribution');
      const forcedDistributionViolations = readiness.violations.filter((violation) => violation.type === 'forced_distribution');

      if (blockingViolations.length > 0 || forcedDistributionViolations.length === 0 || !forceDistribution) {
        return res.status(400).json({
          success: false,
          message: formatPublicationReadinessMessage(readiness),
          data: readiness
        });
      }

      if (forceReason.length < 10) {
        return res.status(400).json({
          success: false,
          message: '启用 2-7-1 豁免发布时，请填写不少于10个字的豁免原因',
          data: readiness
        });
      }
    }

    const publishedBy = (req as any).user?.userId || 'system';
    await AssessmentPublicationModel.publish(month, publishedBy, readiness.ok ? {} : {
      forceDistribution: true,
      forceReason,
      readinessSnapshot: readiness,
    });
    logger.info(`[Automation] ${month} 手动发布完成${!readiness.ok ? `（2-7-1豁免：${forceReason}）` : ''}`);

    res.json({
      success: true,
      message: readiness.ok ? `${month} 发布成功` : `${month} 发布成功（已记录2-7-1豁免原因）`,
      data: readiness.ok ? undefined : { forceDistribution: true, forceReason, readiness }
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

  getDemoDataStatus: asyncHandler(async (_req: Request, res: Response) => {
    const result = await DemoDataService.getDemoDataStatus();
    res.json({
      success: true,
      data: result
    });
  }),

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

  clearDemoData: asyncHandler(async (_req: Request, res: Response) => {
    const startedAt = Date.now();
    const result = await DemoDataService.clearDemoData();
    await writeAutomationLog('clear_demo_data', undefined, 'success', result as any, Date.now() - startedAt);

    res.json({
      success: true,
      message: `已清除 ${result.totalDeleted} 条演示数据`,
      data: result
    });
  })

};
