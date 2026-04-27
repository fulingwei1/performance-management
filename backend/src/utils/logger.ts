/**
 * 简单结构化日志工具
 * 生产环境可替换为 winston/pino
 */

type LogLevel = 'info' | 'warn' | 'error';

function formatMessage(level: LogLevel, module: string, message: string, data?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const base = `[${timestamp}] [${level.toUpperCase()}] [${module}] ${message}`;
  if (data && Object.keys(data).length > 0) {
    return `${base} ${JSON.stringify(data)}`;
  }
  return base;
}

export const createLogger = (module: string) => ({
  info: (message: string, data?: Record<string, unknown>) => {
    console.log(formatMessage('info', module, message, data));
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    console.warn(formatMessage('warn', module, message, data));
  },
  error: (message: string, data?: Record<string, unknown> | unknown) => {
    console.error(formatMessage('error', module, message, typeof data === 'object' && data !== null && !Array.isArray(data) ? data as Record<string, unknown> : undefined), data instanceof Error ? data.message : '');
  },
});
