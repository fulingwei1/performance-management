"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../../index"));
const mockData_1 = require("../fixtures/mockData");
const testHelper_1 = require("../helpers/testHelper");
describe('Employee API', () => {
    describe('GET /api/employees', () => {
        it('should return all employees for authenticated user', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/employees')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(Array.isArray(response.body.data)).toBe(true);
            expect(response.body.data.length).toBeGreaterThan(0);
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/employees');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    describe('GET /api/employees/managers', () => {
        it('should return all managers', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('employee');
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/employees/managers')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(Array.isArray(response.body.data)).toBe(true);
            response.body.data.forEach((manager) => {
                expect(manager.role).toBe('manager');
            });
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/employees/managers');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    describe('GET /api/employees/subordinates', () => {
        it('should return subordinates for manager', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/employees/subordinates')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
        it('should fail for non-manager role', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('employee');
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/employees/subordinates')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/employees/subordinates');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    describe('GET /api/employees/role/:role', () => {
        it('should return employees by role', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('hr');
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/employees/role/employee')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(Array.isArray(response.body.data)).toBe(true);
            if (response.body.data.length > 0) {
                response.body.data.forEach((employee) => {
                    expect(employee.role).toBe('employee');
                });
            }
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/employees/role/employee');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    describe('GET /api/employees/:id', () => {
        it('should return employee by id', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/employees/e001')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('id', 'e001');
            expect(response.body.data).not.toHaveProperty('password');
        });
        it('should return 404 for non-existent employee', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/employees/9999')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/employees/e001');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    describe('POST /api/employees', () => {
        it('should create employee with HR role', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('hr');
            const newEmployee = {
                ...mockData_1.validEmployeeData,
                id: `emp${testHelper_1.TestHelper.generateRandomString(8)}`
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/employees')
                .set('Authorization', `Bearer ${token}`)
                .send(newEmployee);
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('id', newEmployee.id);
            expect(response.body.data).toHaveProperty('name', newEmployee.name);
        });
        it('should fail with duplicate id', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('hr');
            // 使用已存在的ID
            const duplicateEmployee = {
                ...mockData_1.validEmployeeData,
                id: 'e001'
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/employees')
                .set('Authorization', `Bearer ${token}`)
                .send(duplicateEmployee);
            expect(response.status).toBe(409);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail with non-HR role', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const newEmployee = {
                ...mockData_1.validEmployeeData,
                id: `emp${testHelper_1.TestHelper.generateRandomString(8)}`
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/employees')
                .set('Authorization', `Bearer ${token}`)
                .send(newEmployee);
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail with missing required fields', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('hr');
            const response = await (0, supertest_1.default)(index_1.default)
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
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/employees')
                .send(mockData_1.validEmployeeData);
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    describe('PUT /api/employees/:id', () => {
        it('should update employee with HR role', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('hr');
            const response = await (0, supertest_1.default)(index_1.default)
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
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .put('/api/employees/e001')
                .set('Authorization', `Bearer ${token}`)
                .send({
                name: '更新后的员工名'
            });
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
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
            const token = await testHelper_1.TestHelper.getAuthToken('hr');
            // First create a test employee
            const createResponse = await testHelper_1.TestHelper.createTestEmployee({
                id: `delete${testHelper_1.TestHelper.generateRandomString(6)}`,
                password: 'password123',
                name: '待删除员工',
                role: 'employee',
                department: '工程技术中心',
                subDepartment: '测试部',
                level: 'intermediate'
            });
            expect(createResponse.status).toBe(201);
            const employeeId = createResponse.body.data.id;
            const response = await (0, supertest_1.default)(index_1.default)
                .delete(`/api/employees/${employeeId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
        it('should fail with non-HR role', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .delete('/api/employees/e001')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .delete('/api/employees/2');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
});
//# sourceMappingURL=employee.test.js.map