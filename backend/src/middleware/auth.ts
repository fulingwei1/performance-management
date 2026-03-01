import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWTPayload, EmployeeRole } from '../types';
import logger from '../config/logger';

// 扩展Express的Request类型
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// JWT Secret - 优先从环境变量获取，测试环境使用默认值
const getJWTSecret = (): string => {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret) return envSecret;
  if (process.env.NODE_ENV === 'test') return 'test-secret-key';
  
  logger.error('❌ 错误: JWT_SECRET环境变量未设置');
  logger.error('请在backend/.env文件中设置JWT_SECRET，例如:');
  logger.error('JWT_SECRET=your_random_secret_key_here');
  logger.error('\n生成随机密钥的命令:');
  logger.error('node -e "logger.info(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
  process.exit(1);
};

const SECRET = getJWTSecret();
export { SECRET };

// 生成JWT Token
export const generateToken = (payload: Omit<JWTPayload, 'iat' | 'exp'>): string => {
  return jwt.sign(payload, SECRET as jwt.Secret, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any });
};

// 验证JWT Token
export const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, SECRET as jwt.Secret) as JWTPayload;
};

// 认证中间件
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: '未提供认证令牌' });
      return;
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: '认证令牌无效或已过期' });
  }
};

// 角色权限检查中间件
export const requireRole = (...roles: EmployeeRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未认证' });
      return;
    }
    
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, message: '权限不足' });
      return;
    }
    
    next();
  };
};

// 可选认证（不强制要求登录，但如果有token会解析）
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // 解析失败也继续，只是没有用户信息
    next();
  }
};
