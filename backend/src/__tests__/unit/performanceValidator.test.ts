import express from 'express';
import request from 'supertest';
import { validate } from '../../middleware/validation';
import { submitScoreValidation } from '../../validators/performance.validator';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/score', validate(submitScoreValidation), (_req, res) => {
    res.json({ success: true });
  });
  return app;
}

describe('submitScoreValidation', () => {
  it('allows dynamic metricScores without legacy fixed score fields', async () => {
    const response = await request(buildApp())
      .post('/score')
      .send({
        id: 'rec-e001-2026-04',
        managerComment: '本月完成情况符合预期',
        nextMonthWorkArrangement: '继续推进项目交付',
        metricScores: [
          { metricId: 'm1', metricName: '设计质量', metricCode: 'quality', weight: 50, score: 1.2, level: 'L4' },
          { metricId: 'm2', metricName: '成长改善', metricCode: 'growth', weight: 50, score: 1.0, level: 'L3' },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
  });

  it('rejects legacy fixed scores outside the 0.5-1.5 controller range', async () => {
    const response = await request(buildApp())
      .post('/score')
      .send({
        id: 'rec-e001-2026-04',
        taskCompletion: 0.4,
        initiative: 1,
        projectFeedback: 1,
        qualityImprovement: 1,
        managerComment: '本月完成情况待改善',
        nextMonthWorkArrangement: '下月重点改善设计质量',
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({ success: false });
  });
});
