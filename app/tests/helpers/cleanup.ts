import { APIRequestContext } from '@playwright/test';

const API_BASE = 'http://localhost:3001/api';

/**
 * 通过 API 清理测试数据
 */
export async function cleanupTestData(request: APIRequestContext) {
  // 清理测试创建的互评周期（名称包含 [E2E-TEST]）
  try {
    const cyclesRes = await request.get(`${API_BASE}/peer-reviews/cycles`);
    const cyclesData = await cyclesRes.json();
    if (cyclesData.success && cyclesData.data) {
      for (const cycle of cyclesData.data) {
        if (cycle.name?.includes('[E2E-TEST]')) {
          await request.delete(`${API_BASE}/peer-reviews/cycles/${cycle.id}`);
        }
      }
    }
  } catch {
    // 静默处理
  }

  // 清理测试创建的面谈计划
  try {
    const plansRes = await request.get(`${API_BASE}/interview-records/plans`);
    const plansData = await plansRes.json();
    if (plansData.success && plansData.data) {
      for (const plan of plansData.data) {
        if (plan.title?.includes('[E2E-TEST]')) {
          await request.delete(`${API_BASE}/interview-records/plans/${plan.id}`);
        }
      }
    }
  } catch {
    // 静默处理
  }
}
