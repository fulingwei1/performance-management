import { Request, Response, NextFunction } from 'express';

const DISABLED_API_PREFIXES = [
  { prefix: '/api/notifications', label: '消息中心' },
  { prefix: '/api/strategic-objectives', label: '战略目标' },
  { prefix: '/api/okr', label: 'OKR总览' },
  { prefix: '/api/contracts', label: '合约管理' },
  { prefix: '/api/promotion-requests', label: '晋升审批' },
  { prefix: '/api/bonus', label: '奖金管理' },
];

export const disabledFeatureMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const disabledFeature = DISABLED_API_PREFIXES.find(
    ({ prefix }) => req.path === prefix || req.path.startsWith(`${prefix}/`)
  );

  if (!disabledFeature) {
    next();
    return;
  }

  res.status(410).json({
    success: false,
    message: `${disabledFeature.label}模块已停用`,
  });
};
