// ============================================================
// 金凯博自动化 — 企业微信应用消息推送服务
// ============================================================
//
// 使用方式：
// .env 配置：
//   WECOM_CORP_ID=wwb25f83f3ef594928
//   WECOM_SECRET=HY5sNjjA1vSN4wLRimuvZFEF2jWbzv0rOSQvFKzQU2s
//   WECOM_AGENT_ID=1000030
//
// API: 获取 access_token → 发送应用消息
// ============================================================

import logger from '../config/logger';

// ---- 配置 ----
const CORP_ID = () => process.env.WECOM_CORP_ID || '';
const SECRET = () => process.env.WECOM_SECRET || '';
const AGENT_ID = () => parseInt(process.env.WECOM_AGENT_ID || '0', 10);
const ENABLED = () => !!(CORP_ID() && SECRET() && AGENT_ID());
const TEST_USER = () => process.env.WECOM_TEST_USER || '';  // 测试模式：所有消息只发给此用户

// ---- access_token 缓存 ----
let cachedToken = '';
let tokenExpiresAt = 0; // ms timestamp

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${CORP_ID()}&corpsecret=${SECRET()}`;
  const resp = await fetch(url);
  const data = await resp.json() as any;

  if (data.errcode !== 0) {
    throw new Error(`获取企业微信 access_token 失败: errcode=${data.errcode}, errmsg=${data.errmsg}`);
  }

  cachedToken = data.access_token;
  // 提前 5 分钟过期，避免边界问题
  tokenExpiresAt = now + (data.expires_in - 300) * 1000;
  logger.info('[Wecom] access_token 已刷新');
  return cachedToken;
}

/** 发送应用消息（markdown 格式），touser: @all 或逗号分隔的用户ID */
export async function sendAppMessage(touser: string, content: string): Promise<boolean> {
  if (!ENABLED()) {
    logger.debug('[Wecom] 未配置企业微信，跳过推送');
    return false;
  }

  // 测试模式：所有消息只发给测试用户
  const actualTouser = TEST_USER() || touser;
  if (TEST_USER() && touser !== TEST_USER()) {
    logger.info(`[Wecom] 测试模式: 消息原定发给 ${touser}，改为发给 ${actualTouser}`);
  }

  try {
    const token = await getAccessToken();
    const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${token}`;
    const body = {
      touser: actualTouser,
      msgtype: 'markdown',
      agentid: AGENT_ID(),
      markdown: { content },
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timer);
    const data = await resp.json() as any;

    if (data.errcode === 0) {
      logger.info(`[Wecom] 应用消息发送成功 (touser=${touser})`);
      return true;
    } else {
      // token 过期则清除缓存重试一次
      if (data.errcode === 40014 || data.errcode === 42001) {
        logger.warn('[Wecom] token 过期，清除缓存重试');
        cachedToken = '';
        tokenExpiresAt = 0;
        return sendAppMessage(touser, content);
      }
      logger.error(`[Wecom] 发送失败: errcode=${data.errcode}, errmsg=${data.errmsg}`);
      return false;
    }
  } catch (err) {
    logger.error(`[Wecom] 发送异常: ${err}`);
    return false;
  }
}

// ---- 参数接口 ----
export interface ReminderParams {
  cycleName: string;
  taskType: string;
  daysLeft: number;
  deadlineDate: string;
  pendingCount: number;
  employeeNames: string[];
}

export interface OverdueParams {
  cycleName: string;
  taskType: string;
  deadlineDate: string;
  overdueCount: number;
  employeeNames: string[];
}

export interface TaskGeneratedParams {
  month: string;
  totalCount: number;
  dueDate: string;
}

export interface ResultPublishedParams {
  month: string;
  completedCount: number;
  avgScore: number;
}

export interface MonthlyStatsParams {
  month: string;
  totalEmployees: number;
  completedCount: number;
  avgScore: number;
  participationRate: string;
}

// ---- 对外服务类 ----
export class WecomWebhookService {
  /** 发送催办提醒（推送给全员） */
  static async sendReminder(params: ReminderParams): Promise<boolean> {
    const { cycleName, taskType, daysLeft, deadlineDate, pendingCount, employeeNames } = params;
    const urgency = daysLeft === 1 ? '🔴 **最后一天**' : daysLeft <= 3 ? '🟠 **即将截止**' : '🟡 温馨提醒';
    const names = employeeNames.length <= 20
      ? employeeNames.join('、')
      : employeeNames.slice(0, 20).join('、') + ` 等${employeeNames.length}人`;

    const md = [
      `## ${urgency} 绩效考核催办`,
      `> 考核周期：**${cycleName}**`,
      `> 任务类型：**${taskType}**`,
      `> 截止日期：**${deadlineDate}**`,
      `> 剩余天数：**${daysLeft} 天**`,
      `> 未完成人数：**${pendingCount} 人**`,
      '',
      `未完成人员：${names}`,
      '',
      '请及时登录 [绩效管理系统](http://8.138.230.46) 完成。',
    ].join('\n');

    return sendAppMessage('@all', md);
  }

  /** 发送逾期通知（推送给全员） */
  static async sendOverdue(params: OverdueParams): Promise<boolean> {
    const { cycleName, taskType, deadlineDate, overdueCount, employeeNames } = params;
    const names = employeeNames.length <= 20
      ? employeeNames.join('、')
      : employeeNames.slice(0, 20).join('、') + ` 等${employeeNames.length}人`;

    const md = [
      '## 🔴 绩效考核逾期通知',
      `> 考核周期：**${cycleName}**`,
      `> 任务类型：**${taskType}**`,
      `> 截止日期：**${deadlineDate}**（已过期）`,
      `> 逾期人数：**${overdueCount} 人**`,
      '',
      `逾期人员：${names}`,
      '',
      '请相关人员尽快完成，或联系上级/HR协调处理。',
    ].join('\n');

    return sendAppMessage('@all', md);
  }

  /** 发送月度任务生成通知 */
  static async sendTaskGenerated(params: TaskGeneratedParams): Promise<boolean> {
    const { month, totalCount, dueDate } = params;
    const md = [
      '## ✅ 月度绩效任务已生成',
      `> 考核月份：**${month}**`,
      `> 生成任务数：**${totalCount} 条**`,
      `> 截止日期：**${dueDate}**`,
      '',
      '请各位员工及时登录系统完成工作总结填写。',
    ].join('\n');

    return sendAppMessage('@all', md);
  }

  /** 发送结果发布通知 */
  static async sendResultPublished(params: ResultPublishedParams): Promise<boolean> {
    const { month, completedCount, avgScore } = params;
    const md = [
      '## 📊 绩效考核结果已发布',
      `> 考核月份：**${month}**`,
      `> 完成人数：**${completedCount} 人**`,
      `> 平均得分：**${avgScore.toFixed(1)}**`,
      '',
      '请各位员工登录系统查看个人绩效结果。',
    ].join('\n');

    return sendAppMessage('@all', md);
  }

  /** 发送月度统计摘要 */
  static async sendMonthlyStats(params: MonthlyStatsParams): Promise<boolean> {
    const { month, totalEmployees, completedCount, avgScore, participationRate } = params;
    const md = [
      `## 📈 ${month} 月度绩效统计`,
      `> 总人数：**${totalEmployees}**`,
      `> 已完成：**${completedCount}**`,
      `> 参与率：**${participationRate}**`,
      `> 平均分：**${avgScore.toFixed(1)}**`,
      '',
      '详细报告请登录绩效管理系统查看。',
    ].join('\n');

    return sendAppMessage('@all', md);
  }

  /** 测试连接（发送测试消息） */
  static async testConnection(): Promise<boolean> {
    return sendAppMessage('@all', '【测试消息】绩效管理系统企业微信应用消息推送连接成功 ✅');
  }
}
