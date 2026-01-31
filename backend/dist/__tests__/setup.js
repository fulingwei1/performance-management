"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = exports.server = void 0;
let server;
let database;
beforeAll(async () => {
    // 初始化测试数据库
    process.env.NODE_ENV = 'test';
    process.env.USE_MEMORY_DB = 'true'; // 强制使用内存数据库
    process.env.DB_HOST = process.env.DB_HOST || 'localhost';
    process.env.DB_PORT = process.env.DB_PORT || '3306';
    process.env.DB_USER = process.env.DB_USER || 'root';
    process.env.DB_PASSWORD = process.env.DB_PASSWORD || '';
    process.env.DB_NAME = process.env.DB_NAME || 'performance_test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
    process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
    // 导入并初始化内存数据库
    const { initMemoryDB } = require('../config/memory-db');
    initMemoryDB();
    // 初始化测试数据
    const { initializeData } = require('../config/init-data');
    await initializeData();
    console.log('✅ 测试数据库和数据初始化完成');
});
afterAll(async () => {
    // 清理测试数据库
    if (database) {
        await database.close();
    }
    // 关闭服务器
    if (server) {
        server.close();
    }
});
beforeEach(async () => {
    // 每个测试前的准备逻辑
});
afterEach(async () => {
    // 每个测试后的清理逻辑
});
// 确保测试环境配置正确
console.log('Test environment configured:', process.env.NODE_ENV);
//# sourceMappingURL=setup.js.map