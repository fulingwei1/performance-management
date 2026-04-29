import * as nodemailer from 'nodemailer';
import type { Transporter, SendMailOptions } from 'nodemailer';
import logger from '../config/logger';

// ============================================================
// 金凯博自动化（JinKaibo Automation）— 邮件服务
// ============================================================

const COMPANY_NAME = '金凯博自动化';
const COMPANY_NAME_FULL = '深圳市金凯博自动化设备有限公司';
const BRAND_COLOR = '#1a73e8';
const BRAND_ACCENT = '#f5a623';

/** 从环境变量构建 SMTP transporter（延迟初始化） */
function getTransporter(): Transporter | null {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '465', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    logger.warn('[EmailService] SMTP 未配置，跳过邮件发送 (SMTP_HOST/SMTP_USER/SMTP_PASS)');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

/** 统一邮件布局（HTML） */
function wrapHtml(body: string): string {
  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif; background: #f4f6f8; color: #333; }
    .wrapper { max-width: 640px; margin: 24px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,.08); }
    .header { background: linear-gradient(135deg, ${BRAND_COLOR}, #0d47a1); color: #fff; padding: 28px 32px; }
    .header h1 { margin: 0 0 4px; font-size: 20px; font-weight: 600; }
    .header p { margin: 0; font-size: 13px; opacity: .85; }
    .body { padding: 28px 32px; }
    .footer { background: #f9fafb; padding: 16px 32px; font-size: 12px; color: #888; border-top: 1px solid #eee; }
    .btn { display: inline-block; padding: 10px 24px; background: ${BRAND_COLOR}; color: #fff !important; text-decoration: none; border-radius: 4px; font-size: 14px; margin-top: 12px; }
    .btn:hover { background: #1558b0; }
    .info-table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    .info-table td { padding: 8px 0; border-bottom: 1px solid #f0f0f0; font-size: 14px; }
    .info-table td:first-child { color: #666; width: 110px; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge-info { background: #e3f2fd; color: ${BRAND_COLOR}; }
    .badge-warn { background: #fff3e0; color: #e65100; }
    .badge-error { background: #fce4ec; color: #c62828; }
    .badge-success { background: #e8f5e9; color: #2e7d32; }
    .divider { border: none; border-top: 1px solid #eee; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>📋 ${COMPANY_NAME} · 绩效管理系统</h1>
      <p>${COMPANY_NAME_FULL}</p>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>此邮件由${COMPANY_NAME}绩效管理系统自动发送，请勿直接回复。</p>
      <p>如有疑问，请联系 HR 部门或系统管理员。</p>
    </div>
  </div>
</body>
</html>`;
}

/** 纯文本版本的页脚 */
const TEXT_FOOTER = `\n\n--\n${COMPANY_NAME} · 绩效管理系统\n${COMPANY_NAME_FULL}\n此邮件由系统自动发送，请勿直接回复。`;

// ============================================================
// 模板函数
// ============================================================

function monthlyTaskGeneratedHtml(
  employeeName: string, month: string, summaryLink: string, dueDate: string
): string {
  return `
    <p>你好，<strong>${employeeName}</strong>：</p>
    <p>系统已为你生成 <span class="badge badge-info">${month}</span> 的绩效考核任务，请尽快填写上月工作总结和本月计划。</p>
    <table class="info-table">
      <tr><td>考核月份</td><td>${month}</td></tr>
      <tr><td>截止日期</td><td>${dueDate}</td></tr>
    </table>
    <p><a class="btn" href="${summaryLink}" target="_blank">前往填写工作总结 →</a></p>
    <p style="color:#888;font-size:13px;">请及时完成，以免影响绩效考核进度。</p>
  `;
}

function monthlyTaskGeneratedText(
  employeeName: string, month: string, summaryLink: string, dueDate: string
): string {
  return `你好，${employeeName}：\n\n系统已为你生成 ${month} 的绩效考核任务，请尽快填写上月工作总结和本月计划。\n\n考核月份：${month}\n截止日期：${dueDate}\n\n前往填写：${summaryLink}\n\n请及时完成，以免影响绩效考核进度。`;
}

function deadlineReminderHtml(
  employeeName: string, cycleName: string, taskType: string, deadline: string, link: string
): string {
  const typeLabel: Record<string, string> = {
    work_summary: '工作总结',
    manager_review: '经理评审',
    hr_review: 'HR评审',
    appeal_review: '申诉处理',
    goal_approval: '目标审批',
  };
  const label = typeLabel[taskType] || taskType;

  return `
    <p>你好，<strong>${employeeName}</strong>：</p>
    <p>提醒你，考核周期 <span class="badge badge-warn">${cycleName}</span> 中的 <strong>${label}</strong> 即将截止。</p>
    <table class="info-table">
      <tr><td>考核周期</td><td>${cycleName}</td></tr>
      <tr><td>任务类型</td><td>${label}</td></tr>
      <tr><td>截止时间</td><td>${deadline}</td></tr>
    </table>
    <p><a class="btn" href="${link}" target="_blank">立即处理 →</a></p>
  `;
}

function deadlineReminderText(
  employeeName: string, cycleName: string, taskType: string, deadline: string, link: string
): string {
  const typeLabel: Record<string, string> = {
    work_summary: '工作总结',
    manager_review: '经理评审',
    hr_review: 'HR评审',
    appeal_review: '申诉处理',
    goal_approval: '目标审批',
  };
  const label = typeLabel[taskType] || taskType;

  return `你好，${employeeName}：\n\n提醒你，考核周期「${cycleName}」中的「${label}」即将截止。\n\n考核周期：${cycleName}\n任务类型：${label}\n截止时间：${deadline}\n\n处理链接：${link}`;
}

function overdueNoticeHtml(
  employeeName: string, taskType: string, deadline: string
): string {
  const typeLabel: Record<string, string> = {
    work_summary: '工作总结',
    manager_review: '经理评审',
    hr_review: 'HR评审',
    appeal_review: '申诉处理',
    goal_approval: '目标审批',
  };
  const label = typeLabel[taskType] || taskType;

  return `
    <p>你好，<strong>${employeeName}</strong>：</p>
    <p>你的 <span class="badge badge-error">${label}</span> 已超过截止日期，请尽快完成或联系上级/HR。</p>
    <table class="info-table">
      <tr><td>任务类型</td><td>${label}</td></tr>
      <tr><td>截止日期</td><td>${deadline}</td></tr>
      <tr><td>状态</td><td><span class="badge badge-error">已逾期</span></td></tr>
    </table>
    <p style="color:#c62828;font-weight:500;">逾期可能影响你的绩效考核结果，请尽快处理。</p>
  `;
}

function overdueNoticeText(
  employeeName: string, taskType: string, deadline: string
): string {
  const typeLabel: Record<string, string> = {
    work_summary: '工作总结',
    manager_review: '经理评审',
    hr_review: 'HR评审',
    appeal_review: '申诉处理',
    goal_approval: '目标审批',
  };
  const label = typeLabel[taskType] || taskType;

  return `你好，${employeeName}：\n\n你的「${label}」已超过截止日期，请尽快完成或联系上级/HR。\n\n任务类型：${label}\n截止日期：${deadline}\n状态：已逾期\n\n逾期可能影响你的绩效考核结果，请尽快处理。`;
}

function resultPublishedHtml(
  employeeName: string, month: string, score: number | string, level: string, link: string
): string {
  const levelColor: Record<string, string> = {
    L1: 'badge-success',
    L2: 'badge-info',
    L3: 'badge-info',
    L4: 'badge-warn',
    L5: 'badge-error',
  };
  const badgeClass = levelColor[level] || 'badge-info';

  return `
    <p>你好，<strong>${employeeName}</strong>：</p>
    <p>你的 <span class="badge badge-info">${month}</span> 绩效考核结果已发布，请及时查看。</p>
    <table class="info-table">
      <tr><td>考核月份</td><td>${month}</td></tr>
      <tr><td>综合得分</td><td><strong>${score}</strong></td></tr>
      <tr><td>绩效等级</td><td><span class="badge ${badgeClass}">${level}</span></td></tr>
    </table>
    <p><a class="btn" href="${link}" target="_blank">查看详情 →</a></p>
    <p style="color:#888;font-size:13px;">如对结果有异议，可在规定时间内发起申诉。</p>
  `;
}

function resultPublishedText(
  employeeName: string, month: string, score: number | string, level: string, link: string
): string {
  return `你好，${employeeName}：\n\n你的 ${month} 绩效考核结果已发布，请及时查看。\n\n考核月份：${month}\n综合得分：${score}\n绩效等级：${level}\n\n查看详情：${link}\n\n如对结果有异议，可在规定时间内发起申诉。`;
}

function monthlyReportHtml(
  month: string, summaryStats: Record<string, any>, chartUrl?: string
): string {
  const rows: string[] = [];
  for (const [key, value] of Object.entries(summaryStats)) {
    const label = {
      totalEmployees: '总人数',
      submittedCount: '已提交',
      scoredCount: '已评分',
      completedCount: '已完成',
      participationRate: '参与率',
      avgScore: '平均分',
      l1Count: 'L1 人数',
      l2Count: 'L2 人数',
      l3Count: 'L3 人数',
      l4Count: 'L4 人数',
      l5Count: 'L5 人数',
    }[key] || key;
    rows.push(`<tr><td>${label}</td><td><strong>${value}</strong></td></tr>`);
  }

  let chartSection = '';
  if (chartUrl) {
    chartSection = `<p style="text-align:center;margin-top:16px;"><img src="${chartUrl}" alt="月度统计图表" style="max-width:100%;border-radius:4px;" /></p>`;
  }

  return `
    <h2 style="font-size:16px;margin:0 0 16px;">📊 ${month} 月度绩效统计报告</h2>
    <table class="info-table">
      ${rows.join('\n')}
    </table>
    ${chartSection}
    <hr class="divider" />
    <p style="color:#888;font-size:13px;">此报告由系统自动生成，仅供内部参考。</p>
  `;
}

function monthlyReportText(
  month: string, summaryStats: Record<string, any>, chartUrl?: string
): string {
  const lines = [`📊 ${month} 月度绩效统计报告\n`];
  for (const [key, value] of Object.entries(summaryStats)) {
    const label = {
      totalEmployees: '总人数',
      submittedCount: '已提交',
      scoredCount: '已评分',
      completedCount: '已完成',
      participationRate: '参与率',
      avgScore: '平均分',
      l1Count: 'L1 人数',
      l2Count: 'L2 人数',
      l3Count: 'L3 人数',
      l4Count: 'L4 人数',
      l5Count: 'L5 人数',
    }[key] || key;
    lines.push(`  ${label}: ${value}`);
  }
  if (chartUrl) lines.push(`\n图表: ${chartUrl}`);
  lines.push('\n此报告由系统自动生成，仅供内部参考。');
  return lines.join('\n');
}

// ============================================================
// EmailService 类
// ============================================================

export class EmailService {
  /**
   * 发送邮件（内部方法）
   */
  private static async send({
    to, subject, html, text,
  }: {
    to: string;
    subject: string;
    html: string;
    text?: string;
  }): Promise<boolean> {
    const transporter = getTransporter();
    if (!transporter) {
      logger.warn(`[EmailService] 跳过发送邮件: ${subject} → ${to} (SMTP 未配置)`);
      return false;
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@jinkaibo.com';

    const mailOptions: SendMailOptions = {
      from,
      to,
      subject: `[${COMPANY_NAME} 绩效系统] ${subject}`,
      html: wrapHtml(html),
      text: text + TEXT_FOOTER,
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      logger.info(`[EmailService] 邮件发送成功: ${subject} → ${to} (messageId: ${info.messageId})`);
      return true;
    } catch (err) {
      logger.error(`[EmailService] 邮件发送失败: ${subject} → ${to}, 错误: ${err}`);
      return false;
    }
  }

  /**
   * 群发邮件（内部方法）
   */
  private static async sendBulk({
    recipients, subject, html, text,
  }: {
    recipients: string[];
    subject: string;
    html: string;
    text?: string;
  }): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;
    for (const to of recipients) {
      const ok = await this.send({ to, subject, html, text });
      if (ok) success++;
      else failed++;
    }
    return { success, failed };
  }

  // ============================================================
  // 公开静态方法
  // ============================================================

  /**
   * 发送月度任务生成通知
   */
  static async sendMonthlyTaskGenerated(
    to: string, employeeName: string, month: string, summaryLink: string, dueDate: string
  ): Promise<boolean> {
    return this.send({
      to,
      subject: `${month} 绩效考核任务已生成`,
      html: monthlyTaskGeneratedHtml(employeeName, month, summaryLink, dueDate),
      text: monthlyTaskGeneratedText(employeeName, month, summaryLink, dueDate),
    });
  }

  /**
   * 发送截止日期提醒
   */
  static async sendDeadlineReminder(
    to: string, employeeName: string, cycleName: string, taskType: string, deadline: string, link: string
  ): Promise<boolean> {
    return this.send({
      to,
      subject: `【提醒】${cycleName} - ${taskType}即将截止`,
      html: deadlineReminderHtml(employeeName, cycleName, taskType, deadline, link),
      text: deadlineReminderText(employeeName, cycleName, taskType, deadline, link),
    });
  }

  /**
   * 发送逾期通知
   */
  static async sendOverdueNotice(
    to: string, employeeName: string, taskType: string, deadline: string
  ): Promise<boolean> {
    return this.send({
      to,
      subject: `【逾期】你的任务已超过截止日期`,
      html: overdueNoticeHtml(employeeName, taskType, deadline),
      text: overdueNoticeText(employeeName, taskType, deadline),
    });
  }

  /**
   * 发送绩效结果发布通知
   */
  static async sendResultPublished(
    to: string, employeeName: string, month: string, score: number | string, level: string, link: string
  ): Promise<boolean> {
    return this.send({
      to,
      subject: `${month} 绩效考核结果已发布`,
      html: resultPublishedHtml(employeeName, month, score, level, link),
      text: resultPublishedText(employeeName, month, score, level, link),
    });
  }

  /**
   * 发送月度统计报告（群发给 HR/管理员）
   */
  static async sendMonthlyReport(
    recipients: string[], month: string, summaryStats: Record<string, any>, chartUrl?: string
  ): Promise<{ success: number; failed: number }> {
    const html = monthlyReportHtml(month, summaryStats, chartUrl);
    const text = monthlyReportText(month, summaryStats, chartUrl);
    return this.sendBulk({
      recipients,
      subject: `${month} 月度绩效统计报告`,
      html,
      text,
    });
  }

  /**
   * 发送测试邮件（验证 SMTP 连通性）
   */
  static async sendTestEmail(to: string): Promise<boolean> {
    try {
      await this.sendBulk({
        recipients: [to],
        subject: '【测试】绩效管理系统邮件连通性测试',
        html: '<h2>✅ 邮件发送成功</h2><p>如果你收到此邮件，说明 SMTP 配置正确。</p>',
        text: '✅ 邮件发送成功。如果你收到此邮件，说明 SMTP 配置正确。',
      });
      return true;
    } catch (err) {
      logger.error(`[Email] 测试邮件发送失败: ${err}`);
      return false;
    }
  }
}
