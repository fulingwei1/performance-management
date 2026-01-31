"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.optionalAuth = exports.requireRole = exports.authenticate = exports.verifyToken = exports.generateToken = exports.SECRET = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// JWT Secret - 优先从环境变量获取，测试环境使用默认值
const getJWTSecret = () => {
    const envSecret = process.env.JWT_SECRET;
    if (envSecret)
        return envSecret;
    if (process.env.NODE_ENV === 'test')
        return 'test-secret-key';
    console.error('❌ 错误: JWT_SECRET环境变量未设置');
    console.error('请在backend/.env文件中设置JWT_SECRET，例如:');
    console.error('JWT_SECRET=your_random_secret_key_here');
    console.error('\n生成随机密钥的命令:');
    console.error('node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    process.exit(1);
};
const SECRET = getJWTSecret();
exports.SECRET = SECRET;
// 生成JWT Token
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, SECRET, { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') });
};
exports.generateToken = generateToken;
// 验证JWT Token
const verifyToken = (token) => {
    return jsonwebtoken_1.default.verify(token, SECRET);
};
exports.verifyToken = verifyToken;
// 认证中间件
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ success: false, error: '未提供认证令牌' });
            return;
        }
        const token = authHeader.substring(7);
        const decoded = (0, exports.verifyToken)(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ success: false, error: '认证令牌无效或已过期' });
    }
};
exports.authenticate = authenticate;
// 角色权限检查中间件
const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ success: false, error: '未认证' });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ success: false, error: '权限不足' });
            return;
        }
        next();
    };
};
exports.requireRole = requireRole;
// 可选认证（不强制要求登录，但如果有token会解析）
const optionalAuth = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const decoded = (0, exports.verifyToken)(token);
            req.user = decoded;
        }
        next();
    }
    catch (error) {
        // 解析失败也继续，只是没有用户信息
        next();
    }
};
exports.optionalAuth = optionalAuth;
//# sourceMappingURL=auth.js.map