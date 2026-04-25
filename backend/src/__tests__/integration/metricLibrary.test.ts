import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

describe('Metric Library API', () => {
  it('GET /api/metrics/templates should return template list instead of being captured by metric id route', async () => {
    const token = await TestHelper.getAuthToken('hr');

    const response = await request(app)
      .get('/api/metrics/templates')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('success', true);
    expect(Array.isArray(response.body.data)).toBe(true);
  });

  it('GET /api/metrics/templates/position/:positionId should route to position template handler', async () => {
    const token = await TestHelper.getAuthToken('hr');

    const response = await request(app)
      .get('/api/metrics/templates/position/non-existing-position')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('message', '该岗位暂无指标模板');
  });
});
