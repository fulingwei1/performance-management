const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigrations() {
  // 读取DATABASE_URL
  require('dotenv').config();
  
  // 强制转换为PostgreSQL URL（如果是mysql://）
  let dbUrl = process.env.DATABASE_URL;
  if (dbUrl && dbUrl.startsWith('mysql://')) {
    // 转换mysql://为postgresql://
    dbUrl = dbUrl.replace('mysql://', 'postgresql://').replace(':3306', ':5432');
    console.log('⚠️  检测到MySQL URL，已转换为PostgreSQL:', dbUrl);
  }
  
  const pool = new Pool({
    connectionString: dbUrl || 'postgresql://performance_user:performance123@localhost:5432/performance_db',
    max: 1,
    connectionTimeoutMillis: 5000
  });

  try {
    // 测试连接
    await pool.query('SELECT 1');
    console.log('✅ 已连接到PostgreSQL数据库\n');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    console.log('\n💡 提示: 请确保PostgreSQL已启动');
    console.log('   如果使用Memory DB，请设置 USE_MEMORY_DB=true\n');
    process.exit(1);
  }

  // 读取PostgreSQL迁移文件
  const migrations = [
    'src/migrations/012_peer_review_system.sql',
    'src/migrations/013_performance_interview_enhanced.sql'
  ];

  for (const migrationFile of migrations) {
    const filePath = path.join(__dirname, migrationFile);
    
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  跳过: ${migrationFile} (文件不存在)`);
      continue;
    }

    console.log(`🔨 执行迁移: ${migrationFile}`);
    
    let sql = fs.readFileSync(filePath, 'utf8');
    
    // PostgreSQL不支持multipleStatements，需要分割SQL
    // 移除触发器部分（MySQL语法）
    sql = sql.replace(/DELIMITER \/\/.+?DELIMITER ;/gs, '');
    
    // 移除注释行
    const statements = sql
      .split('\n')
      .filter(line => !line.trim().startsWith('--') && line.trim())
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      if (!statement || statement.length < 10) continue;
      
      try {
        await pool.query(statement + ';');
      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ⏭️  表已存在，跳过`);
        } else {
          console.error(`   ❌ 执行失败:`, error.message.split('\n')[0]);
        }
      }
    }
    
    console.log(`✅ ${migrationFile} 完成\n`);
  }

  await pool.end();
  console.log('✅ 所有迁移完成！');
}

runMigrations().catch(error => {
  console.error('❌ 迁移失败:', error);
  process.exit(1);
});
