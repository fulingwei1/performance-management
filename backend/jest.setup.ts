/**
 * Jest设置文件
 * 在每个测试文件运行之前执行
 */

// 设置测试环境变量（必须在任何导入之前）
process.env.NODE_ENV = 'test';
process.env.USE_MEMORY_DB = 'true';
process.env.DB_HOST = process.env.DB_HOST || 'localhost';
process.env.DB_PORT = process.env.DB_PORT || '3306';
process.env.DB_USER = process.env.DB_USER || 'root';
process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
process.env.DB_NAME = process.env.DB_NAME || 'performance_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

console.log('🧪 测试环境变量已设置');

// 延迟导入以避免模块在环境变量设置前被初始化
beforeAll(async () => {
  console.log('📝 初始化测试数据...');
  
  // 导入并初始化内存数据库
  const { initMemoryDB } = require('./src/config/memory-db');
  initMemoryDB();
  
  // 初始化测试数据
  const { initializeData } = require('./src/config/init-data');
  await initializeData();
  
  console.log('✅ 测试数据初始化完成');
});

afterAll(async () => {
  // 清理逻辑
  console.log('🧹 测试完成，清理资源');
});
