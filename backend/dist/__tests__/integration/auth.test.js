"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../../index"));
const mockData_1 = require("../fixtures/mockData");
const testHelper_1 = require("../helpers/testHelper");
describe('Auth API', () => {
    describe('POST /api/auth/login', () => {
        it('should successfully login with valid credentials', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send(mockData_1.validLoginData);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('token');
            expect(response.body.data).toHaveProperty('user');
            expect(response.body.data.user).toHaveProperty('name', '于振华');
            expect(response.body.data.user).not.toHaveProperty('password');
        });
        it('should fail with invalid username', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                username: 'wronguser',
                password: '123456',
                role: 'manager'
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message', '用户名或密码错误');
        });
        it('should fail with invalid password', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                username: '于振华',
                password: 'wrongpassword',
                role: 'manager'
            });
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
            expect(response.body).toHaveProperty('message', '用户名或密码错误');
        });
        it('should fail with missing username', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                password: '123456',
                role: 'manager'
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail with missing password', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                username: '于振华',
                role: 'manager'
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail with missing role', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({
                username: '于振华',
                password: '123456'
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail with empty credentials', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/auth/login')
                .send({});
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    it('should fail with invalid username', async () => {
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/login')
            .send({
            username: 'wronguser',
            password: 'password123',
            role: 'manager'
        });
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message', '用户名或密码错误');
    });
    it('should fail with invalid password', async () => {
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/login')
            .send({
            username: '于振华',
            password: 'wrongpassword',
            role: 'manager'
        });
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('message', '用户名或密码错误');
    });
    it('should fail with missing username', async () => {
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/login')
            .send({
            password: 'password123'
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
    });
    it('should fail with missing password', async () => {
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/login')
            .send({
            username: 'manager001'
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
    });
    it('should fail with empty credentials', async () => {
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/login')
            .send({});
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
    });
});
describe('GET /api/auth/me', () => {
    it('should return current user info with valid token', async () => {
        const token = await testHelper_1.TestHelper.getAuthToken('manager');
        const response = await (0, supertest_1.default)(index_1.default)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body.data).toHaveProperty('id');
        expect(response.body.data).toHaveProperty('name');
        expect(response.body.data).toHaveProperty('role');
        expect(response.body.data).not.toHaveProperty('password');
    });
    it('should fail without token', async () => {
        const response = await (0, supertest_1.default)(index_1.default)
            .get('/api/auth/me');
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
    });
    it('should fail with invalid token', async () => {
        const response = await (0, supertest_1.default)(index_1.default)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer invalid-token');
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
    });
});
describe('POST /api/auth/change-password', () => {
    it('should successfully change password with valid data', async () => {
        const token = await testHelper_1.TestHelper.getAuthToken('employee');
        const newPassword = testHelper_1.TestHelper.generateRandomString();
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({
            oldPassword: '123456',
            newPassword: newPassword
        });
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message', '密码修改成功');
        // Reset password so subsequent tests can still use 123456 for getAuthToken('employee')
        const tokenAfterChange = await testHelper_1.TestHelper.loginAs('周欢欢', newPassword, 'employee');
        await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/change-password')
            .set('Authorization', `Bearer ${tokenAfterChange}`)
            .send({ oldPassword: newPassword, newPassword: '123456' });
    });
    it('should fail with wrong current password', async () => {
        const token = await testHelper_1.TestHelper.getAuthToken('employee');
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({
            oldPassword: 'wrongpassword',
            newPassword: 'newpassword123'
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
    });
    it('should fail with missing old password', async () => {
        const token = await testHelper_1.TestHelper.getAuthToken('employee');
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({
            newPassword: 'newpassword123'
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
    });
    it('should fail with missing new password', async () => {
        const token = await testHelper_1.TestHelper.getAuthToken('employee');
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/change-password')
            .set('Authorization', `Bearer ${token}`)
            .send({
            oldPassword: '123456'
        });
        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('success', false);
    });
    it('should fail without authentication', async () => {
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/change-password')
            .send({
            oldPassword: '123456',
            newPassword: 'newpassword123'
        });
        expect(response.status).toBe(401);
        expect(response.body).toHaveProperty('success', false);
    });
});
//# sourceMappingURL=auth.test.js.map