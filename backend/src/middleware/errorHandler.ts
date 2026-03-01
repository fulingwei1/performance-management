import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

// 全局错误处理中间件
export const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.error({ err }, 'Unhandled error');
  
  // 默认错误响应
  const statusCode = err.statusCode || 500;
  const message = err.message || '服务器内部错误';
  
  // PostgreSQL错误处理
  if (err.code === '23505') {
    res.status(409).json({
      success: false,
      message: '数据已存在'
    });
    return;
  }
  
  if (err.code === '23503') {
    res.status(400).json({
      success: false,
      message: '引用的数据不存在'
    });
    return;
  }
  
  if (err.code === '23502') {
    res.status(400).json({
      success: false,
      message: '必填字段不能为空'
    });
    return;
  }
  
  res.status(statusCode).json({
    success: false,
    message,
    code: err.code
  });
};

// 404处理
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
};

// 异步错误包装器
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
