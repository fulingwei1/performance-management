import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';
import * as fs from 'fs';
import * as path from 'path';

const ITERATIONS = 10;
const TOLERANCE = 1.1; // 10% tolerance

interface BenchmarkResult {
  endpoint: string;
  method: string;
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

async function benchmark(
  method: 'get' | 'post',
  url: string,
  token: string,
  threshold: number,
  body?: any,
): Promise<BenchmarkResult> {
  const times: number[] = [];

  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    const req = method === 'get'
      ? request(app).get(url).set('Authorization', `Bearer ${token}`)
      : request(app).post(url).set('Authorization', `Bearer ${token}`).send(body);
    await req;
    times.push(performance.now() - start);
  }

  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const result: BenchmarkResult = {
    endpoint: `${method.toUpperCase()} ${url}`,
    method,
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

describe('API Response Time Benchmarks', () => {
  let hrToken: string;
  let employeeToken: string;
  let cycleId: string;

  beforeAll(async () => {
    hrToken = await TestHelper.getAuthToken('hr');
    employeeToken = await TestHelper.getAuthToken('employee');

    // Create a cycle for testing
    const res = await request(app)
      .post('/api/peer-review-cycles/cycles')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        title: 'Perf Test Cycle',
        year: 2024,
        quarter: 1,
        startDate: '2024-01-01',
        endDate: '2024-03-31',
        participants: [],
      });
    cycleId = res.body?.data?.id || 'test-id';
  });

  afterAll(() => {
    // Write results to report fragment
    const reportPath = path.join(__dirname, '..', '..', '..', 'PERFORMANCE_REPORT.md');
    const lines = [
      '# 性能测试报告',
      '',
      `> 生成时间: ${new Date().toISOString()}`,
      `> 迭代次数: ${ITERATIONS}`,
      `> 容忍波动: 10%`,
      '',
      '## API 响应时间',
      '',
      '| 接口 | 平均(ms) | 最小(ms) | 最大(ms) | P95(ms) | 阈值(ms) | 结果 |',
      '|------|---------|---------|---------|---------|---------|------|',
      ...results.map(r =>
        `| ${r.endpoint} | ${r.avgMs} | ${r.minMs} | ${r.maxMs} | ${r.p95Ms} | ${r.threshold} | ${r.passed ? '✅' : '❌'} |`
      ),
      '',
    ];
    fs.writeFileSync(reportPath, lines.join('\n'));
  });

  it('GET /api/peer-review-cycles/cycles should be < 100ms avg', async () => {
    const r = await benchmark('get', '/api/peer-review-cycles/cycles', hrToken, 100);
    console.log(`  ⏱ avg=${r.avgMs}ms p95=${r.p95Ms}ms`);
    expect(r.passed).toBe(true);
  });

  it('GET /api/peer-review-cycles/cycles/:id/reviews should be < 200ms avg', async () => {
    const r = await benchmark('get', `/api/peer-review-cycles/cycles/${cycleId}/reviews`, hrToken, 200);
    console.log(`  ⏱ avg=${r.avgMs}ms p95=${r.p95Ms}ms`);
    expect(r.passed).toBe(true);
  });

  it('GET /api/interview-records/plans should be < 100ms avg', async () => {
    const r = await benchmark('get', '/api/interview-records/plans', hrToken, 100);
    console.log(`  ⏱ avg=${r.avgMs}ms p95=${r.p95Ms}ms`);
    expect(r.passed).toBe(true);
  });

  it('GET /api/interview-records/records should be < 200ms avg', async () => {
    const r = await benchmark('get', '/api/interview-records/records', hrToken, 200);
    console.log(`  ⏱ avg=${r.avgMs}ms p95=${r.p95Ms}ms`);
    expect(r.passed).toBe(true);
  });
});
