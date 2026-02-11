import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// 首先加载环境变量，必须在其他导入之前
dotenv.config();

import { validateEnv } from './config/env';
validateEnv();

import { testConnection, USE_MEMORY_DB } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// 导入路由（auth.ts会检查JWT_SECRET）
import authRoutes from './routes/auth.routes';
import employeeRoutes from './routes/employee.routes';
import performanceRoutes from './routes/performance.routes';
import organizationRoutes from './routes/organization.routes';
import assessmentCycleRoutes from './routes/assessmentCycle.routes';
import metricLibraryRoutes from './routes/metricLibrary.routes';
import peerReviewRoutes from './routes/peerReview.routes';
import settingsRoutes from './routes/settings.routes';
import exportRoutes from './routes/export.routes';
import promotionRequestRoutes from './routes/promotionRequest.routes';
import quarterlySummaryRoutes from './routes/quarterlySummary.routes';
import okrRoutes from './routes/okr.routes';
import strategicObjectiveRoutes from './routes/strategicObjective.routes';
import objectiveRoutes from './routes/objective.routes';
import kpiAssignmentRoutes from './routes/kpiAssignment.routes';
import performanceContractRoutes from './routes/performanceContract.routes';
import monthlyReportRoutes from './routes/monthlyReport.routes';
import performanceInterviewRoutes from './routes/performanceInterview.routes';
import attachmentRoutes from './routes/attachment.routes';
import bonusRoutes from './routes/bonus.routes';
import departmentRoutes from './routes/department.routes';
import peerReviewCycleRoutes from './routes/peerReviewCycle.routes';

const app = express();
const PORT = process.env.PORT || 3001;

export default app;

// 安全中间件
app.use(helmet());

// 全局限流：100次/分钟（测试环境禁用）
if (process.env.NODE_ENV !== 'test') {
  const globalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '请求过于频繁，请稍后再试' }
  });
  app.use(globalLimiter);

  // 登录接口限流：5次/分钟
  const loginLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message: '登录尝试过于频繁，请1分钟后再试' }
  });
  app.use('/api/auth/login', loginLimiter);
}

// CORS - 精确匹配项目域名
app.use(cors({
 origin: (origin, callback) => {
  if (!origin) return callback(null, true);

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'https://performance-management-api-three.vercel.app',
    process.env.FRONTEND_URL
  ].filter(Boolean) as string[];

  if (allowedOrigins.includes(origin)) {
    callback(null, true);
  } else {
    callback(new Error('Not allowed by CORS'));
  }
 },
 credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
 logger.info(`[Request] ${new Date().toISOString()} - ${req.method} ${req.path}`);
 next();
});

// 健康检查 - Support both /health and /api/health
const healthHandler = (req: express.Request, res: express.Response) => {
 logger.info('Health check called');
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
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/cycles', assessmentCycleRoutes);
app.use('/api/metrics', metricLibraryRoutes);
app.use('/api/peer-reviews', peerReviewRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/promotion-requests', promotionRequestRoutes);
app.use('/api/quarterly-summaries', quarterlySummaryRoutes);
app.use('/api/okr', okrRoutes);
app.use('/api/strategic-objectives', strategicObjectiveRoutes);
app.use('/api/objectives', objectiveRoutes);
app.use('/api/kpi-assignments', kpiAssignmentRoutes);
app.use('/api/contracts', performanceContractRoutes);
app.use('/api/monthly-reports', monthlyReportRoutes);
app.use('/api/interviews', performanceInterviewRoutes);
app.use('/api/attachments', attachmentRoutes);
app.use('/api/bonus', bonusRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/peer-review-cycles', peerReviewCycleRoutes);

// 404处理
app.use(notFoundHandler);

// 导入数据初始化
import { initializeData } from './config/init-data';
import logger from './config/logger';

// 错误处理
app.use(errorHandler);

// 初始化数据（所有环境都需要）
const initializeServer = async () => {
 try {
 await testConnection();
 await initializeData();
 logger.info('✅ Data initialization completed');
 } catch (error) {
 logger.error(`❌ Initialization failed: ${error}`);
 }
};

// 只有在非 Vercel 环境下（本地开发）才直接监听端口
if (process.env.VERCEL !== '1') {
 const PORT = process.env.PORT || 3000;
 app.listen(PORT, async () => {
  await initializeServer();
 logger.info(`Server is running on port ${PORT}`);
 logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
 });
} else {
 initializeServer();
}
