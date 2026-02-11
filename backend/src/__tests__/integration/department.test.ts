import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';

describe('Department API', () => {
  let hrToken: string;
  let employeeToken: string;
  let managerToken: string;
  let parentDeptId: string;
  let childDeptId: string;

  beforeAll(async () => {
    hrToken = await TestHelper.getAuthToken('hr');
    employeeToken = await TestHelper.getAuthToken('employee');
    managerToken = await TestHelper.getAuthToken('manager');
  });

  describe('GET /api/departments/tree', () => {
    it('should return department tree', async () => {
      const res = await request(app)
        .get('/api/departments/tree')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/departments', () => {
    it('should allow HR to create a department', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ name: '测试事业部', code: 'TEST' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('测试事业部');
      parentDeptId = res.body.data.id;
    });

    it('should create a child department with parentId', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ name: '测试一组', code: 'TEST-1', parentId: parentDeptId });

      expect(res.status).toBe(201);
      expect(res.body.data.parentId).toBe(parentDeptId);
      childDeptId = res.body.data.id;
    });

    it('should reject non-HR from creating', async () => {
      const res = await request(app)
        .post('/api/departments')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Unauthorized Dept' });

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/departments/:id', () => {
    it('should allow HR to update a department', async () => {
      const res = await request(app)
        .put(`/api/departments/${childDeptId}`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ name: '测试二组' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.name).toBe('测试二组');
    });

    it('should return 404 for non-existent department', async () => {
      const res = await request(app)
        .put('/api/departments/non-existent')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ name: 'xxx' });

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/departments/:id/members', () => {
    it('should return members of a department', async () => {
      const res = await request(app)
        .get(`/api/departments/${parentDeptId}/members`)
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should return 404 for non-existent department', async () => {
      const res = await request(app)
        .get('/api/departments/non-existent/members')
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/departments/:id/manager', () => {
    it('should allow HR to set department manager', async () => {
      const meManager = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${managerToken}`);

      const res = await request(app)
        .put(`/api/departments/${parentDeptId}/manager`)
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ managerId: meManager.body.data.id });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.managerId).toBe(meManager.body.data.id);
    });

    it('should reject non-HR from setting manager', async () => {
      const res = await request(app)
        .put(`/api/departments/${parentDeptId}/manager`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ managerId: 'm001' });

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/departments/:id', () => {
    it('should not delete department with children', async () => {
      const res = await request(app)
        .delete(`/api/departments/${parentDeptId}`)
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('子部门');
    });

    it('should delete a leaf department', async () => {
      const res = await request(app)
        .delete(`/api/departments/${childDeptId}`)
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should delete parent after child is removed', async () => {
      const res = await request(app)
        .delete(`/api/departments/${parentDeptId}`)
        .set('Authorization', `Bearer ${hrToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
