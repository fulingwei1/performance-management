import request from 'supertest';
import app from '../../index';
import { validSummaryData, validScoreData } from '../fixtures/mockData';
import { TestHelper } from '../helpers/testHelper';
import { TodoModel } from '../../models/todo.model';
import { PerformanceModel } from '../../models/performance.model';

const getExpectedUpdatedAt = async (recordId: string): Promise<string | undefined> => {
  const record = await PerformanceModel.findById(recordId);
  return record?.updatedAt ? new Date(record.updatedAt).toISOString() : undefined;
};

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

      const draftResponse = await request(app)
        .post('/api/performance/create-empty-record')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          employeeId: 'e034',
          month
        });
      expect(draftResponse.status).toBe(200);
      expect(draftResponse.body.data).toHaveProperty('status', 'draft');

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
          employeeId: 'e034',
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

  describe('POST /api/performance/nonparticipation-report', () => {
    it('allows a manager to report a subordinate as departed and remove the monthly task', async () => {
      const managerToken = await TestHelper.getAuthToken('manager');
      const month = '2024-10';

      const createResponse = await request(app)
        .post('/api/performance/create-empty-record')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          employeeId: 'e002',
          month
        });

      expect(createResponse.status).toBe(200);
      expect(createResponse.body.data).toHaveProperty('employeeId', 'e002');

      const response = await request(app)
        .post('/api/performance/nonparticipation-report')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          employeeId: 'e002',
          month,
          reason: '员工已于考核期间离职，不再提交总结'
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          employeeId: 'e002',
          month,
          recordDeleted: true,
          assessmentExcluded: true,
        },
      });

      await expect(PerformanceModel.findByEmployeeIdAndMonth('e002', month)).resolves.toBeNull();
    });

    it('rejects non-managers reporting employees outside their responsibility scope', async () => {
      const employeeToken = await TestHelper.getAuthToken('employee');

      const response = await request(app)
        .post('/api/performance/nonparticipation-report')
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          employeeId: 'e002',
          month: '2024-10',
          reason: '尝试越权反馈'
        });

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty('success', false);
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

  describe('GET /api/performance/improvement-suggestions', () => {
    it('should ignore placeholder no-op suggestions such as 无', async () => {
      const token = await TestHelper.getAuthToken('hr');
      const month = '2099-08';

      await PerformanceModel.saveSummary({
        id: `rec-e034-${month}`,
        employeeId: 'e034',
        assessorId: 'm011',
        month,
        selfSummary: '完成本月测试任务',
        nextMonthPlan: '继续完成下月测试计划',
        improvementSuggestion: '无',
        suggestionAnonymous: false,
        groupType: 'low',
      });
      await PerformanceModel.saveSummary({
        id: `rec-e002-${month}`,
        employeeId: 'e002',
        assessorId: 'm011',
        month,
        selfSummary: '完成本月测试任务',
        nextMonthPlan: '继续完成下月测试计划',
        improvementSuggestion: '建议统一设备点检表，减少重复填写。',
        suggestionAnonymous: false,
        groupType: 'low',
      });

      const response = await request(app)
        .get(`/api/performance/improvement-suggestions?month=${month}&scope=all`)
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          totalCount: 1,
          namedCount: 1,
          anonymousCount: 0,
        },
      });
      expect(response.body.data.suggestions).toHaveLength(1);
      expect(response.body.data.suggestions[0].suggestion).toBe('建议统一设备点检表，减少重复填写。');
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
        link: `/manager/dashboard?month=${month}`,
      });
    });

    it('should reject summary when the monthly task has not been generated', async () => {
      const token = await TestHelper.getAuthToken('employee');

      const response = await request(app)
        .post('/api/performance/summary')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...validSummaryData,
          month: '2024-10'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
    });

    it('should submit work summary', async () => {
      const managerToken = await TestHelper.getAuthToken('manager');
      const token = await TestHelper.getAuthToken('employee');
      const summary = {
        ...validSummaryData
      };

      const draftResponse = await request(app)
        .post('/api/performance/create-empty-record')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          employeeId: 'e034',
          month: summary.month
        });
      expect(draftResponse.status).toBe(200);

      const response = await request(app)
        .post('/api/performance/summary')
        .set('Authorization', `Bearer ${token}`)
        .send(summary);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('status', 'submitted');
    });

    it('should store placeholder no-op suggestion as empty text', async () => {
      const token = await TestHelper.getAuthToken('employee');
      const month = '2099-09';

      await PerformanceModel.saveSummary({
        id: `rec-e034-${month}`,
        employeeId: 'e034',
        assessorId: 'm011',
        month,
        selfSummary: '',
        nextMonthPlan: '',
        groupType: 'low',
      });

      const response = await request(app)
        .post('/api/performance/summary')
        .set('Authorization', `Bearer ${token}`)
        .send({
          month,
          selfSummary: '补充上月工作总结',
          nextMonthPlan: '继续完成重点任务',
          improvementSuggestion: '无。',
          suggestionAnonymous: false,
        });

      expect(response.status).toBe(201);
      expect(response.body.data.improvementSuggestion).toBe('');
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

    it('should fail when the user has no valid upper assessor relationship', async () => {
      const token = await TestHelper.getAuthToken('manager');

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
        link: '/manager/dashboard?month=2024-03',
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

    it('should allow manager to score a draft record when employee has not submitted summary', async () => {
      const token = await TestHelper.getAuthToken('manager');
      const month = '2024-08';

      const draftResponse = await request(app)
        .post('/api/performance/create-empty-record')
        .set('Authorization', `Bearer ${token}`)
        .send({
          employeeId: 'e034',
          month
        });

      expect(draftResponse.status).toBe(200);
      expect(draftResponse.body.data).toMatchObject({
        status: 'draft',
        selfSummary: '',
        nextMonthPlan: ''
      });

      const response = await request(app)
        .post('/api/performance/score')
        .set('Authorization', `Bearer ${token}`)
        .send({
          ...validScoreData,
          id: draftResponse.body.data.id,
          managerComment: '员工本月未提交总结，经理根据实际交付情况完成评分。',
          nextMonthWorkArrangement: '下月继续跟进重点项目，并提醒员工及时提交总结。'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toMatchObject({
        id: draftResponse.body.data.id,
        status: 'completed',
        selfSummary: '',
        nextMonthPlan: ''
      });
      expect(response.body.data.totalScore).toBeGreaterThan(0);
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
      const expectedUpdatedAt = await getExpectedUpdatedAt('rec-e034-2024-03');

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
          scoreEvidence: '连续完成关键交付并主动支援团队解决问题',
          expectedUpdatedAt
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
      const expectedUpdatedAt = await getExpectedUpdatedAt('rec-e034-2024-03');

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
          scoreEvidence: '承担核心项目并提前完成交付，客户反馈优秀',
          expectedUpdatedAt
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('level', 'L5');
      expect(response.body.data.totalScore).toBeGreaterThanOrEqual(1.4);
    });

    it('should correctly calculate L3 score', async () => {
      const token = await TestHelper.getAuthToken('manager');
      const expectedUpdatedAt = await getExpectedUpdatedAt('rec-e034-2024-03');

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
          nextMonthWorkArrangement: '继续当前项目',
          expectedUpdatedAt
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('level', 'L3');
      expect(response.body.data.totalScore).toBe(1.0);
    });

    it('should correctly calculate L1 score', async () => {
      const token = await TestHelper.getAuthToken('manager');
      const expectedUpdatedAt = await getExpectedUpdatedAt('rec-e034-2024-03');

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
          scoreEvidence: '多次延期且质量问题反复出现，需要重点辅导',
          expectedUpdatedAt
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('level', 'L1');
      expect(response.body.data.totalScore).toBeLessThan(0.65);
    });
  });
});
