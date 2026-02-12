import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * 验证中间件工厂
 * 用于包装express-validator的验证规则
 */
export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // 执行所有验证规则
    for (const validation of validations) {
      const result = await validation.run(req);
      if (!result.isEmpty()) break;
    }

    // 检查验证结果
    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    // 返回第一个错误信息
    const firstError = errors.array()[0];
    return res.status(400).json({
      success: false,
      message: firstError.msg,
      field: firstError.type === 'field' ? (firstError as any).path : undefined
    });
  };
};
