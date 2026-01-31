import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
 
// 首先加载环境变量，必须在其他导入之前
dotenv.config();
 
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

const app = express();
const PORT = process.env.PORT || 3001;
 
export default app;
 
// 中间件
app.use(cors({
  origin: (origin, callback) => {
    // 允许没有 origin 的请求（比如同源请求或非浏览器请求）
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // 检查是否在允许列表里，或者是否是 vercel.app 域名
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
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
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
 
// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务器运行正常',
    timestamp: new Date().toISOString()
  });
});
 
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

// 404处理
app.use(notFoundHandler);
 
// 导入数据初始化
import { initializeData } from './config/init-data';
 
// 错误处理
app.use(errorHandler);
 
// Vercel Serverless 环境下导出 app，否则启动服务器
if (process.env.NODE_ENV === 'test') {
  // 测试环境不启动服务器
} else if (process.env.VERCEL) {
  // Vercel Serverless 环境 - 需要初始化数据
  const initializeServer = async () => {
    try {
      // 初始化数据库连接
      const dbConnected = await testConnection();
      if (!dbConnected) {
        console.error('❌ Vercel 环境数据库连接失败');
      } else {
        // 初始化员工数据
        await initializeData();
      }
      console.log('✅ Vercel Serverless 环境初始化完成');
    } catch (error) {
      console.error('❌ Vercel 环境初始化失败:', error);
    }
  };
  
  initializeServer();
  
  // Vercel 会自动处理路由，不需要 app.listen()
} else {
  // 本地开发环境 - 启动服务器
  const startServer = async () => {
    // 测试数据库连接
    const dbConnected = await testConnection();
    
    if (!dbConnected) {
      if (!USE_MEMORY_DB) {
        console.error('❌ MySQL 连接失败，请检查 DB_* 配置与 MySQL 服务后重试');
        process.exit(1);
      }
      console.warn('⚠️ 使用内存数据库（仅测试/演示）');
    }
    
    // 初始化员工数据
    try {
      await initializeData();
    } catch (error) {
      console.error('❌ 初始化数据失败:', error);
    }
    
    app.listen(PORT, () => {
      console.log(`\n🚀 服务器启动成功`);
      console.log(`📍 地址: http://localhost:${PORT}`);
      console.log(`📚 API文档: http://localhost:${PORT}/health`);
      console.log('');
    });
  };
  
  startServer();
}
 
