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
const PERFORMANCE_SYSTEM_URL = () => process.env.PERFORMANCE_SYSTEM_URL || '';

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
  operationGuide?: string;
  actionPath?: string;
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
  operationGuide?: string;
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

export interface DepartmentProgressParams {
  month: string;
  dayOfMonth: number;
  daysLeft: number;
  department: string;
  totalCount: number;
  completedCount: number;
  submittedCount: number;
  draftCount: number;
}

export interface DepartmentDeadlineParams extends DepartmentProgressParams {}

function buildProgressBar(rate: number): string {
  const clamped = Math.max(0, Math.min(rate, 100));
  const filled = Math.floor(clamped / 10);
  return '█'.repeat(filled) + '░'.repeat(10 - filled);
}

function buildSystemLoginUrl(): string {
  const configured = PERFORMANCE_SYSTEM_URL().trim();
  if (configured) {
    return configured;
  }

  const frontendUrl = (process.env.FRONTEND_URL || '').trim();
  if (frontendUrl) {
    try {
      const parsed = new URL(frontendUrl);
      const normalizedPath = parsed.pathname.replace(/\/+$/, '');
      if (
        normalizedPath === '/performance-management'
        || normalizedPath === '/performance-management/login'
        || normalizedPath === '/login'
      ) {
        if (normalizedPath.endsWith('/login')) {
          return parsed.toString().replace(/\/+$/, '');
        }
        parsed.pathname = `${normalizedPath || ''}/login`;
        return parsed.toString().replace(/\/+$/, '');
      }

      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        parsed.pathname = '/login';
        return parsed.toString().replace(/\/+$/, '');
      }

      parsed.pathname = '/performance-management/login';
      return parsed.toString().replace(/\/+$/, '');
    } catch (error) {
      logger.warn(`[Wecom] FRONTEND_URL 解析失败，使用默认登录地址: ${error}`);
    }
  }

  return 'http://8.138.230.46/performance-management/login';
}

function buildSystemActionUrl(actionPath?: string): string {
  const loginUrl = buildSystemLoginUrl();
  const normalizedActionPath = String(actionPath || '').trim();
  if (!normalizedActionPath || !normalizedActionPath.startsWith('/')) {
    return loginUrl;
  }

  try {
    const login = new URL(loginUrl);
    const basePath = login.pathname
      .replace(/\/login\/?$/, '')
      .replace(/\/+$/, '');
    return new URL(`${basePath}${normalizedActionPath}`, login.origin).toString().replace(/\/+$/, '');
  } catch (error) {
    logger.warn(`[Wecom] 系统任务地址生成失败，退回登录地址: ${error}`);
    return loginUrl;
  }
}

function buildLoginInstructions(actionPath?: string): string[] {
  const loginUrl = buildSystemActionUrl(actionPath);
  return [
    `系统地址：[绩效管理系统](${loginUrl})`,
    '登录方式：姓名 + 当前密码；首次登录或未设置密码时，默认使用身份证后6位。',
  ];
}

// ---- 对外服务类 ----
export class WecomWebhookService {
  private static buildReminderMarkdown(params: ReminderParams): string {
    const { cycleName, taskType, daysLeft, deadlineDate, pendingCount, employeeNames, operationGuide, actionPath } = params;
    const urgency = daysLeft === 1 ? '🔴 **最后一天**' : daysLeft <= 3 ? '🟠 **即将截止**' : '🟡 温馨提醒';
    const names = employeeNames.length <= 20
      ? employeeNames.join('、')
      : employeeNames.slice(0, 20).join('、') + ` 等${employeeNames.length}人`;

    return [
      `## ${urgency} 绩效考核催办`,
      `> 考核周期：**${cycleName}**`,
      `> 任务类型：**${taskType}**`,
      `> 截止日期：**${deadlineDate}**`,
      `> 剩余天数：**${daysLeft} 天**`,
      `> 未完成人数：**${pendingCount} 人**`,
      '',
      `未完成人员：${names}`,
      '',
      ...buildLoginInstructions(actionPath),
      operationGuide || '请及时登录系统完成待办任务。',
    ].join('\n');
  }

  /** 发送催办提醒（必须传入精准接收人；仅兜底兼容时才使用 @all） */
  static async sendReminder(params: ReminderParams, touser: string = '@all'): Promise<boolean> {
    return sendAppMessage(touser, this.buildReminderMarkdown(params));
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
      ...buildLoginInstructions(),
      '请相关人员尽快完成，或联系上级/HR协调处理。',
    ].join('\n');

    return sendAppMessage('@all', md);
  }

  /** 发送月度任务生成通知 */
  static async sendTaskGenerated(params: TaskGeneratedParams, touser: string = '@all'): Promise<boolean> {
    const { month, totalCount, dueDate, operationGuide } = params;
    const md = [
      '## ✅ 月度绩效任务已生成',
      `> 考核月份：**${month}**`,
      `> 生成任务数：**${totalCount} 条**`,
      `> 截止日期：**${dueDate}**`,
      '',
      ...buildLoginInstructions(),
      operationGuide || '请各位员工及时登录系统完成工作总结填写。',
    ].join('\n');

    return sendAppMessage(touser, md);
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
      ...buildLoginInstructions(),
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
      ...buildLoginInstructions(),
      '详细报告请登录绩效管理系统查看。',
    ].join('\n');

    return sendAppMessage('@all', md);
  }

  /** 发送部门进度给部门负责人 */
  static async sendDepartmentProgress(params: DepartmentProgressParams, touser: string): Promise<boolean> {
    const { month, dayOfMonth, daysLeft, department, totalCount, completedCount, submittedCount, draftCount } = params;
    const rate = totalCount > 0 ? Math.round(((completedCount + submittedCount) / totalCount) * 100) : 0;
    const bar = buildProgressBar(rate);
    const md = [
      `## 📊 ${department} 绩效进度播报`,
      `> 考核月份：**${month}**`,
      `> 当前日期：**${dayOfMonth}号**（距截止还有 **${daysLeft} 天**）`,
      '',
      `进度概览：${bar} **${rate}%**`,
      `- 已完成评分：**${completedCount} 人**`,
      `- 已提交待评分：**${submittedCount} 人**`,
      `- 未提交总结：**${draftCount} 人**`,
      `- 应参与总人数：**${totalCount} 人**`,
      '',
      ...buildLoginInstructions(),
      '请尽快跟进本部门未完成人员。',
    ].join('\n');

    return sendAppMessage(touser, md);
  }

  /** 发送部门最后截止提醒给部门负责人 */
  static async sendDepartmentDeadlineAlert(params: DepartmentDeadlineParams, touser: string): Promise<boolean> {
    const { month, department, totalCount, completedCount, submittedCount, draftCount } = params;
    const pendingCount = draftCount + submittedCount;
    const md = [
      `## 🚨 ${department} 绩效今日截止`,
      `> 考核月份：**${month}**`,
      `> 已完成评分：**${completedCount} 人**`,
      `> 已提交待评分：**${submittedCount} 人**`,
      `> 未提交总结：**${draftCount} 人**`,
      `> 尚未完成：**${pendingCount} 人 / 共 ${totalCount} 人**`,
      '',
      ...buildLoginInstructions(),
      '请立即督促未完成人员，确保本部门考核按时完成。',
    ].join('\n');

    return sendAppMessage(touser, md);
  }

  /** 测试连接（发送测试消息） */
  static async testConnection(): Promise<boolean> {
    return sendAppMessage('@all', '【测试消息】绩效管理系统企业微信应用消息推送连接成功 ✅');
  }
}
