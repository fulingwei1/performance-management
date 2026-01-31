"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const index_1 = __importDefault(require("../../index"));
const mockData_1 = require("../fixtures/mockData");
const testHelper_1 = require("../helpers/testHelper");
describe('Performance API', () => {
    describe('GET /api/performance/my-records', () => {
        it('should return current user performance records', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('employee');
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/performance/my-records')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/performance/my-records');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    describe('GET /api/performance/team-records', () => {
        it('should return team records for manager', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/performance/team-records')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
        it('should fail for non-manager role', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('employee');
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/performance/team-records')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/performance/team-records');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    describe('GET /api/performance/month/:month', () => {
        it('should return records by month', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/performance/month/2024-01')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(Array.isArray(response.body.data)).toBe(true);
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/performance/month/2024-01');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    describe('GET /api/performance/:id', () => {
        it('should return record by id', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const createResponse = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/create-empty-record')
                .set('Authorization', `Bearer ${token}`)
                .send({
                employeeId: 'e001',
                month: '2024-01'
            });
            const recordId = createResponse.body.data.id;
            const response = await (0, supertest_1.default)(index_1.default)
                .get(`/api/performance/${recordId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('id', recordId);
        });
        it('should return 404 for non-existent record', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/performance/non-existent-id')
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .get('/api/performance/any-id');
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    describe('POST /api/performance/summary', () => {
        it('should submit work summary', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('employee');
            const summary = {
                ...mockData_1.validSummaryData
            };
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/summary')
                .set('Authorization', `Bearer ${token}`)
                .send(summary);
            expect(response.status).toBe(201);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('id');
            expect(response.body.data).toHaveProperty('status', 'submitted');
        });
        it('should fail with duplicate month submission', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('employee');
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/summary')
                .set('Authorization', `Bearer ${token}`)
                .send(mockData_1.validSummaryData);
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail for non-employee role', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/summary')
                .set('Authorization', `Bearer ${token}`)
                .send(mockData_1.validSummaryData);
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail with invalid score values', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('employee');
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/summary')
                .set('Authorization', `Bearer ${token}`)
                .send({
                month: '2024-04',
                summary: '测试总结',
                taskCompletion: 2.0,
                initiative: 1.0,
                projectFeedback: 1.0,
                qualityImprovement: 1.0
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/summary')
                .send(mockData_1.validSummaryData);
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    describe('POST /api/performance/score', () => {
        // 在评分测试前，先创建空记录
        beforeAll(async () => {
            const managerToken = await testHelper_1.TestHelper.getAuthToken('manager');
            await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/create-empty-record')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                employeeId: 'e034',
                month: '2024-03'
            });
        });
        it('should submit score for employee', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/score')
                .set('Authorization', `Bearer ${token}`)
                .send(mockData_1.validScoreData);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('totalScore');
            expect(response.body.data).toHaveProperty('level');
            expect(['L1', 'L2', 'L3', 'L4', 'L5']).toContain(response.body.data.level);
        });
        it('should fail with invalid score values', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/score')
                .set('Authorization', `Bearer ${token}`)
                .send({
                id: 'rec-e034-2024-03',
                taskCompletion: 2.0,
                initiative: 1.0,
                projectFeedback: 1.0,
                qualityImprovement: 1.0,
                managerComment: '评语',
                nextMonthWorkArrangement: '工作安排'
            });
            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail for non-manager role', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('employee');
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/score')
                .set('Authorization', `Bearer ${token}`)
                .send(mockData_1.validScoreData);
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/score')
                .send(mockData_1.validScoreData);
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should calculate correct total score and level', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/score')
                .set('Authorization', `Bearer ${token}`)
                .send({
                id: 'rec-e034-2024-03',
                taskCompletion: 1.5,
                initiative: 1.5,
                projectFeedback: 1.5,
                qualityImprovement: 1.5,
                managerComment: '表现优秀',
                nextMonthWorkArrangement: '继续当前工作'
            });
            expect(response.status).toBe(200);
            const expectedScore = 1.5 * 0.4 + 1.5 * 0.3 + 1.5 * 0.2 + 1.5 * 0.1;
            expect(response.body.data.totalScore).toBeCloseTo(expectedScore, 2);
            expect(response.body.data.level).toBe('L5');
        });
    });
    describe('DELETE /api/performance/:id', () => {
        // 先创建一个用于删除测试的记录
        let deleteTestRecordId;
        beforeAll(async () => {
            const managerToken = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/create-empty-record')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                employeeId: 'e034',
                month: '2024-04'
            });
            deleteTestRecordId = response.body.data.id;
        });
        it('should delete record with HR role', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('hr');
            const response = await (0, supertest_1.default)(index_1.default)
                .delete(`/api/performance/${deleteTestRecordId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
        });
        it('should fail with non-HR role', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .delete(`/api/performance/${deleteTestRecordId}`)
                .set('Authorization', `Bearer ${token}`);
            expect(response.status).toBe(403);
            expect(response.body).toHaveProperty('success', false);
        });
        it('should fail without authentication', async () => {
            const response = await (0, supertest_1.default)(index_1.default)
                .delete(`/api/performance/${deleteTestRecordId}`);
            expect(response.status).toBe(401);
            expect(response.body).toHaveProperty('success', false);
        });
    });
    describe('Score Calculation', () => {
        // 在评分计算测试前创建记录
        beforeAll(async () => {
            const managerToken = await testHelper_1.TestHelper.getAuthToken('manager');
            // 创建空记录供测试使用（如果不存在）
            await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/create-empty-record')
                .set('Authorization', `Bearer ${managerToken}`)
                .send({
                employeeId: 'e034',
                month: '2024-03'
            });
        });
        it('should correctly calculate L5 score', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/score')
                .set('Authorization', `Bearer ${token}`)
                .send({
                id: 'rec-e034-2024-03',
                taskCompletion: 1.5,
                initiative: 1.5,
                projectFeedback: 1.5,
                qualityImprovement: 1.5,
                managerComment: '优秀表现',
                nextMonthWorkArrangement: '继续当前项目'
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('level', 'L5');
            expect(response.body.data.totalScore).toBeGreaterThanOrEqual(1.4);
        });
        it('should correctly calculate L3 score', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/score')
                .set('Authorization', `Bearer ${token}`)
                .send({
                id: 'rec-e034-2024-03',
                taskCompletion: 1.0,
                initiative: 1.0,
                projectFeedback: 1.0,
                qualityImprovement: 1.0,
                managerComment: '良好表现',
                nextMonthWorkArrangement: '继续当前项目'
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('level', 'L3');
            expect(response.body.data.totalScore).toBe(1.0);
        });
        it('should correctly calculate L1 score', async () => {
            const token = await testHelper_1.TestHelper.getAuthToken('manager');
            const response = await (0, supertest_1.default)(index_1.default)
                .post('/api/performance/score')
                .set('Authorization', `Bearer ${token}`)
                .send({
                id: 'rec-e034-2024-03',
                taskCompletion: 0.5,
                initiative: 0.5,
                projectFeedback: 0.5,
                qualityImprovement: 0.5,
                managerComment: '需要改进',
                nextMonthWorkArrangement: '加强培训'
            });
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('success', true);
            expect(response.body.data).toHaveProperty('level', 'L1');
            expect(response.body.data.totalScore).toBeLessThan(0.65);
        });
    });
});
//# sourceMappingURL=performance.test.js.map