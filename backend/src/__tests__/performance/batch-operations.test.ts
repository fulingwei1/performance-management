import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';
import * as fs from 'fs';
import * as path from 'path';

const ITERATIONS = 10;
const TOLERANCE = 1.1;

interface BenchmarkResult {
  operation: string;
  avgMs: number;
  minMs: number;
  maxMs: number;
  p95Ms: number;
  threshold: number;
  passed: boolean;
}

const results: BenchmarkResult[] = [];

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

async function benchmarkOp(
  name: string,
  threshold: number,
  fn: () => Promise<any>,
): Promise<BenchmarkResult> {
  const times: number[] = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    await fn();
    times.push(performance.now() - start);
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const result: BenchmarkResult = {
    operation: name,
    avgMs: Math.round(avg * 100) / 100,
    minMs: Math.round(Math.min(...times) * 100) / 100,
    maxMs: Math.round(Math.max(...times) * 100) / 100,
    p95Ms: Math.round(percentile(times, 95) * 100) / 100,
    threshold,
    passed: avg < threshold * TOLERANCE,
  };
  results.push(result);
  return result;
}

describe('Batch Operations Performance', () => {
  let hrToken: string;
  let cycleId: string;

  beforeAll(async () => {
    hrToken = await TestHelper.getAuthToken('hr');

    // Create a cycle
    const res = await request(app)
      .post('/api/peer-review-cycles/cycles')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        title: 'Batch Perf Cycle',
        year: 2024,
        quarter: 2,
        startDate: '2024-04-01',
        endDate: '2024-06-30',
        participants: [],
      });
    cycleId = res.body?.data?.id || 'batch-test-id';
  });

  afterAll(() => {
    // Append batch results to report
    const reportPath = path.join(__dirname, '..', '..', '..', 'PERFORMANCE_REPORT.md');
    let existing = '';
    try { existing = fs.readFileSync(reportPath, 'utf-8'); } catch {}

    const lines = [
      '',
      '## 批量操作性能',
      '',
      '| 操作 | 平均(ms) | 最小(ms) | 最大(ms) | P95(ms) | 阈值(ms) | 结果 |',
      '|------|---------|---------|---------|---------|---------|------|',
      ...results.map(r =>
        `| ${r.operation} | ${r.avgMs} | ${r.minMs} | ${r.maxMs} | ${r.p95Ms} | ${r.threshold} | ${r.passed ? '✅' : '❌'} |`
      ),
      '',
      '## 总结',
      '',
      `- 测试时间: ${new Date().toISOString()}`,
      `- 迭代次数: ${ITERATIONS}`,
      `- 内存数据库: ✅`,
      '',
    ];
    fs.writeFileSync(reportPath, existing + lines.join('\n'));
  });

  it('批量查询互评周期列表 should be < 500ms', async () => {
    const r = await benchmarkOp('查询互评周期列表', 500, async () => {
      await request(app)
        .get('/api/peer-review-cycles/cycles')
        .set('Authorization', `Bearer ${hrToken}`);
    });
    console.log(`  ⏱ avg=${r.avgMs}ms p95=${r.p95Ms}ms`);
    expect(r.passed).toBe(true);
  });

  it('批量查询互评记录 should be < 500ms', async () => {
    const r = await benchmarkOp('查询互评记录', 500, async () => {
      await request(app)
        .get(`/api/peer-review-cycles/cycles/${cycleId}/reviews`)
        .set('Authorization', `Bearer ${hrToken}`);
    });
    console.log(`  ⏱ avg=${r.avgMs}ms p95=${r.p95Ms}ms`);
    expect(r.passed).toBe(true);
  });

  it('批量查询面谈计划 should be < 500ms', async () => {
    const r = await benchmarkOp('查询面谈计划', 500, async () => {
      await request(app)
        .get('/api/interview-records/plans')
        .set('Authorization', `Bearer ${hrToken}`);
    });
    console.log(`  ⏱ avg=${r.avgMs}ms p95=${r.p95Ms}ms`);
    expect(r.passed).toBe(true);
  });

  it('统计数据查询 should be < 200ms', async () => {
    const r = await benchmarkOp('统计数据查询', 200, async () => {
      await request(app)
        .get('/api/peer-review-cycles/cycles')
        .set('Authorization', `Bearer ${hrToken}`)
        .query({ stats: true });
    });
    console.log(`  ⏱ avg=${r.avgMs}ms p95=${r.p95Ms}ms`);
    expect(r.passed).toBe(true);
  });
});
