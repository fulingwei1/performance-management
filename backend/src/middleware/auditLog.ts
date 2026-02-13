import { Request, Response, NextFunction } from 'express';
import { AuditLogModel, AuditAction } from '../models/auditLog.model';

// 不需要记录的路径
const SKIP_PATHS = [
  '/health',
  '/api/health',
  '/favicon.ico',
];

// 不需要记录的方法
const SKIP_METHODS = ['GET', 'OPTIONS', 'HEAD'];

// 路径到模块的映射
const PATH_TO_MODULE: Record<string, string> = {
  '/api/auth': 'auth',
  '/api/performance': 'performance',
  '/api/promotion': 'promotion',
  '/api/appeals': 'appeal',
  '/api/objectives': 'objective',
  '/api/employees': 'employee',
  '/api/strategic-objectives': 'strategic',
  '/api/notifications': 'notification',
  '/api/assessment-cycles': 'assessment',
  '/api/ai': 'ai',
};

// 路径到操作的映射
const METHOD_TO_ACTION: Record<string, AuditAction> = {
  'POST': 'CREATE',
  'PUT': 'UPDATE',
  'PATCH': 'UPDATE',
  'DELETE': 'DELETE',
};

/**
 * 从请求路径提取模块名
 */
function getModuleFromPath(path: string): string {
  for (const [prefix, module] of Object.entries(PATH_TO_MODULE)) {
    if (path.startsWith(prefix)) {
      return module;
    }
  }
  return 'unknown';
}

/**
 * 从请求路径提取目标类型和ID
 */
function extractTarget(path: string, method: string): { type?: string; id?: string } {
  // 示例：/api/performance/summary -> type: record
  // 示例：/api/performance/rec-123 -> type: record, id: rec-123
  // 示例：/api/promotion-requests/pr-123/manager-approve -> type: request, id: pr-123

  if (path.includes('/promotion-requests/')) {
    const match = path.match(/\/promotion-requests\/([^\/]+)/);
    return { type: 'promotion_request', id: match?.[1] };
  }

  if (path.includes('/performance/')) {
    const match = path.match(/\/performance\/([^\/]+)/);
    if (match && match[1] !== 'summary') {
      return { type: 'performance_record', id: match[1] };
    }
    return { type: 'performance_record' };
  }

  if (path.includes('/appeals/')) {
    const match = path.match(/\/appeals\/([^\/]+)/);
    return { type: 'appeal', id: match?.[1] };
  }

  if (path.includes('/objectives/')) {
    const match = path.match(/\/objectives\/([^\/]+)/);
    return { type: 'objective', id: match?.[1] };
  }

  if (path.includes('/employees/')) {
    const match = path.match(/\/employees\/([^\/]+)/);
    return { type: 'employee', id: match?.[1] };
  }

  return {};
}

/**
 * 生成操作描述
 */
function generateDescription(action: AuditAction, module: string, path: string, user?: any): string {
  const userName = user?.name || '未知用户';

  if (path.includes('/login')) {
    return `${userName} 登录系统`;
  }

  if (path.includes('/logout')) {
    return `${userName} 登出系统`;
  }

  if (action === 'CREATE') {
    if (module === 'performance') return `${userName} 提交了工作总结`;
    if (module === 'promotion') return `${userName} 创建了晋升申请`;
    if (module === 'appeal') return `${userName} 创建了申诉`;
    if (module === 'objective') return `${userName} 创建了目标`;
    return `${userName} 创建了${module}记录`;
  }

  if (action === 'UPDATE') {
    if (path.includes('/manager-approve')) return `${userName} 审批了晋升申请（经理）`;
    if (path.includes('/gm-approve')) return `${userName} 审批了晋升申请（总经理）`;
    if (path.includes('/hr-approve')) return `${userName} 审批了晋升申请（HR）`;
    if (module === 'performance') return `${userName} 修改了工作总结`;
    if (module === 'objective') return `${userName} 修改了目标`;
    return `${userName} 修改了${module}记录`;
  }

  if (action === 'DELETE') {
    if (module === 'performance') return `${userName} 删除了工作总结`;
    if (module === 'promotion') return `${userName} 删除了晋升申请`;
    if (module === 'objective') return `${userName} 删除了目标`;
    return `${userName} 删除了${module}记录`;
  }

  return `${userName} 执行了${action}操作`;
}

/**
 * 审计日志中间件
 */
export const auditLogMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // 跳过不需要记录的路径
  if (SKIP_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  // 跳过不需要记录的方法（GET等查询操作）
  if (SKIP_METHODS.includes(req.method)) {
    return next();
  }

  // 提取操作信息
  const module = getModuleFromPath(req.path);
  const action = METHOD_TO_ACTION[req.method] || 'UPDATE';
  const { type: targetType, id: targetId } = extractTarget(req.path, req.method);
  const user = req.user;

  // 获取请求信息
  const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.get('user-agent') || 'unknown';

  // 保存原始的 res.json 方法
  const originalJson = res.json.bind(res);

  // 重写 res.json 方法以捕获响应
  res.json = function (body: any): Response {
    // 异步写入审计日志（不阻塞响应）
    setImmediate(async () => {
      try {
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;

        // 获取用户信息
        let userId = user?.userId;
        let userName = undefined;
        let userRole = user?.role;
        
        // 特殊处理：登录操作
        if (req.path.includes('/login') && isSuccess && body?.data?.user) {
          userId = body.data.user.id;
          userName = body.data.user.name;
          userRole = body.data.user.role;
        } else if (user?.userId) {
          // 从请求的 user 对象获取用户信息（如果有的话）
          // 注意：JWTPayload 中只有 userId 和 role，没有 name
          // 我们可以从数据库查询，但为了性能，暂时只记录 userId
          userId = user.userId;
          userRole = user.role;
        }

        const description = generateDescription(action, module, req.path, { id: userId, name: userName, role: userRole });

        await AuditLogModel.create({
          user_id: userId,
          user_name: userName,
          user_role: userRole,
          action: req.path.includes('/login') ? 'LOGIN' : 
                  req.path.includes('/logout') ? 'LOGOUT' : action,
          module,
          target_type: targetType,
          target_id: targetId,
          description,
          changes: req.method !== 'DELETE' ? { body: req.body } : undefined,
          ip_address: ipAddress,
          user_agent: userAgent,
          request_method: req.method,
          request_url: req.originalUrl,
          result: isSuccess ? 'SUCCESS' : 'FAILED',
          error_message: !isSuccess ? body?.message : undefined,
        });

        console.log(`[AuditLog] ${action} ${module} - ${description} - ${isSuccess ? 'SUCCESS' : 'FAILED'} (${Date.now() - startTime}ms)`);
      } catch (error) {
        console.error('[AuditLog Error]', error);
      }
    });

    return originalJson(body);
  };

  next();
};

/**
 * 手动记录审计日志（用于特殊场景）
 */
export const logAudit = async (
  action: AuditAction,
  module: string,
  description: string,
  options: {
    user?: any;
    targetType?: string;
    targetId?: string;
    changes?: any;
    req?: Request;
    result?: 'SUCCESS' | 'FAILED' | 'UNAUTHORIZED';
    errorMessage?: string;
  } = {}
) => {
  try {
    await AuditLogModel.create({
      user_id: options.user?.id,
      user_name: options.user?.name,
      user_role: options.user?.role,
      action,
      module,
      target_type: options.targetType,
      target_id: options.targetId,
      description,
      changes: options.changes,
      ip_address: options.req?.ip || options.req?.socket.remoteAddress,
      user_agent: options.req?.get('user-agent'),
      request_method: options.req?.method,
      request_url: options.req?.originalUrl,
      result: options.result || 'SUCCESS',
      error_message: options.errorMessage,
    });
  } catch (error) {
    console.error('[AuditLog Error]', error);
  }
};
