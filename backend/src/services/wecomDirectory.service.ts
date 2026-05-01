import { EmployeeModel } from '../models/employee.model';
import logger from '../config/logger';
import { Employee } from '../types';

type WecomDirectoryUser = {
  userid: string;
  name: string;
  departmentIds: number[];
};

const CORP_ID = () => process.env.WECOM_CORP_ID || '';
const SECRET = () => process.env.WECOM_SECRET || '';

const DIRECTORY_CACHE_TTL_MS = 10 * 60 * 1000;

let cachedToken = '';
let tokenExpiresAt = 0;
let cachedDirectoryUsers: WecomDirectoryUser[] = [];
let directoryExpiresAt = 0;

function isConfigured(): boolean {
  return Boolean(CORP_ID() && SECRET());
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt) return cachedToken;

  const response = await fetch(
    `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${encodeURIComponent(CORP_ID())}&corpsecret=${encodeURIComponent(SECRET())}`
  );
  const payload = await response.json() as { errcode?: number; errmsg?: string; access_token?: string; expires_in?: number };

  if (payload.errcode !== 0 || !payload.access_token) {
    throw new Error(`获取企业微信 access_token 失败: ${payload.errcode ?? 'unknown'} ${payload.errmsg ?? ''}`.trim());
  }

  cachedToken = payload.access_token;
  tokenExpiresAt = now + Math.max((payload.expires_in || 7200) - 300, 300) * 1000;
  return cachedToken;
}

async function fetchJson<T>(path: string, params: Record<string, string | number>): Promise<T> {
  const token = await getAccessToken();
  const search = new URLSearchParams({ access_token: token });
  Object.entries(params).forEach(([key, value]) => {
    search.set(key, String(value));
  });
  const response = await fetch(`https://qyapi.weixin.qq.com${path}?${search.toString()}`);
  const payload = await response.json() as T & { errcode?: number; errmsg?: string };
  if (typeof payload.errcode === 'number' && payload.errcode !== 0) {
    throw new Error(`企业微信接口失败 ${path}: ${payload.errcode} ${payload.errmsg || ''}`.trim());
  }
  return payload;
}

async function loadDirectoryUsers(force = false): Promise<WecomDirectoryUser[]> {
  if (!isConfigured()) return [];

  const now = Date.now();
  if (!force && cachedDirectoryUsers.length > 0 && now < directoryExpiresAt) {
    return cachedDirectoryUsers;
  }

  const departmentsResponse = await fetchJson<{ department?: Array<{ id: number }> }>(
    '/cgi-bin/department/list',
    {},
  );
  const departmentIds = Array.from(new Set((departmentsResponse.department || []).map((department) => department.id))).filter(Boolean);

  const usersById = new Map<string, WecomDirectoryUser>();
  for (const departmentId of departmentIds) {
    const usersResponse = await fetchJson<{ userlist?: Array<{ userid: string; name: string; department?: number[] }> }>(
      '/cgi-bin/user/simplelist',
      {
        department_id: departmentId,
        fetch_child: 0,
      },
    );

    for (const user of usersResponse.userlist || []) {
      if (!user.userid || !user.name) continue;
      const existing = usersById.get(user.userid);
      if (existing) {
        const mergedDepartmentIds = new Set<number>([...existing.departmentIds, ...(user.department || [])]);
        existing.departmentIds = Array.from(mergedDepartmentIds);
        continue;
      }

      usersById.set(user.userid, {
        userid: user.userid,
        name: user.name.trim(),
        departmentIds: Array.from(new Set(user.department || [])),
      });
    }
  }

  cachedDirectoryUsers = Array.from(usersById.values());
  directoryExpiresAt = now + DIRECTORY_CACHE_TTL_MS;
  logger.info(`[WecomDirectory] 已刷新通讯录缓存，共 ${cachedDirectoryUsers.length} 人`);
  return cachedDirectoryUsers;
}

function normalizeName(name: string): string {
  return String(name || '').trim();
}

export async function findUniqueWecomUserIdByName(name: string): Promise<string | null> {
  const normalizedName = normalizeName(name);
  if (!normalizedName) return null;

  const users = await loadDirectoryUsers();
  const matchedUserIds = Array.from(new Set(
    users
      .filter((user) => normalizeName(user.name) === normalizedName)
      .map((user) => user.userid)
      .filter(Boolean)
  ));

  if (matchedUserIds.length !== 1) {
    if (matchedUserIds.length > 1) {
      logger.warn(`[WecomDirectory] 姓名 "${normalizedName}" 在企业微信中匹配到多个 userid，跳过自动绑定`);
    }
    return null;
  }

  return matchedUserIds[0];
}

export async function resolveEmployeeWecomUserId(
  employee: Pick<Employee, 'id' | 'name' | 'wecomUserId'>,
): Promise<string | null> {
  const existing = String(employee.wecomUserId || '').trim();
  if (existing) return existing;

  const resolved = await findUniqueWecomUserIdByName(employee.name);
  if (!resolved) return null;

  try {
    await EmployeeModel.update(employee.id, { wecomUserId: resolved } as Partial<Employee>);
  } catch (error) {
    logger.warn(`[WecomDirectory] 绑定员工 ${employee.name}(${employee.id}) 企业微信 userid 失败: ${error}`);
  }

  return resolved;
}

export async function syncWecomUserIdsForEmployees(
  employees: Array<Pick<Employee, 'id' | 'name' | 'wecomUserId'> & { status?: string }>,
): Promise<{ updated: number; skipped: number; ambiguousNames: string[] }> {
  if (!isConfigured()) {
    logger.info('[WecomDirectory] 未配置企业微信通讯录凭据，跳过 userid 同步');
    return { updated: 0, skipped: employees.length, ambiguousNames: [] };
  }

  const users = await loadDirectoryUsers(true);
  const nameToUserIds = new Map<string, string[]>();
  for (const user of users) {
    const key = normalizeName(user.name);
    const existing = nameToUserIds.get(key) || [];
    if (!existing.includes(user.userid)) existing.push(user.userid);
    nameToUserIds.set(key, existing);
  }

  const localNameCounts = new Map<string, number>();
  for (const employee of employees) {
    const key = normalizeName(employee.name);
    localNameCounts.set(key, (localNameCounts.get(key) || 0) + 1);
  }

  let updated = 0;
  let skipped = 0;
  const ambiguousNames = new Set<string>();

  for (const employee of employees) {
    if (employee.status && employee.status !== 'active') {
      skipped++;
      continue;
    }

    const existing = String(employee.wecomUserId || '').trim();
    if (existing) {
      skipped++;
      continue;
    }

    const nameKey = normalizeName(employee.name);
    if (!nameKey || (localNameCounts.get(nameKey) || 0) > 1) {
      ambiguousNames.add(nameKey);
      skipped++;
      continue;
    }

    const matchedUserIds = nameToUserIds.get(nameKey) || [];
    if (matchedUserIds.length !== 1) {
      if (matchedUserIds.length > 1) ambiguousNames.add(nameKey);
      skipped++;
      continue;
    }

    await EmployeeModel.update(employee.id, { wecomUserId: matchedUserIds[0] } as Partial<Employee>);
    updated++;
  }

  if (updated > 0) {
    logger.info(`[WecomDirectory] 已同步 ${updated} 名员工的企业微信 userid`);
  }

  return {
    updated,
    skipped,
    ambiguousNames: Array.from(ambiguousNames).filter(Boolean),
  };
}
