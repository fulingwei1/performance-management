import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

describe('Bonus API', () => {
  let hrToken: string;
  let employeeToken: string;
  let bonusResultId: string;

  const defaultRules = [
    { grade: 'A+', minScore: 95, coefficient: 2.0 },
    { grade: 'A', minScore: 85, coefficient: 1.5 },
    { grade: 'B', minScore: 70, coefficient: 1.0 },
    { grade: 'C', minScore: 60, coefficient: 0.5 },
    { grade: 'D', minScore: 0, coefficient: 0 },
  ];

  beforeAll(async () => {
    hrToken = await TestHelper.getAuthToken('hr');
    employeeToken = await TestHelper.getAuthToken('employee');
  });

  describe('GET /api/bonus/config', () => {
    it('should return config (may be null initially)', async () => {
      const res = await request(app)
        .get('/api/bonus/config')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('PUT /api/bonus/config', () => {
    it('should allow HR to update bonus config', async () => {
      const res = await request(app)
        .put('/api/bonus/config')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ rules: defaultRules });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.rules).toHaveLength(5);
      expect(res.body.data.rules[0].grade).toBe('A+');
      expect(res.body.data.rules[0].coefficient).toBe(2.0);
    });

    it('should reject non-HR from updating config', async () => {
      const res = await request(app)
        .put('/api/bonus/config')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ rules: defaultRules });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/bonus/calculate', () => {
    it('should allow HR to calculate bonuses', async () => {
      const res = await request(app)
        .post('/api/bonus/calculate')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ year: 2024, quarter: 1 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      // Verify each result has required fields
      const first = res.body.data[0];
      expect(first).toHaveProperty('grade');
      expect(first).toHaveProperty('coefficient');
      expect(first).toHaveProperty('bonus');
      expect(first).toHaveProperty('employeeName');

      bonusResultId = first.id;

      // Verify coefficient matches grade rules
      for (const result of res.body.data) {
        const rule = defaultRules.find(r => r.grade === result.grade);
        expect(rule).toBeDefined();
        expect(result.coefficient).toBe(rule!.coefficient);
      }
    });

    it('should reject non-HR from calculating', async () => {
      const res = await request(app)
        .post('/api/bonus/calculate')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ year: 2024, quarter: 1 });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/bonus/results/:id', () => {
    it('should allow HR to manually adjust a bonus', async () => {
      const res = await request(app)
        .put(`/api/bonus/results/${bonusResultId}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ bonus: 50000 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.bonus).toBe(50000);
      expect(res.body.data.adjusted).toBe(true);
    });

    it('should reject non-HR from adjusting', async () => {
      const res = await request(app)
        .put(`/api/bonus/results/${bonusResultId}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ bonus: 99999 });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/bonus/results', () => {
    it('should return bonus results', async () => {
      const res = await request(app)
        .get('/api/bonus/results')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });
});
