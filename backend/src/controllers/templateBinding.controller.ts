import { Request, Response } from 'express';
import { EmployeeTemplateBindingModel } from '../models/employeeTemplateBinding.model';
import { EmployeeModel } from '../models/employee.model';
import { asyncHandler } from '../middleware/errorHandler';

const getRouteParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
};

const getQueryParam = (value: unknown): string | undefined => {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : undefined;
  return typeof value === 'string' && value ? value : undefined;
};

/**
 * 为单个员工绑定模板
 * POST /api/template-bindings
 * Body: { employeeId, templateId }
 */
export const bindTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { employeeId, templateId } = req.body;
  if (!employeeId || !templateId) {
    return res.status(400).json({ success: false, message: '缺少 employeeId 或 templateId' });
  }

  // 权限检查：经理只能绑定自己的下属，HR/admin 无限制
  if (req.user?.role === 'manager') {
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee || employee.managerId !== req.user.userId) {
      return res.status(403).json({ success: false, message: '只能为自己的下属设置模板' });
    }
  }

  const result = await EmployeeTemplateBindingModel.upsert(employeeId, templateId, req.user!.userId);
  res.json({ success: true, data: result, message: '模板绑定成功' });
});

/**
 * 批量绑定模板
 * POST /api/template-bindings/batch
 * Body: { bindings: [{ employeeId, templateId }, ...] }
 */
export const batchBind = asyncHandler(async (req: Request, res: Response) => {
  const { bindings } = req.body;
  if (!Array.isArray(bindings) || bindings.length === 0) {
    return res.status(400).json({ success: false, message: 'bindings 不能为空' });
  }

  // 权限检查
  if (req.user?.role === 'manager') {
    for (const b of bindings) {
      const employee = await EmployeeModel.findById(b.employeeId);
      if (!employee || employee.managerId !== req.user.userId) {
        return res.status(403).json({ 
          success: false, 
          message: `无权为员工 ${b.employeeId} 设置模板` 
        });
      }
    }
  }

  const count = await EmployeeTemplateBindingModel.batchUpsert(bindings, req.user!.userId);
  res.json({ success: true, data: { count }, message: `成功绑定 ${count} 个员工` });
});

/**
 * 解除绑定
 * DELETE /api/template-bindings/:employeeId
 */
export const unbindTemplate = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = getRouteParam(req.params.employeeId);

  if (req.user?.role === 'manager') {
    const employee = await EmployeeModel.findById(employeeId);
    if (!employee || employee.managerId !== req.user.userId) {
      return res.status(403).json({ success: false, message: '只能操作自己的下属' });
    }
  }

  await EmployeeTemplateBindingModel.delete(employeeId);
  res.json({ success: true, message: '模板绑定已解除' });
});

/**
 * 查询员工已绑定的模板
 * GET /api/template-bindings/employee/:employeeId
 */
export const getEmployeeBinding = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = getRouteParam(req.params.employeeId);
  const binding = await EmployeeTemplateBindingModel.findByEmployee(employeeId);
  res.json({ success: true, data: binding });
});

/**
 * 查询经理下属的所有绑定
 * GET /api/template-bindings/my-team
 */
export const getMyTeamBindings = asyncHandler(async (req: Request, res: Response) => {
  const managerId = req.user?.userId;
  if (!managerId) {
    return res.status(401).json({ success: false, message: '未认证' });
  }
  const bindings = await EmployeeTemplateBindingModel.findByManager(managerId);
  res.json({ success: true, data: bindings });
});

/**
 * 查询所有绑定（HR/管理员）
 * GET /api/template-bindings/all?department=xxx&templateId=xxx
 */
export const getAllBindings = asyncHandler(async (req: Request, res: Response) => {
  const { department, templateId } = req.query;
  const bindings = await EmployeeTemplateBindingModel.findAll({
    department: getQueryParam(department),
    templateId: getQueryParam(templateId)
  });
  res.json({ success: true, data: bindings });
});

/**
 * 解析员工的考核模板（优先绑定 → 自动匹配 → 兜底）
 * GET /api/template-bindings/resolve/:employeeId
 */
export const resolveTemplate = asyncHandler(async (req: Request, res: Response) => {
  const employeeId = getRouteParam(req.params.employeeId);
  const employee = await EmployeeModel.findById(employeeId);
  if (!employee) {
    return res.status(404).json({ success: false, message: '员工不存在' });
  }

  const result = await EmployeeTemplateBindingModel.resolveTemplate(employeeId, {
    role: employee.role,
    level: employee.level,
    department: employee.department
  });

  if (!result) {
    return res.status(404).json({ 
      success: false, 
      message: '未找到匹配的考核模板，请先配置模板' 
    });
  }

  res.json({ success: true, data: result });
});

/**
 * 绑定统计
 * GET /api/template-bindings/stats
 */
export const getBindingStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await EmployeeTemplateBindingModel.getBindingStats();
  res.json({ success: true, data: stats });
});
