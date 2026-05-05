import request from 'supertest';
import app from '../../index';
import { validSummaryData, validScoreData } from '../fixtures/mockData';
import { TestHelper } from '../helpers/testHelper';
import { TodoModel } from '../../models/todo.model';

describe('Performance API', () => {
  describe('GET /api/performance/my-records', () => {
    it('should return current user performance records', async () => {
      const token = await TestHelper.getAuthToken('employee');

      const response = await request(app)
        .get('/api/performance/my-records')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/performance/my-records');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/performance/team-records', () => {
    it('should return team records for manager', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
        .get('/api/performance/team-records')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail for non-manager role', async () => {
      const token = await TestHelper.getAuthToken('employee');

      const response = await request(app)
        .get('/api/performance/team-records')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/performance/team-records');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('GET /api/performance/month/:month', () => {
    it('should return records by month', async () => {
      const token = await TestHelper.getAuthToken('hr');

      const response = await request(app)
        .get('/api/performance/month/2024-01')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/performance/month/2024-01');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/performance/create-empty-record', () => {
    it('should not overwrite an existing submitted summary when creating empty record', async () => {
      const employeeToken = await TestHelper.getAuthToken('employee');
      const managerToken = await TestHelper.getAuthToken('manager');
      const month = '2024-11';

      const summaryResponse = await request(app)
        .post('/api/performance/summary')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          month,
          selfSummary: '这是一条不能被空记录覆盖的工作总结',
          nextMonthPlan: '下月继续推进重点任务'
        });

      expect(summaryResponse.status).toBe(201);
      expect(summaryResponse.body.data).toHaveProperty('status', 'submitted');

      const createResponse = await request(app)
        .post('/api/performance/create-empty-record')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          employeeId: summaryResponse.body.data.employeeId,
          month
        });

      expect(createResponse.status).toBe(200);
      expect(createResponse.body).toHaveProperty('success', true);
      expect(createResponse.body.data).toMatchObject({
        id: summaryResponse.body.data.id,
        selfSummary: '这是一条不能被空记录覆盖的工作总结',
        nextMonthPlan: '下月继续推进重点任务',
        status: 'submitted'
      });
    });
  });

  describe('GET /api/performance/:id', () => {
    it('should return record by id', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const createResponse = await request(app)
        .post('/api/performance/create-empty-record')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employeeId: 'e034',
          month: '2024-01'
        });

      const recordId = createResponse.body.data.id;

      const response = await request(app)
        .get(`/api/performance/${recordId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id', recordId);
    });

    it('should return 404 for non-existent record', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
        .get('/api/performance/non-existent-id')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/performance/any-id');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/performance/summary', () => {
    it('should submit summary into an existing generated draft task', async () => {
      const managerToken = await TestHelper.getAuthToken('manager');
      const employeeToken = await TestHelper.getAuthToken('employee');
      const month = '2024-12';

      const createResponse = await request(app)
        .post('/api/performance/create-empty-record')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ employeeId: 'e034', month });

      expect(createResponse.status).toBe(200);
      expect(createResponse.body.data).toHaveProperty('status', 'draft');

      const workSummaryTodo = await TodoModel.create({
        employeeId: 'e034',
        type: 'work_summary',
        title: `提交${month}月度工作总结`,
        dueDate: new Date('2025-01-07T00:00:00+08:00'),
        link: `/employee/summary?month=${month}`,
        relatedId: TodoModel.performanceSummaryRelatedId(month),
      });

      const response = await request(app)
        .post('/api/performance/summary')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          month,
          selfSummary: '补充上月工作总结',
          nextMonthPlan: '继续完成重点任务'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toMatchObject({
        id: createResponse.body.data.id,
        selfSummary: '补充上月工作总结',
        nextMonthPlan: '继续完成重点任务',
        status: 'submitted'
      });

      await expect(TodoModel.findById(workSummaryTodo.id)).resolves.toMatchObject({
        status: 'completed',
      });
      await expect(TodoModel.findExisting(
        'm011',
        'performance_review',
        TodoModel.performanceReviewRelatedId(createResponse.body.data.id),
      )).resolves.toMatchObject({
        employeeId: 'm011',
        type: 'performance_review',
        status: 'pending',
        link: `/manager/scoring?month=${month}`,
      });
    });

    it('should submit work summary', async () => {
      const token = await TestHelper.getAuthToken('employee');
      const summary = {
        ...validSummaryData
      };

      const response = await request(app)
        .post('/api/performance/summary')
        .set('Authorization', `Bearer ${token}`)
        .send(summary);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('status', 'submitted');
    });

    it('should fail with duplicate month submission', async () => {
      const token = await TestHelper.getAuthToken('employee');

      const response = await request(app)
        .post('/api/performance/summary')
        .set('Authorization', `Bearer ${token}`)
        .send(validSummaryData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail for HR role', async () => {
      const token = await TestHelper.getAuthToken('hr');

      const response = await request(app)
        .post('/api/performance/summary')
        .set('Authorization', `Bearer ${token}`)
        .send(validSummaryData);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail with invalid month format', async () => {
      const token = await TestHelper.getAuthToken('employee');

      const response = await request(app)
        .post('/api/performance/summary')
        .set('Authorization', `Bearer ${token}`)
        .send({
          month: '2024-4',
          selfSummary: '测试总结',
          nextMonthPlan: '测试计划'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/performance/summary')
        .send(validSummaryData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('POST /api/performance/score', () => {
    // 在评分测试前，先创建空记录
    beforeAll(async () => {
      const managerToken = await TestHelper.getAuthToken('manager');
      await request(app)
        .post('/api/performance/create-empty-record')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          employeeId: 'e034',
          month: '2024-03'
        });
    });

    it('should submit score for employee', async () => {
      const token = await TestHelper.getAuthToken('manager');
      const reviewRelatedId = TodoModel.performanceReviewRelatedId(validScoreData.id);
      const existingReviewTodo = await TodoModel.findExisting('m011', 'performance_review', reviewRelatedId);
      const reviewTodo = existingReviewTodo || await TodoModel.create({
        employeeId: 'm011',
        type: 'performance_review',
        title: '评分周欢欢2024-03月绩效',
        link: '/manager/scoring?month=2024-03',
        relatedId: reviewRelatedId,
      });
      const workSummaryTodo = await TodoModel.create({
        employeeId: 'e034',
        type: 'work_summary',
        title: '提交2024-03月度工作总结',
        link: '/employee/summary?month=2024-03',
        relatedId: TodoModel.performanceSummaryRelatedId('2024-03'),
      });

      const response = await request(app)
        .post('/api/performance/score')
        .set('Authorization', `Bearer ${token}`)
        .send(validScoreData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalScore');
      expect(response.body.data).toHaveProperty('level');
      expect(['L1', 'L2', 'L3', 'L4', 'L5']).toContain(response.body.data.level);
      await expect(TodoModel.findById(reviewTodo.id)).resolves.toMatchObject({
        status: 'completed',
      });
      await expect(TodoModel.findById(workSummaryTodo.id)).resolves.toMatchObject({
        status: 'completed',
      });
    });

    it('should fail with invalid score values', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
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
      const token = await TestHelper.getAuthToken('employee');

      const response = await request(app)
        .post('/api/performance/score')
        .set('Authorization', `Bearer ${token}`)
        .send(validScoreData);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/performance/score')
        .send(validScoreData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should calculate correct total score and level', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
        .post('/api/performance/score')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: 'rec-e034-2024-03',
          taskCompletion: 1.5,
          initiative: 1.5,
          projectFeedback: 1.5,
          qualityImprovement: 1.5,
          managerComment: '表现优秀',
          nextMonthWorkArrangement: '继续当前工作',
          scoreEvidence: '连续完成关键交付并主动支援团队解决问题'
        });

      expect(response.status).toBe(200);
      const expectedScore = 1.5 * 0.4 + 1.5 * 0.3 + 1.5 * 0.2 + 1.5 * 0.1;
      expect(response.body.data.totalScore).toBeCloseTo(expectedScore, 2);
      expect(response.body.data.level).toBe('L5');
    });
  });

  describe('DELETE /api/performance/:id', () => {
    // 先创建一个用于删除测试的记录
    let deleteTestRecordId: string;
    
    beforeAll(async () => {
      const managerToken = await TestHelper.getAuthToken('manager');
      const response = await request(app)
        .post('/api/performance/create-empty-record')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          employeeId: 'e034',
          month: '2024-04'
        });
      deleteTestRecordId = response.body.data.id;
    });

    it('should delete record with HR role', async () => {
      const token = await TestHelper.getAuthToken('hr');

      const response = await request(app)
        .delete(`/api/performance/${deleteTestRecordId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
    });

    it('should fail with non-HR role', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
        .delete(`/api/performance/${deleteTestRecordId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .delete(`/api/performance/${deleteTestRecordId}`);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('success', false);
    });
  });

  describe('Score Calculation', () => {
    // 在评分计算测试前创建记录
    beforeAll(async () => {
      const managerToken = await TestHelper.getAuthToken('manager');
      
      // 创建空记录供测试使用（如果不存在）
      await request(app)
        .post('/api/performance/create-empty-record')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          employeeId: 'e034',
          month: '2024-03'
        });
    });

    it('should correctly calculate L5 score', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
        .post('/api/performance/score')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: 'rec-e034-2024-03',
          taskCompletion: 1.5,
          initiative: 1.5,
          projectFeedback: 1.5,
          qualityImprovement: 1.5,
          managerComment: '优秀表现',
          nextMonthWorkArrangement: '继续当前项目',
          scoreEvidence: '承担核心项目并提前完成交付，客户反馈优秀'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('level', 'L5');
      expect(response.body.data.totalScore).toBeGreaterThanOrEqual(1.4);
    });

    it('should correctly calculate L3 score', async () => {
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
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
      const token = await TestHelper.getAuthToken('manager');

      const response = await request(app)
        .post('/api/performance/score')
        .set('Authorization', `Bearer ${token}`)
        .send({
          id: 'rec-e034-2024-03',
          taskCompletion: 0.5,
          initiative: 0.5,
          projectFeedback: 0.5,
          qualityImprovement: 0.5,
          managerComment: '需要改进',
          nextMonthWorkArrangement: '加强培训',
          scoreEvidence: '多次延期且质量问题反复出现，需要重点辅导'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('level', 'L1');
      expect(response.body.data.totalScore).toBeLessThan(0.65);
    });
  });
});
