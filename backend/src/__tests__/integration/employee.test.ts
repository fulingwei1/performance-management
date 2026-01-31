import request from 'supertest';
import app from '../../index';
import { validEmployeeData } from '../fixtures/mockData';
import { TestHelper } from '../helpers/testHelper';

describe('Employee API', () => {
  describe('GET /api/employees', () => {
    it('should return all employees for authenticated user', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
        .get('/api/employees')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/employees');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/employees/managers', () => {
    it('should return all managers', async () => {
      const token = await TestHelper.getAuthToken('employee');

      const response = await request(app)
        .get('/api/employees/managers')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((manager: any) => {
        expect(manager.role).toBe('manager');
      });
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/employees/managers');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/employees/subordinates', () => {
    it('should return subordinates for manager', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
        .get('/api/employees/subordinates')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail for non-manager role', async () => {
      const token = await TestHelper.getAuthToken('employee');

      const response = await request(app)
        .get('/api/employees/subordinates')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/employees/subordinates');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/employees/role/:role', () => {
    it('should return employees by role', async () => {
      const token = await TestHelper.getAuthToken('hr');

      const response = await request(app)
        .get('/api/employees/role/employee')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
      if (response.body.data.length > 0) {
        response.body.data.forEach((employee: any) => {
          expect(employee.role).toBe('employee');
        });
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/employees/role/employee');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/employees/:id', () => {
    it('should return employee by id', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
        .get('/api/employees/e001')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', 'e001');
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent employee', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
        .get('/api/employees/9999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/employees/e001');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/employees', () => {
    it('should create employee with HR role', async () => {
      const token = await TestHelper.getAuthToken('hr');
      const newEmployee = {
        ...validEmployeeData,
        id: `emp${TestHelper.generateRandomString(8)}`
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${token}`)
        .send(newEmployee);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', newEmployee.id);
      expect(response.body.data).toHaveProperty('name', newEmployee.name);
    });

    it('should fail with duplicate id', async () => {
      const token = await TestHelper.getAuthToken('hr');
      // 使用已存在的ID
      const duplicateEmployee = {
        ...validEmployeeData,
        id: 'e001'
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${token}`)
        .send(duplicateEmployee);

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail with non-HR role', async () => {
      const token = await TestHelper.getAuthToken('manager');
      const newEmployee = {
        ...validEmployeeData,
        id: `emp${TestHelper.generateRandomString(8)}`
      };

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${token}`)
        .send(newEmployee);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail with missing required fields', async () => {
      const token = await TestHelper.getAuthToken('hr');

      const response = await request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: 'test',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send(validEmployeeData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('PUT /api/employees/:id', () => {
    it('should update employee with HR role', async () => {
      const token = await TestHelper.getAuthToken('hr');

      const response = await request(app)
        .put('/api/employees/e001')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '更新后的员工名',
          level: 'senior'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', '更新后的员工名');
    });

    it('should fail with non-HR role', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
        .put('/api/employees/e001')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '更新后的员工名'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .put('/api/employees/e001')
        .send({
          name: '更新后的员工名'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('DELETE /api/employees/:id', () => {
    it('should delete employee with HR role', async () => {
      const token = await TestHelper.getAuthToken('hr');
      
      // First create a test employee
      const createResponse = await TestHelper.createTestEmployee({
        id: `delete${TestHelper.generateRandomString(6)}`,
        password: 'password123',
        name: '待删除员工',
        role: 'employee',
        department: '工程技术中心',
        subDepartment: '测试部',
        level: 'intermediate'
      });

      expect(createResponse.status).toBe(201);
      const employeeId = createResponse.body.data.id;

      const response = await request(app)
        .delete(`/api/employees/${employeeId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should fail with non-HR role', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
        .delete('/api/employees/e001')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete('/api/employees/2');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });
});
