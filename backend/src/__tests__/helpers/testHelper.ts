import app from '../../index';
import request from 'supertest';
import bcrypt from 'bcryptjs';

export const TestHelper = {
  app,
  
  async loginAs(username: string, password: string, role: string) {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ username, password, role });
    
    if (response.status === 200) {
      return response.body.data.token;
    }
    throw new Error(`Login failed: status=${response.status} body=${JSON.stringify(response.body)}`);
  },

  async getAuthToken(role: 'manager' | 'employee' | 'hr' = 'manager') {
    const credentials = {
      manager: { username: '于振华', password: '123456', role: 'manager' },
      employee: { username: '周欢欢', password: '123456', role: 'employee' },
      hr: { username: '林作倩', password: '123456', role: 'hr' }
    };
    return this.loginAs(credentials[role].username, credentials[role].password, credentials[role].role);
  },

  async createTestEmployee(data: any) {
    const token = await this.getAuthToken('hr');
    const response = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${token}`)
      .send(data);
    return response;
  },

  async createTestSummary(data: any) {
    const token = await this.getAuthToken('employee');
    const response = await request(app)
      .post('/api/performance/summary')
      .set('Authorization', `Bearer ${token}`)
      .send(data);
    return response;
  },

  async submitTestScore(data: any) {
    const token = await this.getAuthToken('manager');
    const response = await request(app)
      .post('/api/performance/score')
      .set('Authorization', `Bearer ${token}`)
      .send(data);
    return response;
  },

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  },

  generateRandomString(length: number = 10): string {
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
      const str = TestHelper.generateRandomString(10);
      expect(str.length).toBe(10);
    });

    it('should generate different strings', () => {
      const str1 = TestHelper.generateRandomString();
      const str2 = TestHelper.generateRandomString();
      expect(str1).not.toBe(str2);
    });
  });

  describe('hashPassword', () => {
    it('should hash password correctly', async () => {
      const password = 'test123';
      const hashed = await TestHelper.hashPassword(password);
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(20);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'test123';
      const hash1 = await TestHelper.hashPassword(password);
      const hash2 = await TestHelper.hashPassword(password);
      expect(hash1).not.toBe(hash2);
    });
  });
});
