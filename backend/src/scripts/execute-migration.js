/**
 * 执行核心部门、岗位、考核模板初始化脚本
 * 用法：node execute-migration.js
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// 从环境变量获取数据库连接
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/performance_management';

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function executeMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 连接到数据库...');
    
    // 读取 SQL 文件
    const sqlPath = path.join(__dirname, '../migrations/013_core_department_templates.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📖 读取 SQL 文件...');
    console.log('🚀 开始执行迁移...');
    
    // 执行 SQL
    await client.query(sql);
    
    console.log('✅ 迁移执行成功！');
    
    // 验证数据
    const [departments, positions, metrics, templates] = await Promise.all([
      client.query("SELECT COUNT(*) FROM departments"),
      client.query("SELECT COUNT(*) FROM positions"),
      client.query("SELECT COUNT(*) FROM performance_metrics"),
      client.query("SELECT COUNT(*) FROM metric_templates"),
    ]);
    
    console.log('\n📊 数据验证：');
    console.log(`   部门数：${departments.rows[0].count}`);
    console.log(`   岗位数：${positions.rows[0].count}`);
    console.log(`   指标数：${metrics.rows[0].count}`);
    console.log(`   模板数：${templates.rows[0].count}`);
    
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

executeMigration();
