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
import logger from '../config/logger';

export const automationController = {
  /**
   * 手动触发月初任务生成（也可由 cron 自动触发）
   */
  generateMonthlyTasks: asyncHandler(async (req: Request, res: Response) => {
    const month = req.query.month as string | undefined;
    const refDate = month ? new Date(month) : new Date();
    const result = await SchedulerService.generatePreviousMonthPerformanceTasks(refDate);

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
    const month = req.query.month as string | undefined;
    const refDate = month ? new Date(month) : new Date();
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
    const month = req.query.month as string | undefined;
    const refDate = month ? new Date(month) : new Date();
    const result = await SchedulerService.autoPublishPreviousMonth(refDate);

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
    const result = await ArchiveService.archiveMonth(month, userId);

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
    const force = req.query?.force === 'true';
    await SchedulerService.dailyReminderWorkflow(force);
    await SchedulerService.checkOverdueTodos();

    res.json({
      success: true,
      message: '催办检查完成'
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
    const { query } = await import('../config/database');
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT * FROM automation_logs 
      ORDER BY executed_at DESC 
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
