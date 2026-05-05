import { randomUUID } from 'crypto';
import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';

type RequestWithContext = Request & {
  requestId?: string;
  user?: {
    userId?: string;
    role?: string;
  };
};

function getRequestId(req: Request): string {
  const header = req.get('x-request-id');
  if (header && header.trim().length > 0 && header.length <= 128) {
    return header.trim();
  }
  return randomUUID();
}

export function requestLogger(req: RequestWithContext, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  const requestId = getRequestId(req);
  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  res.on('finish', () => {
    const logPayload = {
      requestId,
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userId: req.user?.userId,
      role: req.user?.role,
    };

    if (res.statusCode >= 500) {
      logger.error(logPayload, 'HTTP request completed');
      return;
    }

    if (res.statusCode >= 400) {
      logger.warn(logPayload, 'HTTP request completed');
      return;
    }

    logger.info(logPayload, 'HTTP request completed');
  });

  next();
}
