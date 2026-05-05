const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const localDatabaseUrl = 'postgresql://performance_user:performance123@localhost:5432/performance_db';

const migrationFiles = [
  '../postgres-init/01-init.sql',
  '../postgres-init/02-appeals.sql',
  '../postgres-init/03-goal-approval.sql',
  '../postgres-init/04-todos.sql',
  '../postgres-init/05-employee-transfers.sql',
  '../postgres-init/06-local-current-schema.sql',
  '../postgres-init/07-login-logs.sql',
  '../postgres-init/08-automation-logs.sql',
  '../postgres-init/09-satisfaction-surveys.sql',
  'migrations/001_add_objective_cycle_fields.sql',
  'migrations/002_attachments.sql',
  'migrations/004_bonus.sql',
  'migrations/009_system_settings.sql',
  'migrations/011_monthly_assessments.sql',
  'migrations/012_metric_library.sql',
  'src/migrations/add_employee_quarterly_summaries.sql',
  'src/migrations/015_improvement_suggestions.sql',
  'src/migrations/016_template_cleanup_and_manager_rules.sql',
  'src/migrations/017_role_alignment_and_hr_manager.sql',
  'src/migrations/018_department_assessment_manager_alignment.sql',
  'src/migrations/019_backfill_template_metric_scoring_criteria.sql',
  'src/migrations/020_dedupe_active_assessment_templates.sql',
  'src/migrations/021_employee_must_change_password.sql',
  'src/migrations/022_create_automation_logs.sql',
  'src/migrations/023_satisfaction_surveys.sql',
];

async function runMigrations() {
  const databaseUrl = process.env.DATABASE_URL || localDatabaseUrl;
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 1,
    connectionTimeoutMillis: 5000,
  });

  try {
    await pool.query('SELECT 1');
    console.log('✅ 已连接到本地 PostgreSQL 数据库\n');
  } catch (error) {
    console.error('❌ 数据库连接失败:', error.message);
    console.log('\n💡 先在项目根目录启动本地数据库:');
    console.log('   docker compose up -d postgres\n');
    process.exit(1);
  }

  for (const migrationFile of migrationFiles) {
    const filePath = path.resolve(__dirname, migrationFile);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  跳过: ${migrationFile} (文件不存在)`);
      continue;
    }

    const sql = fs.readFileSync(filePath, 'utf8').trim();
    if (!sql) continue;

    try {
      console.log(`🔨 执行迁移: ${migrationFile}`);
      await pool.query(sql);
      console.log(`✅ ${migrationFile} 完成\n`);
    } catch (error) {
      console.error(`❌ ${migrationFile} 执行失败:`, error.message.split('\n')[0]);
      await pool.end();
      process.exit(1);
    }
  }

  await pool.end();
  console.log('✅ 本地 PostgreSQL 迁移全部完成');
}

runMigrations().catch(async (error) => {
  console.error('❌ 迁移失败:', error);
  process.exit(1);
});
