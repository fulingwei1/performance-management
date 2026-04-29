import { Request, Response, NextFunction } from 'express';

const DISABLED_API_PREFIXES = [
  // 已停用的功能模块
  { prefix: '/api/notifications', label: '消息中心' },
  { prefix: '/api/strategic-objectives', label: '战略目标' },
  // { prefix: '/api/okr', label: 'OKR总览' }, // 已启用
  { prefix: '/api/objectives', label: 'OKR目标' },
  { prefix: '/api/goal-progress', label: '目标进度' },
  { prefix: '/api/goal-approval', label: '目标审批' },
  { prefix: '/api/goal-dashboard', label: '目标看板' },
  { prefix: '/api/contracts', label: '合约管理' },
  { prefix: '/api/promotion-requests', label: '晋升审批' },
  { prefix: '/api/bonus', label: '奖金管理' },
  { prefix: '/api/interview-records', label: '面谈记录' },
  { prefix: '/api/interviews', label: '绩效面谈' },
  { prefix: '/api/appeals', label: '绩效申诉' },
  { prefix: '/api/peer-review-cycles', label: '360互评周期' },
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
