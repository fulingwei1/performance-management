import express from 'express';
import request from 'supertest';
import { auditLogMiddleware } from '../../middleware/auditLog';
import { AuditLogModel } from '../../models/auditLog.model';

describe('auditLogMiddleware', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  it('redacts sensitive request body fields before writing audit logs', async () => {
    process.env.NODE_ENV = 'development';
    const createSpy = jest.spyOn(AuditLogModel, 'create').mockResolvedValue(undefined);

    const app = express();
    app.use(express.json());
    app.use((req: any, _res, next) => {
      req.user = { userId: 'admin001', role: 'admin' };
      next();
    });
    app.use(auditLogMiddleware);
    app.post('/api/employees', (_req, res) => res.json({ success: true }));

    await request(app)
      .post('/api/employees')
      .send({
        name: '测试员工',
        password: 'Secret-123456',
        idCardLast6: '123456',
        profile: {
          oldPassword: 'Old-123456',
          nested: {
            newPassword: 'New-123456',
            token: 'token-value',
            safeField: '可以记录',
          },
        },
      })
      .expect(200);

    await new Promise(resolve => setImmediate(resolve));

    expect(createSpy).toHaveBeenCalledTimes(1);
    const auditLog = createSpy.mock.calls[0][0];
    expect(auditLog.changes).toEqual({
      body: {
        name: '测试员工',
        password: '[REDACTED]',
        idCardLast6: '[REDACTED]',
        profile: {
          oldPassword: '[REDACTED]',
          nested: {
            newPassword: '[REDACTED]',
            token: '[REDACTED]',
            safeField: '可以记录',
          },
        },
      },
    });
    expect(JSON.stringify(auditLog.changes)).not.toContain('Secret-123456');
    expect(JSON.stringify(auditLog.changes)).not.toContain('123456');
    expect(JSON.stringify(auditLog.changes)).not.toContain('token-value');
  });
});
