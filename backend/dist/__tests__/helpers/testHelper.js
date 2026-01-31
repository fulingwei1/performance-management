"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestHelper = void 0;
const index_1 = __importDefault(require("../../index"));
const supertest_1 = __importDefault(require("supertest"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
exports.TestHelper = {
    app: index_1.default,
    async loginAs(username, password, role) {
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/auth/login')
            .send({ username, password, role });
        if (response.status === 200) {
            return response.body.data.token;
        }
        throw new Error('Login failed');
    },
    async getAuthToken(role = 'manager') {
        const credentials = {
            manager: { username: '于振华', password: '123456', role: 'manager' },
            employee: { username: '周欢欢', password: '123456', role: 'employee' },
            hr: { username: '林作倩', password: '123456', role: 'hr' }
        };
        return this.loginAs(credentials[role].username, credentials[role].password, credentials[role].role);
    },
    async createTestEmployee(data) {
        const token = await this.getAuthToken('hr');
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/employees')
            .set('Authorization', `Bearer ${token}`)
            .send(data);
        return response;
    },
    async createTestSummary(data) {
        const token = await this.getAuthToken('employee');
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/performance/summary')
            .set('Authorization', `Bearer ${token}`)
            .send(data);
        return response;
    },
    async submitTestScore(data) {
        const token = await this.getAuthToken('manager');
        const response = await (0, supertest_1.default)(index_1.default)
            .post('/api/performance/score')
            .set('Authorization', `Bearer ${token}`)
            .send(data);
        return response;
    },
    async hashPassword(password) {
        return bcryptjs_1.default.hash(password, 10);
    },
    generateRandomString(length = 10) {
        return Math.random().toString(36).substring(2, 2 + length);
    },
    async cleanupDatabase() {
        // 清理逻辑将在实际数据库连接时实现
        console.log('Database cleanup placeholder');
    }
};
describe('TestHelper', () => {
    describe('generateRandomString', () => {
        it('should generate string of correct length', () => {
            const str = exports.TestHelper.generateRandomString(10);
            expect(str.length).toBe(10);
        });
        it('should generate different strings', () => {
            const str1 = exports.TestHelper.generateRandomString();
            const str2 = exports.TestHelper.generateRandomString();
            expect(str1).not.toBe(str2);
        });
    });
    describe('hashPassword', () => {
        it('should hash password correctly', async () => {
            const password = 'test123';
            const hashed = await exports.TestHelper.hashPassword(password);
            expect(hashed).not.toBe(password);
            expect(hashed.length).toBeGreaterThan(20);
        });
        it('should generate different hashes for same password', async () => {
            const password = 'test123';
            const hash1 = await exports.TestHelper.hashPassword(password);
            const hash2 = await exports.TestHelper.hashPassword(password);
            expect(hash1).not.toBe(hash2);
        });
    });
});
//# sourceMappingURL=testHelper.js.map