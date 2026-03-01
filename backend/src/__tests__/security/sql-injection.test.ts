import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

describe('SQL Injection Prevention', () => {
  let hrToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    hrToken = await TestHelper.getAuthToken('hr');
    employeeToken = await TestHelper.getAuthToken('employee');
  });

  describe('Query Parameter Injection', () => {
    it('should handle SQL injection in search/filter params', async () => {
      const maliciousInputs = [
        "'; DROP TABLE employees; --",
        "1 OR 1=1",
        "1; DELETE FROM employees WHERE 1=1",
        "' UNION SELECT * FROM pg_tables --",
      ];

      for (const input of maliciousInputs) {
        const res = await request(app)
          .get('/api/employees')
          .query({ search: input })
          .set('Authorization', `Bearer ${hrToken}`);

        // Should not crash - returns 200 or 400, never 500
        expect([200, 400]).toContain(res.status);
        expect(res.body).toBeDefined();
      }
    });

    it('should handle SQL injection in ID parameters', async () => {
      const maliciousIds = [
        "1; DROP TABLE employees;--",
        "1 OR 1=1",
        "' OR ''='",
      ];

      for (const id of maliciousIds) {
        const res = await request(app)
          .get(`/api/employees/${encodeURIComponent(id)}`)
          .set('Authorization', `Bearer ${hrToken}`);

        // Should return 400 or 404, not 500
        expect([400, 404, 200]).toContain(res.status);
      }
    });

    it('should handle SQL injection in POST body fields', async () => {
      const res = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          name: "'; DROP TABLE employees; --",
          employee_id: "EMP' OR '1'='1",
          department: "研发部'; DELETE FROM departments;--",
          position: "工程师",
          role: "employee",
        });

      // Should not crash; may reject or sanitize
      expect(res.status).toBeLessThan(500);
    });

    it('should not expose database structure in error messages on injection attempt', async () => {
      const res = await request(app)
        .get("/api/employees/'; SELECT pg_tables;--")
        .set('Authorization', `Bearer ${hrToken}`);

      const body = JSON.stringify(res.body).toLowerCase();
      expect(body).not.toContain('pg_tables');
      expect(body).not.toContain('information_schema');
      expect(body).not.toContain('syntax error');
    });
  });

  describe('Objective/KPI Routes Injection', () => {
    it('should handle injection in objective creation', async () => {
      const res = await request(app)
        .post('/api/objectives')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          title: "目标'; DROP TABLE objectives;--",
          description: "描述' UNION SELECT * FROM employees--",
          weight: 30,
          year: 2026,
          quarter: 'Q1',
        });

      expect(res.status).toBeLessThan(500);
    });
  });
});
