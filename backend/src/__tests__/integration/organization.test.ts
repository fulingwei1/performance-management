import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

describe('Organization API', () => {
  it('returns organization tree for authenticated users', async () => {
    const token = await TestHelper.getAuthToken('employee');

    const response = await request(app)
      .get('/api/organization/tree')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data.length).toBeGreaterThan(0);
    expect(response.body.data[0]).toHaveProperty('employeeCount');
  });

  it('returns flat department list through both aliases', async () => {
    const token = await TestHelper.getAuthToken('hr');

    for (const path of ['/api/organization/departments', '/api/departments']) {
      const response = await request(app)
        .get(path)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('path');
    }
  });
});
