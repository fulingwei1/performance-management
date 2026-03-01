const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'performance_user',
    password: process.env.DB_PASSWORD || 'performance123',
    database: process.env.DB_NAME || 'performance_db',
    multipleStatements: true
  });

  console.log('✅ 已连接到MySQL数据库');

  // 读取迁移文件（MySQL版本）
  const migrations = [
    'migrations-mysql/012_peer_review_system_mysql.sql',
    'migrations-mysql/013_performance_interview_mysql.sql'
  ];

  for (const migrationFile of migrations) {
    const filePath = path.join(__dirname, migrationFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  跳过: ${migrationFile} (文件不存在)`);
      continue;
    }

    console.log(`\n🔨 执行迁移: ${migrationFile}`);
    
    const sql = fs.readFileSync(filePath, 'utf8');

    try {
      await connection.query(sql);
      console.log(`✅ ${migrationFile} 执行成功`);
    } catch (error) {
      console.error(`❌ ${migrationFile} 执行失败:`, error.message);
      if (error.message.includes('already exists')) {
        console.log(`   (表已存在，跳过)`);
      }
      // 继续执行下一个迁移
    }
  }

  await connection.end();
  console.log('\n✅ 迁移完成！');
}

// 加载环境变量
require('dotenv').config();

runMigrations().catch(error => {
  console.error('❌ 迁移失败:', error);
  process.exit(1);
});
