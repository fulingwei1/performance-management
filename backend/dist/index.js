"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const dotenv_1 = __importDefault(require("dotenv"));
// 首先加载环境变量，必须在其他导入之前
dotenv_1.default.config();
const env_1 = require("./config/env");
(0, env_1.validateEnv)();
const database_1 = require("./config/database");
const errorHandler_1 = require("./middleware/errorHandler");
// 导入路由（auth.ts会检查JWT_SECRET）
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const employee_routes_1 = __importDefault(require("./routes/employee.routes"));
const performance_routes_1 = __importDefault(require("./routes/performance.routes"));
const organization_routes_1 = __importDefault(require("./routes/organization.routes"));
const assessmentCycle_routes_1 = __importDefault(require("./routes/assessmentCycle.routes"));
const metricLibrary_routes_1 = __importDefault(require("./routes/metricLibrary.routes"));
const peerReview_routes_1 = __importDefault(require("./routes/peerReview.routes"));
const settings_routes_1 = __importDefault(require("./routes/settings.routes"));
const export_routes_1 = __importDefault(require("./routes/export.routes"));
const promotionRequest_routes_1 = __importDefault(require("./routes/promotionRequest.routes"));
const quarterlySummary_routes_1 = __importDefault(require("./routes/quarterlySummary.routes"));
const okr_routes_1 = __importDefault(require("./routes/okr.routes"));
const strategicObjective_routes_1 = __importDefault(require("./routes/strategicObjective.routes"));
const objective_routes_1 = __importDefault(require("./routes/objective.routes"));
const kpiAssignment_routes_1 = __importDefault(require("./routes/kpiAssignment.routes"));
const performanceContract_routes_1 = __importDefault(require("./routes/performanceContract.routes"));
const monthlyReport_routes_1 = __importDefault(require("./routes/monthlyReport.routes"));
const performanceInterview_routes_1 = __importDefault(require("./routes/performanceInterview.routes"));
const attachment_routes_1 = __importDefault(require("./routes/attachment.routes"));
const bonus_routes_1 = __importDefault(require("./routes/bonus.routes"));
const department_routes_1 = __importDefault(require("./routes/department.routes"));
const peerReviewCycle_routes_1 = __importDefault(require("./routes/peerReviewCycle.routes"));
const goalProgress_routes_1 = __importDefault(require("./routes/goalProgress.routes"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
exports.default = app;
// 安全中间件
app.use((0, helmet_1.default)());
// 全局限流：100次/分钟（测试环境禁用）
if (process.env.NODE_ENV !== 'test') {
    const globalLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 100,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: '请求过于频繁，请稍后再试' }
    });
    app.use(globalLimiter);
    // 登录接口限流：5次/分钟
    const loginLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 1000,
        max: 5,
        standardHeaders: true,
        legacyHeaders: false,
        message: { success: false, message: '登录尝试过于频繁，请1分钟后再试' }
    });
    app.use('/api/auth/login', loginLimiter);
}
// CORS - 精确匹配项目域名
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            'https://performance-management-api-three.vercel.app',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// 请求日志
app.use((req, res, next) => {
    logger_1.default.info(`[Request] ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// 健康检查 - Support both /health and /api/health
const healthHandler = (req, res) => {
    logger_1.default.info('Health check called');
    res.json({
        success: true,
        message: '服务器运行正常',
        timestamp: new Date().toISOString(),
        url: req.url,
        env: process.env.NODE_ENV
    });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);
// API路由
app.use('/api/auth', auth_routes_1.default);
app.use('/api/employees', employee_routes_1.default);
app.use('/api/performance', performance_routes_1.default);
app.use('/api/organization', organization_routes_1.default);
app.use('/api/cycles', assessmentCycle_routes_1.default);
app.use('/api/metrics', metricLibrary_routes_1.default);
app.use('/api/peer-reviews', peerReview_routes_1.default);
app.use('/api/settings', settings_routes_1.default);
app.use('/api/export', export_routes_1.default);
app.use('/api/promotion-requests', promotionRequest_routes_1.default);
app.use('/api/quarterly-summaries', quarterlySummary_routes_1.default);
app.use('/api/okr', okr_routes_1.default);
app.use('/api/strategic-objectives', strategicObjective_routes_1.default);
app.use('/api/objectives', objective_routes_1.default);
app.use('/api/kpi-assignments', kpiAssignment_routes_1.default);
app.use('/api/contracts', performanceContract_routes_1.default);
app.use('/api/monthly-reports', monthlyReport_routes_1.default);
app.use('/api/interviews', performanceInterview_routes_1.default);
app.use('/api/attachments', attachment_routes_1.default);
app.use('/api/bonus', bonus_routes_1.default);
app.use('/api/departments', department_routes_1.default);
app.use('/api/peer-review-cycles', peerReviewCycle_routes_1.default);
app.use('/api/goal-progress', goalProgress_routes_1.default);
// 404处理
app.use(errorHandler_1.notFoundHandler);
// 导入数据初始化
const init_data_1 = require("./config/init-data");
const logger_1 = __importDefault(require("./config/logger"));
// 错误处理
app.use(errorHandler_1.errorHandler);
// 初始化数据（所有环境都需要）
const initializeServer = async () => {
    try {
        await (0, database_1.testConnection)();
        await (0, init_data_1.initializeData)();
        logger_1.default.info('✅ Data initialization completed');
    }
    catch (error) {
        logger_1.default.error(`❌ Initialization failed: ${error}`);
    }
};
// 只有在非 Vercel 环境下（本地开发）才直接监听端口
if (process.env.VERCEL !== '1') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, async () => {
        await initializeServer();
        logger_1.default.info(`Server is running on port ${PORT}`);
        logger_1.default.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}
else {
    initializeServer();
}
//# sourceMappingURL=index.js.map