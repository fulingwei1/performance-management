import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { JWTPayload, EmployeeRole } from '../types';
import logger from '../config/logger';
import { EmployeeModel } from '../models/employee.model';

type AuthenticatedUser = JWTPayload & {
  id: string;
};

// 扩展Express的Request类型
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      userId?: string;
    }
  }
}

// JWT Secret - 优先从环境变量获取，测试环境使用默认值
const getJWTSecret = (): string => {
  const envSecret = process.env.JWT_SECRET;
  if (envSecret) {
    if (process.env.NODE_ENV !== 'test' && envSecret.length < 32) {
      logger.error('❌ 错误: JWT_SECRET长度不足，生产/开发环境至少需要32个字符');
      process.exit(1);
    }
    return envSecret;
  }
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
export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: '未提供认证令牌' });
      return;
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);

    const employee = await EmployeeModel.findById(decoded.userId);
    if (!employee) {
      res.status(401).json({ success: false, message: '认证用户不存在或已被删除' });
      return;
    }
    if ((employee as any).status === 'disabled') {
      res.status(403).json({ success: false, message: '该账号已被禁用，请联系管理员' });
      return;
    }

    req.user = {
      ...decoded,
      role: employee.role,
      id: decoded.userId
    };
    req.userId = decoded.userId;

    next();
  } catch (error) {
    res.status(401).json({ success: false, message: '认证令牌无效或已过期' });
  }
};

const getAutomationServiceToken = (): string => (process.env.AUTOMATION_SERVICE_TOKEN || '').trim();

const timingSafeEqualText = (left: string, right: string): boolean => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

// 自动化服务认证：给服务器本机脚本/定时任务使用，避免再用 HR 员工账号 curl 登录。
// 只接受 X-Automation-Token；未提供该头时回退到普通 JWT 登录。
export const authenticateOrAutomationService = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const providedToken = (req.get('x-automation-token') || '').trim();

  if (providedToken) {
    const expectedToken = getAutomationServiceToken();
    if (!expectedToken) {
      res.status(401).json({ success: false, message: '自动化服务令牌未配置' });
      return;
    }
    if (!timingSafeEqualText(providedToken, expectedToken)) {
      res.status(401).json({ success: false, message: '自动化服务令牌无效' });
      return;
    }

    req.user = {
      userId: 'system-automation',
      role: 'admin',
      id: 'system-automation',
    };
    req.userId = 'system-automation';
    next();
    return;
  }

  await authenticate(req, res, next);
};

// 角色权限检查中间件
export const requireRole = (...roles: EmployeeRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: '未认证' });
      return;
    }
    
    const effectiveRoles = new Set<EmployeeRole>([req.user.role]);
    if (req.user.role === 'admin') effectiveRoles.add('hr');

    if (!roles.some((role) => effectiveRoles.has(role))) {
      res.status(403).json({ success: false, message: '权限不足' });
      return;
    }
    
    next();
  };
};

export const requireManagerCapability = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ success: false, message: '未认证' });
    return;
  }

  try {
    const activeSubordinates = await EmployeeModel.findTeamForManager(req.user.userId);
    if (activeSubordinates.length > 0) {
      next();
      return;
    }
  } catch (error) {
    logger.error(`manager capability check failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  res.status(403).json({ success: false, message: '当前账号没有经理视角或未绑定下属' });
};

// 可选认证（不强制要求登录，但如果有token会解析）
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const decoded = verifyToken(token);
      req.user = {
        ...decoded,
        id: decoded.userId
      };
      req.userId = decoded.userId;
    }
    
    next();
  } catch (error) {
    // 解析失败也继续，只是没有用户信息
    next();
  }
};
