import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

describe('Peer Review Cycle API', () => {
  let hrToken: string;
  let employeeToken: string;
  let managerToken: string;
  let cycleId: string;

  beforeAll(async () => {
    hrToken = await TestHelper.getAuthToken('hr');
    employeeToken = await TestHelper.getAuthToken('employee');
    managerToken = await TestHelper.getAuthToken('manager');
  });

  describe('POST /api/peer-review-cycles/cycles', () => {
    it('should allow HR to create a peer review cycle', async () => {
      // Get employee IDs from login info
      const meHr = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${hrToken}`);
      const meEmp = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${employeeToken}`);
      const meMgr = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${managerToken}`);

      const participants = [meEmp.body.data.id, meMgr.body.data.id];

      const res = await request(app)
        .post('/api/peer-review-cycles/cycles')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          title: '2024 Q1 互评',
          year: 2024,
          quarter: 1,
          startDate: '2024-01-01',
          endDate: '2024-03-31',
          participants,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.title).toBe('2024 Q1 互评');
      expect(res.body.data.status).toBe('active');
      cycleId = res.body.data.id;
    });

    it('should reject non-HR from creating a cycle', async () => {
      const res = await request(app)
        .post('/api/peer-review-cycles/cycles')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: 'Unauthorized Cycle',
          year: 2024,
          quarter: 2,
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/peer-review-cycles/pending', () => {
    it('should return pending tasks for a participant', async () => {
      const res = await request(app)
        .get('/api/peer-review-cycles/pending')
        .set('Authorization', `Bearer ${employeeToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/peer-review-cycles/submit', () => {
    it('should submit a peer review', async () => {
      // Get manager's pending tasks
      const pending = await request(app)
        .get('/api/peer-review-cycles/pending')
        .set('Authorization', `Bearer ${managerToken}`);

      // Manager should have a task to review employee
      if (pending.body.data.length > 0) {
        const task = pending.body.data[0];
        const res = await request(app)
          .post('/api/peer-review-cycles/submit')
          .set('Authorization', `Bearer ${managerToken}`)
          .send({
            cycleId: task.cycleId,
            revieweeId: task.revieweeId,
            scores: [
              { dimension: '工作能力', score: 90 },
              { dimension: '协作精神', score: 85 },
            ],
          });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data.status).toBe('submitted');
      }
    });
  });

  describe('GET /api/peer-review-cycles/results/:cycleId', () => {
    it('should return results for a cycle', async () => {
      const res = await request(app)
        .get(`/api/peer-review-cycles/results/${cycleId}`)
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('GET /api/peer-review-cycles/cycles', () => {
    it('should list all cycles', async () => {
      const res = await request(app)
        .get('/api/peer-review-cycles/cycles')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });
});
