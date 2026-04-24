import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

describe('Bonus API disabled boundary', () => {
  let hrToken: string;

  beforeAll(async () => {
    hrToken = await TestHelper.getAuthToken('hr');
  });

  it.each([
    ['get', '/api/bonus/config'],
    ['put', '/api/bonus/config'],
    ['post', '/api/bonus/calculate'],
    ['get', '/api/bonus/results'],
    ['put', '/api/bonus/results/demo-id'],
  ] as const)('should return 410 for %s %s while bonus module is disabled', async (method, path) => {
    const res = await request(app)[method](path)
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ year: 2024, quarter: 1, rules: [] });

    expect(res.status).toBe(410);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('奖金管理模块已停用');
  });
});
