import dotenv from 'dotenv';
import path from 'path';
import { testConnection, pool } from '../config/database';
import { ensureLocalPostgresSchema } from '../config/local-schema';
import { EmployeeModel } from '../models/employee.model';
import { syncWecomUserIdsForEmployees } from '../services/wecomDirectory.service';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

async function main() {
  const connected = await testConnection();
  if (!connected) {
    throw new Error('数据库连接失败，无法同步企业微信映射');
  }

  await ensureLocalPostgresSchema();

  const employees = await EmployeeModel.findAll();
  const result = await syncWecomUserIdsForEmployees(
    employees
      .filter((employee: any) => !employee.status || employee.status === 'active')
      .map((employee) => ({
        id: employee.id,
        name: employee.name,
        wecomUserId: employee.wecomUserId,
        status: employee.status,
      }))
  );

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error('[syncWecomUserMapping] failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (pool) {
      await pool.end();
    }
  });
