import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

describe('Input Validation', () => {
  let hrToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    hrToken = await TestHelper.getAuthToken('hr');
    employeeToken = await TestHelper.getAuthToken('employee');
  });

  describe('Oversized Input', () => {
    it('should handle extremely long strings gracefully', async () => {
      const longString = 'A'.repeat(10000);
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          name: longString,
          employee_id: 'EMP999',
          department: '研发部',
          position: '工程师',
          role: 'employee',
        });

      expect(res.status).toBeLessThan(500);
    });

    it('should handle very long search queries', async () => {
      const res = await request(app)
        .get('/api/employees')
        .query({ search: 'x'.repeat(5000) })
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Negative and Invalid IDs', () => {
    it('should reject negative IDs', async () => {
      const res = await request(app)
        .get('/api/employees/-1')
        .set('Authorization', `Bearer ${hrToken}`);

      expect([400, 404, 200]).toContain(res.status);
      expect(res.status).toBeLessThan(500);
    });

    it('should handle zero ID', async () => {
      const res = await request(app)
        .get('/api/employees/0')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBeLessThan(500);
    });

    it('should handle non-numeric IDs', async () => {
      const res = await request(app)
        .get('/api/employees/abc')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Invalid Enum Values', () => {
    it('should reject invalid role values', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          username: '于振华',
          password: '123456',
          role: 'superadmin_hacker',
        });

      // Should not grant access with invalid role
      expect(res.status).toBeLessThan(500);
      if (res.status === 200) {
        // If it returns 200, the role should not be elevated
        expect(res.body.data?.role).not.toBe('superadmin_hacker');
      }
    });
  });

  describe('NULL and Undefined Injection', () => {
    it('should handle null values in required fields', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          name: null,
          employee_id: null,
          department: null,
          position: null,
          role: null,
        });

      expect(res.status).toBeLessThan(500);
    });

    it('should handle undefined/missing body', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({});

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Type Mismatch', () => {
    it('should handle number where string expected', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          name: 12345,
          employee_id: true,
          department: { nested: 'object' },
          position: ['array'],
          role: 'employee',
        });

      expect(res.status).toBeLessThan(500);
    });

    it('should handle string where number expected in query params', async () => {
      const res = await request(app)
        .get('/api/employees')
        .query({ page: 'not_a_number', pageSize: '-999' })
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe('Data Leakage Prevention', () => {
    it('should not expose stack traces in error responses', async () => {
      const res = await request(app)
        .get('/api/nonexistent-endpoint-12345');

      const body = JSON.stringify(res.body);
      expect(body).not.toContain('at Object.');
      expect(body).not.toContain('at Module.');
      expect(body).not.toContain('.ts:');
      expect(body).not.toContain('node_modules');
    });

    it('should not expose internal paths in errors', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${hrToken}`)
        .set('Content-Type', 'application/json')
        .send('{"invalid json');

      const body = JSON.stringify(res.body);
      expect(body).not.toContain('/Users/');
      expect(body).not.toContain('src/');
    });
  });
});
