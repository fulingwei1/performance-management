import fs from 'fs';
import path from 'path';
import { pool, query, USE_MEMORY_DB } from './database';
import logger from './logger';

const localDatabasePattern = /localhost|127\.0\.0\.1|postgres/i;

function isLocalPostgres(): boolean {
  return Boolean(process.env.DATABASE_URL && localDatabasePattern.test(process.env.DATABASE_URL));
}

function getPostgresInitDir(): string {
  return path.resolve(__dirname, '../../../postgres-init');
}

export async function ensureLocalPostgresSchema(): Promise<void> {
  if (USE_MEMORY_DB || !pool || !isLocalPostgres()) return;
  if (process.env.AUTO_RUN_LOCAL_SCHEMA === 'false') return;

  const initDir = getPostgresInitDir();
  if (!fs.existsSync(initDir)) {
    logger.warn(`⚠️ 本地 PostgreSQL 初始化目录不存在: ${initDir}`);
    return;
  }

  const files = fs
    .readdirSync(initDir)
    .filter((name) => name.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const filePath = path.join(initDir, file);
    const sql = fs.readFileSync(filePath, 'utf8').trim();
    if (!sql) continue;

    await pool.query(sql);
  }

  logger.info(`✅ 本地 PostgreSQL schema 已同步 (${files.length} 个脚本)`);
}

export async function syncDepartmentsFromEmployees(): Promise<void> {
  if (USE_MEMORY_DB || !pool || !isLocalPostgres()) return;

  await query(`
    INSERT INTO departments (id, name, code, parent_id, sort_order, status, department_type)
    SELECT
      'd-' || md5(TRIM(department)) AS id,
      TRIM(department) AS name,
      upper(substr(md5(TRIM(department)), 1, 8)) AS code,
      NULL AS parent_id,
      row_number() OVER (ORDER BY TRIM(department)) AS sort_order,
      'active' AS status,
      CASE
        WHEN TRIM(department) LIKE '%营销%' OR TRIM(department) LIKE '%销售%' THEN 'sales'
        WHEN TRIM(department) LIKE '%工程%' OR TRIM(department) LIKE '%技术%' OR TRIM(department) LIKE '%研发%' THEN 'engineering'
        WHEN TRIM(department) LIKE '%制造%' OR TRIM(department) LIKE '%生产%' OR TRIM(department) LIKE '%品质%' THEN 'manufacturing'
        WHEN TRIM(department) LIKE '%总%' OR TRIM(department) LIKE '%管理%' THEN 'management'
        ELSE 'support'
      END AS department_type
    FROM (
      SELECT DISTINCT department
      FROM employees
      WHERE COALESCE(TRIM(department), '') <> ''
    ) d
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      code = EXCLUDED.code,
      status = EXCLUDED.status,
      department_type = EXCLUDED.department_type,
      updated_at = CURRENT_TIMESTAMP
  `);

  await query(`
    INSERT INTO departments (id, name, code, parent_id, sort_order, status, department_type)
    SELECT
      'sd-' || md5(TRIM(department) || '/' || TRIM(sub_department)) AS id,
      TRIM(sub_department) AS name,
      upper(substr(md5(TRIM(department) || '/' || TRIM(sub_department)), 1, 8)) AS code,
      'd-' || md5(TRIM(department)) AS parent_id,
      row_number() OVER (PARTITION BY TRIM(department) ORDER BY TRIM(sub_department)) AS sort_order,
      'active' AS status,
      p.department_type
    FROM (
      SELECT DISTINCT department, sub_department
      FROM employees
      WHERE COALESCE(TRIM(department), '') <> ''
        AND COALESCE(TRIM(sub_department), '') <> ''
    ) d
    JOIN departments p ON p.id = 'd-' || md5(TRIM(d.department))
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      parent_id = EXCLUDED.parent_id,
      status = EXCLUDED.status,
      department_type = EXCLUDED.department_type,
      updated_at = CURRENT_TIMESTAMP
  `);

  logger.info('✅ 已根据员工档案同步本地部门/二级部门');
}
