"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// 首先加载环境变量，必须在其他导入之前
dotenv_1.default.config();
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
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
exports.default = app;
// 中间件
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // 允许没有 origin 的请求（比如同源请求或非浏览器请求）
        if (!origin)
            return callback(null, true);
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:3000',
            process.env.FRONTEND_URL
        ].filter(Boolean);
        // 检查是否在允许列表里，或者是否是 vercel.app 域名
        if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
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
    console.log(`[Request] ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});
// 健康检查 - Support both /health and /api/health
const healthHandler = (req, res) => {
    console.log('Health check called');
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
// 404处理
app.use(errorHandler_1.notFoundHandler);
// 导入数据初始化
const init_data_1 = require("./config/init-data");
// 错误处理
app.use(errorHandler_1.errorHandler);
// 初始化数据（所有环境都需要）
const initializeServer = async () => {
    try {
        await (0, database_1.testConnection)();
        await (0, init_data_1.initializeData)();
        console.log('✅ Data initialization completed');
    }
    catch (error) {
        console.error('❌ Initialization failed:', error);
    }
};
// 只有在非 Vercel 环境下（本地开发）才直接监听端口
if (process.env.VERCEL !== '1') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, async () => {
        await initializeServer();
        console.log(`Server is running on port ${PORT}`);
        console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
}
else {
    initializeServer();
}
//# sourceMappingURL=index.js.map