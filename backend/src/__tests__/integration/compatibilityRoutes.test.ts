import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

describe('Compatibility and admin utility routes', () => {
  it('returns settings and assessment-scope aliases', async () => {
    const token = await TestHelper.getAuthToken('hr');

    const settingsResponse = await request(app)
      .get('/api/settings')
      .set('Authorization', `Bearer ${token}`);

    expect(settingsResponse.status).toBe(200);
    expect(settingsResponse.body.success).toBe(true);
    expect(Array.isArray(settingsResponse.body.data)).toBe(true);

    const scopeResponse = await request(app)
      .get('/api/settings/assessment-scope')
      .set('Authorization', `Bearer ${token}`);

    expect(scopeResponse.status).toBe(200);
    expect(scopeResponse.body.success).toBe(true);
    expect(scopeResponse.body.data).toHaveProperty('participation');
  });

  it('returns automation month options', async () => {
    const token = await TestHelper.getAuthToken('hr');

    const response = await request(app)
      .get('/api/automation/months')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(Array.isArray(response.body.data.months)).toBe(true);
    expect(response.body.data.defaultMonth).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
  });

  it('exports employee archive without sensitive fields', async () => {
    const token = await TestHelper.getAuthToken('hr');

    const response = await request(app)
      .get('/api/employees/export')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(response.headers['content-disposition']).toContain('filename=');
  });

  it('validates export month before querying records', async () => {
    const token = await TestHelper.getAuthToken('hr');

    for (const path of ['/api/export/performance?month=2026-13', '/api/performance/export?month=bad-month']) {
      const response = await request(app)
        .get(path)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    }
  });

  it('returns configured template metrics through metrics aliases', async () => {
    const token = await TestHelper.getAuthToken('hr');

    for (const path of ['/api/metrics', '/api/metrics/templates']) {
      const response = await request(app)
        .get(path)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    }
  });
});
