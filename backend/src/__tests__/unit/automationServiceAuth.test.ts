import { Request, Response } from 'express';
import { authenticateOrAutomationService } from '../../middleware/auth';

const createResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res as unknown as Response & { status: jest.Mock; json: jest.Mock };
};

describe('authenticateOrAutomationService', () => {
  const originalToken = process.env.AUTOMATION_SERVICE_TOKEN;

  afterEach(() => {
    process.env.AUTOMATION_SERVICE_TOKEN = originalToken;
    jest.restoreAllMocks();
  });

  it('allows trusted automation calls without creating an employee login session', async () => {
    process.env.AUTOMATION_SERVICE_TOKEN = 'test-automation-token-1234567890';
    const req = {
      get: (name: string) => (name.toLowerCase() === 'x-automation-token' ? 'test-automation-token-1234567890' : undefined),
      headers: {},
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn();

    await authenticateOrAutomationService(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.user).toMatchObject({ userId: 'system-automation', id: 'system-automation', role: 'admin' });
    expect(req.userId).toBe('system-automation');
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects an invalid automation token instead of falling back to employee auth', async () => {
    process.env.AUTOMATION_SERVICE_TOKEN = 'test-automation-token-1234567890';
    const req = {
      get: (name: string) => (name.toLowerCase() === 'x-automation-token' ? 'wrong-token' : undefined),
      headers: {},
    } as unknown as Request;
    const res = createResponse();
    const next = jest.fn();

    await authenticateOrAutomationService(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      message: expect.stringContaining('自动化服务令牌'),
    }));
  });
});
