import { Request, Response } from 'express';
import { AuditLogModel, AuditLogFilter } from '../models/auditLog.model';

/**
 * 查询所有审计日志（支持过滤）
 * 权限：仅 HR 和 admin
 */
export const getAllLogs = async (req: Request, res: Response) => {
  try {
    // 权限检查
    const user = req.user;
    if (!user || !['hr', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: '无权限查看审计日志',
      });
    }

    // 构建过滤条件
    const getUserQueryParam = (param: any): string | undefined => {
      if (!param) return undefined;
      return Array.isArray(param) ? param[0] : param;
    };

    const filters: AuditLogFilter = {
      user_id: getUserQueryParam(req.query.user_id),
      action: getUserQueryParam(req.query.action) as any,
      module: getUserQueryParam(req.query.module),
      target_type: getUserQueryParam(req.query.target_type),
      result: getUserQueryParam(req.query.result) as any,
      start_date: getUserQueryParam(req.query.start_date),
      end_date: getUserQueryParam(req.query.end_date),
      page: req.query.page ? parseInt(getUserQueryParam(req.query.page) || '1') : 1,
      limit: req.query.limit ? parseInt(getUserQueryParam(req.query.limit) || '50') : 50,
    };

    const { logs, total } = await AuditLogModel.findAll(filters);

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: filters.page || 1,
          limit: filters.limit || 50,
          total,
          totalPages: Math.ceil(total / (filters.limit || 50)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error getting audit logs:', error);
    return res.status(500).json({
      success: false,
      message: '获取审计日志失败',
      error: error.message,
    });
  }
};

/**
 * 查询某用户的操作历史
 */
export const getUserLogs = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    const limitParam = req.query.limit;
    const limitStr = limitParam ? (Array.isArray(limitParam) ? String(limitParam[0]) : String(limitParam)) : '100';
    const limit = parseInt(limitStr);

    // 权限检查：只能查看自己的日志，或者是 HR/admin
    const user = req.user;
    if (!user || (user.userId !== userId && !['hr', 'admin'].includes(user.role))) {
      return res.status(403).json({
        success: false,
        message: '无权限查看该用户的审计日志',
      });
    }

    const logs = await AuditLogModel.findByUser(userId, limit);

    return res.json({
      success: true,
      data: { logs },
    });
  } catch (error: any) {
    console.error('Error getting user logs:', error);
    return res.status(500).json({
      success: false,
      message: '获取用户日志失败',
      error: error.message,
    });
  }
};

/**
 * 查询某对象的操作历史
 */
export const getTargetLogs = async (req: Request, res: Response) => {
  try {
    const type = req.params.type as string;
    const id = req.params.id as string;

    // 权限检查：仅 HR 和 admin
    const user = req.user;
    if (!user || !['hr', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: '无权限查看对象操作历史',
      });
    }

    const logs = await AuditLogModel.findByTarget(type, id);

    return res.json({
      success: true,
      data: { logs },
    });
  } catch (error: any) {
    console.error('Error getting target logs:', error);
    return res.status(500).json({
      success: false,
      message: '获取对象日志失败',
      error: error.message,
    });
  }
};

/**
 * 获取统计信息
 */
export const getStats = async (req: Request, res: Response) => {
  try {
    // 权限检查：仅 HR 和 admin
    const user = req.user;
    if (!user || !['hr', 'admin'].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: '无权限查看统计信息',
      });
    }

    const stats = await AuditLogModel.getStats();

    return res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Error getting stats:', error);
    return res.status(500).json({
      success: false,
      message: '获取统计信息失败',
      error: error.message,
    });
  }
};
