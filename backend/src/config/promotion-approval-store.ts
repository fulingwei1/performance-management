import type { EmployeeRole } from '../types';
import { query, USE_MEMORY_DB } from './database';

const allowedRoles: EmployeeRole[] = ['manager', 'gm', 'hr'];
const defaultChain: EmployeeRole[] = ['manager', 'gm', 'hr'];

let cachedChain: EmployeeRole[] = [...defaultChain];

const sanitizeChain = (input: unknown): EmployeeRole[] => {
  const list = Array.isArray(input) ? input : [];
  const filtered: EmployeeRole[] = [];
  list.forEach((role) => {
    if (allowedRoles.includes(role as EmployeeRole) && !filtered.includes(role as EmployeeRole)) {
      filtered.push(role as EmployeeRole);
    }
  });
  if (filtered.length === 0) {
    throw new Error('审批链至少需要一个角色');
  }
  return filtered;
};

export async function getPromotionApprovalChain(): Promise<EmployeeRole[]> {
  if (USE_MEMORY_DB) {
    return [...cachedChain];
  }

  const rows = await query(
    "SELECT chain FROM promotion_approval_settings WHERE id = 'default'"
  );
  if (rows.length > 0 && rows[0]?.chain) {
    try {
      const parsed = JSON.parse(rows[0].chain);
      return sanitizeChain(parsed);
    } catch {
      return [...defaultChain];
    }
  }

  // 初始化默认配置
  try {
    await setPromotionApprovalChain(defaultChain);
  } catch {
    // ignore
  }
  return [...defaultChain];
}

export async function setPromotionApprovalChain(chain: EmployeeRole[]): Promise<EmployeeRole[]> {
  const sanitized = sanitizeChain(chain);
  cachedChain = [...sanitized];

  if (USE_MEMORY_DB) {
    return [...sanitized];
  }

  const payload = JSON.stringify(sanitized);
  await query(
    `INSERT INTO promotion_approval_settings (id, chain, updated_at)
     VALUES ('default', ?, CURRENT_TIMESTAMP)
     ON CONFLICT (id) DO UPDATE SET chain = EXCLUDED.chain, updated_at = CURRENT_TIMESTAMP`,
    [payload]
  );

  return [...sanitized];
}
