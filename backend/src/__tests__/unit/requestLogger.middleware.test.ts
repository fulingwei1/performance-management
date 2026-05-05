import express from 'express';
import request from 'supertest';
import logger from '../../config/logger';
import { requestLogger } from '../../middleware/requestLogger';

describe('requestLogger', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs request id, response status and duration when the response finishes', async () => {
    const infoSpy = jest.spyOn(logger, 'info').mockImplementation(() => undefined as any);

    const app = express();
    app.use(requestLogger);
    app.use((req: any, _res, next) => {
      req.user = { userId: 'e001', role: 'employee' };
      next();
    });
    app.get('/api/example', (_req, res) => res.status(201).json({ success: true }));

    const response = await request(app)
      .get('/api/example')
      .set('x-request-id', 'req-from-client')
      .expect(201);

    expect(response.headers['x-request-id']).toBe('req-from-client');
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledWith(expect.objectContaining({
      requestId: 'req-from-client',
      method: 'GET',
      path: '/api/example',
      statusCode: 201,
      userId: 'e001',
    }), 'HTTP request completed');
    expect(infoSpy.mock.calls[0][0]).toHaveProperty('durationMs');
  });
});
