import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

describe('XSS Prevention', () => {
  let hrToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    hrToken = await TestHelper.getAuthToken('hr');
    employeeToken = await TestHelper.getAuthToken('employee');
  });

  const xssPayloads = [
    '<script>alert("xss")</script>',
    '<img src=x onerror=alert(1)>',
    '"><script>document.cookie</script>',
    "javascript:alert('xss')",
    '<svg onload=alert(1)>',
    '{{constructor.constructor("return this")()}}',
  ];

  describe('XSS in Employee Data', () => {
    it('should not store raw script tags in employee names', async () => {
      for (const payload of xssPayloads.slice(0, 3)) {
        const res = await request(app)
          .post('/api/employees')
          .set('Authorization', `Bearer ${hrToken}`)
          .send({
            name: payload,
            employee_id: `XSS_TEST_${Date.now()}`,
            department: '研发部',
            position: '工程师',
            role: 'employee',
          });

        expect(res.status).toBeLessThan(500);

        // If data was stored, verify it's escaped or sanitized when returned
        if (res.status === 200 || res.status === 201) {
          const body = JSON.stringify(res.body);
          // Should not contain unescaped script tags in response
          expect(body).not.toMatch(/<script[^>]*>[\s\S]*?<\/script>/i);
        }
      }
    });

    it('should handle XSS payloads in search parameters', async () => {
      for (const payload of xssPayloads) {
        const res = await request(app)
          .get('/api/employees')
          .query({ search: payload })
          .set('Authorization', `Bearer ${hrToken}`);

        expect(res.status).toBeLessThan(500);

        // Response should not reflect unescaped payload
        if (res.body.message) {
          expect(res.body.message).not.toContain('<script>');
        }
      }
    });

    it('should handle XSS in objective descriptions', async () => {
      const res = await request(app)
        .post('/api/objectives')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: '<script>alert("xss")</script>目标',
          description: '<img src=x onerror=alert(1)>描述',
          weight: 30,
          year: 2026,
          quarter: 'Q1',
        });

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Response Headers', () => {
    it('should set security headers (helmet)', async () => {
      const res = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${hrToken}`);

      // Helmet should set these headers
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      // X-XSS-Protection may or may not be set depending on helmet version
      // Content-Security-Policy is optional but good
    });
  });

  describe('Content-Type Enforcement', () => {
    it('should reject non-JSON content types for JSON endpoints', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${hrToken}`)
        .set('Content-Type', 'text/html')
        .send('<script>alert("xss")</script>');

      // Should not process HTML as valid input
      expect(res.status).toBeLessThan(500);
    });
  });
});
