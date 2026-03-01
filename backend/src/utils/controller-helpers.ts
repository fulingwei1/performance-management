import { Request, Response } from 'express';
import logger from '../config/logger';

/**
 * 统一的API错误响应格式
 */
export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
}

/**
 * 统一的API成功响应格式
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  message?: string;
  data?: T;
  total?: number;
}

/**
 * 发送成功响应
 */
export function sendSuccess<T>(res: Response, data?: T, message?: string, statusCode = 200): void {
  const response: ApiSuccessResponse<T> = { success: true };
  if (data !== undefined) response.data = data;
  if (message) response.message = message;
  res.status(statusCode).json(response);
}

/**
 * 发送列表响应（带total）
 */
export function sendList<T>(res: Response, data: T[]): void {
  res.json({
    success: true,
    data,
    total: data.length
  });
}

/**
 * 发送错误响应
 */
export function sendError(res: Response, message: string, statusCode = 500, error?: string): void {
  const response: ApiErrorResponse = { success: false, message };
  if (error) response.error = error;
  res.status(statusCode).json(response);
}

/**
 * 统一的controller错误处理包装器
 * 替代每个方法中重复的 try-catch + console.error 模式
 */
export function handleControllerError(res: Response, error: any, context: string): void {
  logger.error({ err: error }, `${context}失败`);
  sendError(res, `${context}失败`, 500, error.message);
}

/**
 * 安全解析query参数为整数
 */
export function parseQueryInt(value: unknown): number | undefined {
  if (typeof value === 'string' && value.length > 0) {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * 安全解析query参数为字符串
 */
export function parseQueryString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

/**
 * 从Request中获取认证用户ID（类型安全）
 */
export function getAuthUserId(req: Request): number | undefined {
  return (req as any).user?.id;
}
