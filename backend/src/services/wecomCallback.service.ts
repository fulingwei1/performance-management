import crypto from 'crypto';
import { EmployeeModel } from '../models/employee.model';
import { PerformanceModel } from '../models/performance.model';
import { TodoModel } from '../models/todo.model';
import { NotificationModel } from '../models/notification.model';
import { sanitizeUserText } from '../utils/sanitizeText';
import { sendAppMessage } from './wecomWebhook.service';
import logger from '../config/logger';

const CALLBACK_TOKEN = () => process.env.WECOM_CALLBACK_TOKEN || '';
const ENCODING_AES_KEY = () => process.env.WECOM_ENCODING_AES_KEY || '';
const CORP_ID = () => process.env.WECOM_CORP_ID || '';

export type InboundTextMessage = {
  fromUserName: string;
  content: string;
  month?: string;
};

export type ParsedWorkSummaryReply = {
  selfSummary: string;
  nextMonthPlan: string;
  improvementSuggestion?: string;
};

function currentAssessmentMonth(now = new Date()): string {
  const date = new Date(now);
  if (date.getDate() <= 7) date.setMonth(date.getMonth() - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function extractXmlTag(xml: string, tag: string): string {
  const pattern = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
  const match = String(xml || '').match(pattern);
  return match ? match[1].trim() : '';
}

function sha1Sorted(parts: string[]): string {
  return crypto.createHash('sha1').update(parts.sort().join('')).digest('hex');
}

function getAesKey(): Buffer {
  const key = ENCODING_AES_KEY();
  if (!/^[A-Za-z0-9+/]{43}$/.test(key)) {
    throw new Error('WECOM_ENCODING_AES_KEY 必须是43位');
  }
  return Buffer.from(`${key}=`, 'base64');
}

function decryptWecomPayload(encryptText: string): string {
  const decipher = crypto.createDecipheriv('aes-256-cbc', getAesKey(), getAesKey().subarray(0, 16));
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptText, 'base64')),
    decipher.final(),
  ]);

  const pad = decrypted[decrypted.length - 1];
  const content = decrypted.subarray(0, decrypted.length - pad);
  const messageLength = content.readUInt32BE(16);
  const message = content.subarray(20, 20 + messageLength).toString('utf8');
  const corpId = content.subarray(20 + messageLength).toString('utf8');
  if (CORP_ID() && corpId !== CORP_ID()) {
    throw new Error('企业微信回调 CorpID 不匹配');
  }
  return message;
}

export function verifyWecomSignature(signature: string, timestamp: string, nonce: string, encryptText: string): boolean {
  if (!CALLBACK_TOKEN()) return false;
  const expected = sha1Sorted([CALLBACK_TOKEN(), timestamp, nonce, encryptText]);
  return expected === signature;
}

export function verifyUrl(params: { msgSignature: string; timestamp: string; nonce: string; echoStr: string }): string {
  if (!verifyWecomSignature(params.msgSignature, params.timestamp, params.nonce, params.echoStr)) {
    throw new Error('企业微信回调签名校验失败');
  }
  return decryptWecomPayload(params.echoStr);
}

export function decryptInboundXml(rawXml: string, params: { msgSignature: string; timestamp: string; nonce: string }): {
  fromUserName: string;
  msgType: string;
  content: string;
  msgId?: string;
} {
  const encryptText = extractXmlTag(rawXml, 'Encrypt');
  if (!encryptText) throw new Error('企业微信回调缺少 Encrypt');
  if (!verifyWecomSignature(params.msgSignature, params.timestamp, params.nonce, encryptText)) {
    throw new Error('企业微信回调签名校验失败');
  }
  const xml = decryptWecomPayload(encryptText);
  return {
    fromUserName: extractXmlTag(xml, 'FromUserName'),
    msgType: extractXmlTag(xml, 'MsgType'),
    content: extractXmlTag(xml, 'Content'),
    msgId: extractXmlTag(xml, 'MsgId') || undefined,
  };
}

export function parseWorkSummaryReply(input: string): ParsedWorkSummaryReply | null {
  const text = sanitizeUserText(input || '').replace(/\r\n/g, '\n');
  const markerRegex = /(总结|工作总结|本月总结|本月工作总结|计划|下月计划|下月工作计划|建议|合理化建议)\s*[:：]/g;
  const markers = Array.from(text.matchAll(markerRegex)).map((match) => ({
    label: match[1],
    markerStart: match.index || 0,
    contentStart: (match.index || 0) + match[0].length,
  }));

  const sections: Record<'summary' | 'plan' | 'suggestion', string> = {
    summary: '',
    plan: '',
    suggestion: '',
  };

  markers.forEach((marker, index) => {
    const nextMarkerStart = markers[index + 1]?.markerStart ?? text.length;
    const value = sanitizeUserText(text.slice(marker.contentStart, nextMarkerStart));
    if (!value) return;
    if (/建议|合理化建议/.test(marker.label)) sections.suggestion = value;
    else if (/计划|下月计划|下月工作计划/.test(marker.label)) sections.plan = value;
    else sections.summary = value;
  });

  const selfSummary = sanitizeUserText(sections.summary);
  const nextMonthPlan = sanitizeUserText(sections.plan);
  const improvementSuggestion = sanitizeUserText(sections.suggestion);
  if (!selfSummary || !nextMonthPlan) return null;
  return { selfSummary, nextMonthPlan, ...(improvementSuggestion ? { improvementSuggestion } : {}) };
}

async function findEmployeeByWecomUserId(wecomUserId: string) {
  const employees = await EmployeeModel.findAll();
  const normalized = String(wecomUserId || '').trim();
  return employees.find((employee: any) => (
    String(employee.wecomUserId || '').trim() === normalized &&
    (!employee.status || employee.status === 'active')
  )) || null;
}

async function notifyAssessor(record: any, employeeName: string, month: string) {
  if (!record.assessorId) return;
  const relatedId = TodoModel.performanceReviewRelatedId(record.id);
  if (!await TodoModel.findExisting(record.assessorId, 'performance_review', relatedId)) {
    await TodoModel.create({
      employeeId: record.assessorId,
      type: 'performance_review',
      title: `评分${employeeName}${month}月绩效`,
      description: `${employeeName}已通过企业微信提交${month}月工作总结，请完成绩效评分。`,
      link: `/manager/dashboard?month=${month}`,
      relatedId,
    });
  }
  await NotificationModel.create({
    userId: record.assessorId,
    type: 'reminder',
    title: `${employeeName}已提交${month}月工作总结`,
    content: `${employeeName}已通过企业微信提交工作总结和下月计划，请完成绩效评分。`,
    link: `/manager/dashboard?month=${month}`,
  });
}

export async function handleInboundTextMessage(message: InboundTextMessage): Promise<{ success: boolean; reply: string; employeeId?: string; month?: string }> {
  const employee = await findEmployeeByWecomUserId(message.fromUserName);
  if (!employee) {
    const reply = '未在绩效系统中匹配到你的企业微信账号，请联系HR同步人事档案。';
    await sendAppMessage(message.fromUserName, reply);
    return { success: false, reply };
  }

  const month = message.month || currentAssessmentMonth();
  const record = await PerformanceModel.findByEmployeeIdAndMonth(employee.id, month);
  if (!record) {
    const reply = `你当前没有 ${month} 绩效任务。如已离职或无需考核，可忽略；如有疑问请联系HR。`;
    await sendAppMessage(message.fromUserName, reply);
    return { success: false, reply, employeeId: employee.id, month };
  }

  if (record.status === 'scored' || record.status === 'completed') {
    const reply = `${month} 绩效已评分，不能再通过企业微信修改工作总结。`;
    await sendAppMessage(message.fromUserName, reply);
    return { success: false, reply, employeeId: employee.id, month };
  }

  const parsed = parseWorkSummaryReply(message.content);
  if (!parsed) {
    const reply = [
      '没有识别到完整的工作总结，请按下面格式回复：',
      '',
      '总结：本月完成……',
      '计划：下月计划……',
      '建议：可选，没有可不写',
    ].join('\n');
    await sendAppMessage(message.fromUserName, reply);
    return { success: false, reply, employeeId: employee.id, month };
  }

  const saved = await PerformanceModel.saveSummary({
    id: record.id,
    employeeId: record.employeeId,
    assessorId: record.assessorId,
    month: record.month,
    selfSummary: parsed.selfSummary,
    nextMonthPlan: parsed.nextMonthPlan,
    improvementSuggestion: parsed.improvementSuggestion || '',
    suggestionAnonymous: false,
    groupType: record.groupType || 'all',
    templateId: record.templateId || null,
    templateName: record.templateName || null,
    departmentType: record.departmentType || null,
  });

  await TodoModel.completeByRelatedId('work_summary', TodoModel.performanceSummaryRelatedId(month), employee.id);
  await notifyAssessor(saved, employee.name, month);

  const reply = `已收到你的 ${month} 月工作总结和下月计划，绩效任务已提交。`;
  await sendAppMessage(message.fromUserName, reply);
  return { success: true, reply, employeeId: employee.id, month };
}

export async function handleCallbackPost(rawXml: string, params: { msgSignature: string; timestamp: string; nonce: string }): Promise<void> {
  const message = decryptInboundXml(rawXml, params);
  if (message.msgType !== 'text') {
    await sendAppMessage(message.fromUserName, '目前绩效系统只支持文字回复提交工作总结。请按“总结：... 计划：...”格式发送文字。');
    return;
  }
  await handleInboundTextMessage({
    fromUserName: message.fromUserName,
    content: message.content,
  });
  logger.info(`[WecomCallback] 已处理来自 ${message.fromUserName} 的绩效文字回复`);
}
