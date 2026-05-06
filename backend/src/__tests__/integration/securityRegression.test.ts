import request from 'supertest';
import app from '../../index';
import { TestHelper } from '../helpers/testHelper';
import { PerformanceModel } from '../../models/performance.model';
import { AssessmentPublicationModel } from '../../models/assessmentPublication.model';
import { memoryStore } from '../../config/database';

describe('Security regression API checks', () => {
  it('returns 403 instead of 500 for disallowed CORS origins', async () => {
    const response = await request(app)
      .get('/api/health')
      .set('Origin', 'http://evil-site.com');

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      success: false,
      message: 'Not allowed by CORS',
      error: 'Not allowed by CORS',
    });
  });

  it('blocks ordinary employees from reading another employee analytics trend', async () => {
    const token = await TestHelper.getAuthToken('employee');

    const response = await request(app)
      .get('/api/analytics/performance-trend?employeeId=m011')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('does not crash when deleting monthly performance records without a body', async () => {
    const token = await TestHelper.getAuthToken('hr');

    const response = await request(app)
      .delete('/api/performance/month/2026-01')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      message: '请填写确认信息',
      error: '请填写确认信息',
    });
  });

  it('does not overwrite the existing login password when HR updates idCardLast6', async () => {
    const hrToken = await TestHelper.getAuthToken('hr');

    const updateResponse = await request(app)
      .put('/api/employees/e001')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ idCardLast6: '999999' });

    expect(updateResponse.status).toBe(200);

    const loginWithOldPassword = await request(app)
      .post('/api/auth/login')
      .send({ username: '姚洪', password: '123456' });

    expect(loginWithOldPassword.status).toBe(200);
    expect(loginWithOldPassword.body.success).toBe(true);
  });

  it('returns explicit reset-password metadata without exposing the password', async () => {
    const hrToken = await TestHelper.getAuthToken('hr');

    const response = await request(app)
      .put('/api/employees/e002/reset-password')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ idCardLast6: '261515' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      data: {
        id: 'e002',
        mustChangePassword: false,
        hasIdCardLast6: true,
        loginMethod: 'idCardLast6',
        temporaryPassword: '身份证后六位',
      },
    });
    expect(JSON.stringify(response.body)).not.toContain('261515');
  });

  it('masks employee score data until the monthly result is published', async () => {
    const month = '2099-01';
    const recordId = `rec-e034-${month}`;
    await AssessmentPublicationModel.unpublish(month);
    await PerformanceModel.saveSummary({
      id: recordId,
      employeeId: 'e034',
      assessorId: 'm011',
      month,
      selfSummary: '完成本月测试任务',
      nextMonthPlan: '继续完成下月测试计划',
      groupType: 'low',
    });
    await PerformanceModel.submitScore({
      id: recordId,
      taskCompletion: 1.2,
      initiative: 1.1,
      projectFeedback: 1.0,
      qualityImprovement: 1.0,
      totalScore: 1.1,
      level: 'L3',
      managerComment: '整体表现稳定',
      nextMonthWorkArrangement: '继续跟进测试任务',
    });
    await PerformanceModel.saveSummary({
      id: `rec-e002-${month}`,
      employeeId: 'e002',
      assessorId: 'm011',
      month,
      selfSummary: '同部门基准样本',
      nextMonthPlan: '继续测试',
      groupType: 'low',
    });
    await PerformanceModel.submitScore({
      id: `rec-e002-${month}`,
      taskCompletion: 1.3,
      initiative: 1.3,
      projectFeedback: 1.3,
      qualityImprovement: 1.3,
      totalScore: 1.3,
      level: 'L2',
      managerComment: '同部门表现较好',
      nextMonthWorkArrangement: '继续跟进测试任务',
    });
    await PerformanceModel.saveSummary({
      id: `rec-e007-${month}`,
      employeeId: 'e007',
      assessorId: 'gm001',
      month,
      selfSummary: '其他部门基准样本',
      nextMonthPlan: '继续生产支持',
      groupType: 'low',
    });
    await PerformanceModel.submitScore({
      id: `rec-e007-${month}`,
      taskCompletion: 0.9,
      initiative: 0.9,
      projectFeedback: 0.9,
      qualityImprovement: 0.9,
      totalScore: 0.9,
      level: 'L4',
      managerComment: '其他部门样本',
      nextMonthWorkArrangement: '继续生产支持',
    });

    const employeeToken = await TestHelper.getAuthToken('employee');
    const hiddenResponse = await request(app)
      .get(`/api/performance/my-record/${month}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(hiddenResponse.status).toBe(200);
    expect(hiddenResponse.body.data).toMatchObject({
      employeeId: 'e034',
      month,
      totalScore: null,
      normalizedScore: null,
      companyAverageScore: null,
      departmentAverageScore: null,
      managerComment: '',
      isPublished: false,
    });

    await AssessmentPublicationModel.publish(month, 'hr001');

    const publishedResponse = await request(app)
      .get(`/api/performance/my-record/${month}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(publishedResponse.status).toBe(200);
    expect(publishedResponse.body.data).toMatchObject({
      employeeId: 'e034',
      month,
      totalScore: 1.1,
      companyAverageScore: 1.1,
      companyScoredCount: 3,
      departmentAverageScore: 1.2,
      departmentScoredCount: 2,
      managerComment: '整体表现稳定',
      isPublished: true,
    });

    await AssessmentPublicationModel.unpublish(month);

    const unpublishedAgainResponse = await request(app)
      .get(`/api/performance/my-record/${month}`)
      .set('Authorization', `Bearer ${employeeToken}`);

    expect(unpublishedAgainResponse.status).toBe(200);
    expect(unpublishedAgainResponse.body.data).toMatchObject({
      employeeId: 'e034',
      month,
      totalScore: null,
      companyAverageScore: null,
      departmentAverageScore: null,
      managerComment: '',
      isPublished: false,
    });
  });

  it('allows HR to publish with a documented 2-7-1 exemption but still blocks unsafe publishes', async () => {
    const month = '2099-06';
    const employeeIds = ['e002', 'e006', 'e010', 'e012', 'e013', 'e016', 'e017', 'e027', 'e031', 'e034', 'e046'];
    const systemSettings = memoryStore.systemSettings!;
    const originalRankingConfig = systemSettings.get('performance_ranking_config');
    systemSettings.set('performance_ranking_config', {
      id: 999,
      settingKey: 'performance_ranking_config',
      settingValue: JSON.stringify({
        version: 1,
        participation: {
          mode: 'include',
          enabledUnitKeys: [],
          includedUnitKeys: [],
          excludedUnitKeys: [],
          includedEmployeeIds: employeeIds,
          excludedEmployeeIds: [],
        },
        groupRank: { defaultStrategy: { type: 'by_high_low' }, perUnit: {} },
        templateAssignments: {},
        mergeRankGroups: [],
      }),
      settingType: 'json',
      category: 'performance',
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    try {
      for (const employeeId of employeeIds) {
        const id = `rec-${employeeId}-${month}`;
        await PerformanceModel.saveSummary({
          id,
          employeeId,
          assessorId: 'm011',
          month,
          selfSummary: '分布豁免测试总结',
          nextMonthPlan: '继续测试',
          groupType: 'low',
        });
        await PerformanceModel.submitScore({
          id,
          taskCompletion: 1.0,
          initiative: 1.0,
          projectFeedback: 1.0,
          qualityImprovement: 1.0,
          totalScore: 1.0,
          level: 'L3',
          managerComment: '分布豁免测试',
          nextMonthWorkArrangement: '继续测试',
        });
      }

      const hrToken = await TestHelper.getAuthToken('hr');
      const blocked = await request(app)
        .post('/api/assessment-publications')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ month });
      expect(blocked.status).toBe(400);
      expect(blocked.body.data.violations).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'forced_distribution' }),
      ]));

      const missingReason = await request(app)
        .post('/api/assessment-publications')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({ month, forceDistribution: true, forceReason: '太短' });
      expect(missingReason.status).toBe(400);
      expect(missingReason.body.message).toContain('豁免原因');

      const published = await request(app)
        .post('/api/assessment-publications')
        .set('Authorization', `Bearer ${hrToken}`)
        .send({
          month,
          forceDistribution: true,
          forceReason: '测试部本月样本集中在中间区间，HR确认允许发布并保留审计说明',
        });
      expect(published.status).toBe(200);
      expect(published.body.success).toBe(true);
      expect(published.body.data).toMatchObject({
        forceDistribution: true,
        forceReason: '测试部本月样本集中在中间区间，HR确认允许发布并保留审计说明',
      });
      expect(published.body.message).toContain('已发布');
    } finally {
      await AssessmentPublicationModel.unpublish(month);
      if (originalRankingConfig) {
        systemSettings.set('performance_ranking_config', originalRankingConfig);
      } else {
        systemSettings.delete('performance_ranking_config');
      }
    }
  });

  it('exposes the publication endpoint alias instead of returning 404', async () => {
    const hrToken = await TestHelper.getAuthToken('hr');

    const response = await request(app)
      .post('/api/assessment-publications')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: '2099-02' });

    expect(response.status).not.toBe(404);
    expect(response.body.message).not.toBe('接口不存在');
  });

  it('allows dynamic metricScores submission without legacy fixed score fields', async () => {
    const month = '2099-03';
    const recordId = `rec-e034-${month}`;
    await PerformanceModel.saveSummary({
      id: recordId,
      employeeId: 'e034',
      assessorId: 'm011',
      month,
      selfSummary: '完成动态模板评分测试',
      nextMonthPlan: '继续完善动态模板评分',
      groupType: 'low',
    });

    const managerToken = await TestHelper.getAuthToken('manager');
    const response = await request(app)
      .post('/api/performance/score')
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        id: recordId,
        metricScores: [
          { metricId: 'metric-quality', metricName: '测试质量', metricCode: 'quality', weight: 60, score: 1.2, level: 'L4' },
          { metricId: 'metric-growth', metricName: '学习成长', metricCode: 'growth', weight: 40, score: 1.0, level: 'L3' },
        ],
        managerComment: '动态指标评分通过',
        nextMonthWorkArrangement: '继续按动态模板跟踪',
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.totalScore).toBe(1.12);
    expect(response.body.data.metricScores).toHaveLength(2);
  });

  it('rejects concurrent duplicate scoring so later writes do not silently overwrite the first score', async () => {
    const month = '2099-04';
    const recordId = `rec-e034-${month}`;
    await PerformanceModel.saveSummary({
      id: recordId,
      employeeId: 'e034',
      assessorId: 'm011',
      month,
      selfSummary: '完成并发评分测试',
      nextMonthPlan: '继续验证并发保护',
      groupType: 'low',
    });

    const managerToken = await TestHelper.getAuthToken('manager');
    const requests = [1, 1.05, 1.1, 1.15, 1.2].map((score) => (
      request(app)
        .post('/api/performance/score')
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          id: recordId,
          taskCompletion: score,
          initiative: 1,
          projectFeedback: 1,
          qualityImprovement: 1,
          managerComment: `并发评分 ${score}`,
          nextMonthWorkArrangement: '继续跟进并发保护',
        })
    ));

    const responses = await Promise.all(requests);
    const successResponses = responses.filter(response => response.status === 200 && response.body.success === true);
    const conflictResponses = responses.filter(response => response.status === 409);

    expect(successResponses).toHaveLength(1);
    expect(conflictResponses).toHaveLength(4);

    const finalRecord = await PerformanceModel.findById(recordId);
    expect(finalRecord?.managerComment).toBe(successResponses[0].body.data.managerComment);
  });

  it('keeps assessment cycles and department list endpoints available', async () => {
    const token = await TestHelper.getAuthToken('employee');
    const hrToken = await TestHelper.getAuthToken('hr');

    const cycles = await request(app)
      .get('/api/cycles')
      .set('Authorization', `Bearer ${token}`);
    const departments = await request(app)
      .get('/api/departments')
      .set('Authorization', `Bearer ${token}`);
    const templateBindings = await request(app)
      .get('/api/template-bindings')
      .set('Authorization', `Bearer ${hrToken}`);

    expect(cycles.status).toBe(200);
    expect(cycles.body).toMatchObject({ success: true });
    expect(Array.isArray(cycles.body.data)).toBe(true);
    expect(departments.status).toBe(200);
    expect(departments.body).toMatchObject({ success: true });
    expect(Array.isArray(departments.body.data)).toBe(true);
    expect(templateBindings.status).toBe(200);
    expect(templateBindings.body).toMatchObject({ success: true });
    expect(Array.isArray(templateBindings.body.data)).toBe(true);
  });

  it('deduplicates repeated departments in organization APIs', async () => {
    const token = await TestHelper.getAuthToken('employee');
    const parentA = {
      id: 'dept-dup-parent-a',
      name: '重复部门测试',
      code: 'DUP-A',
      sortOrder: 9000,
      status: 'active',
      createdAt: new Date('2026-01-01').toISOString(),
      updatedAt: new Date('2026-01-01').toISOString(),
    } as any;
    const parentB = {
      ...parentA,
      id: 'dept-dup-parent-b',
      code: 'DUP-B',
      sortOrder: 9001,
      createdAt: new Date('2026-02-01').toISOString(),
    } as any;
    const childUnderDuplicateParent = {
      id: 'dept-dup-child-b',
      name: '重复子部门测试',
      code: 'DUP-C',
      parentId: parentB.id,
      sortOrder: 9002,
      status: 'active',
      createdAt: new Date('2026-02-02').toISOString(),
      updatedAt: new Date('2026-02-02').toISOString(),
    } as any;

    memoryStore.departments.set(parentA.id, parentA);
    memoryStore.departments.set(parentB.id, parentB);
    memoryStore.departments.set(childUnderDuplicateParent.id, childUnderDuplicateParent);

    try {
      const flat = await request(app)
        .get('/api/organization/departments')
        .set('Authorization', `Bearer ${token}`);

      expect(flat.status).toBe(200);
      const duplicateParents = flat.body.data.filter((dept: any) => dept.name === '重复部门测试');
      expect(duplicateParents).toHaveLength(1);

      const tree = await request(app)
        .get('/api/organization/departments/tree')
        .set('Authorization', `Bearer ${token}`);
      expect(tree.status).toBe(200);
      const root = tree.body.data.find((dept: any) => dept.name === '重复部门测试');
      expect(root?.children?.some((dept: any) => dept.name === '重复子部门测试')).toBe(true);
    } finally {
      memoryStore.departments.delete(parentA.id);
      memoryStore.departments.delete(parentB.id);
      memoryStore.departments.delete(childUnderDuplicateParent.id);
    }
  });

  it('keeps AI, quarterly summary, salary status, automation trigger and metric template endpoints available', async () => {
    const employeeToken = await TestHelper.getAuthToken('employee');
    const hrToken = await TestHelper.getAuthToken('hr');

    const aiSuggestions = await request(app)
      .get('/api/ai/suggestions')
      .set('Authorization', `Bearer ${employeeToken}`);
    expect(aiSuggestions.status).toBe(200);
    expect(aiSuggestions.body.success).toBe(true);
    expect(aiSuggestions.body.data.length).toBeGreaterThan(0);

    const quarterlySummaries = await request(app)
      .get('/api/quarterly-summaries')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(quarterlySummaries.status).toBe(200);
    expect(quarterlySummaries.body.success).toBe(true);
    expect(Array.isArray(quarterlySummaries.body.data)).toBe(true);

    const salaryStatus = await request(app)
      .get('/api/integrations/salary/status')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(salaryStatus.status).toBe(200);
    expect(salaryStatus.body).toMatchObject({ success: true });
    expect(JSON.stringify(salaryStatus.body)).not.toContain('SALARY_SYSTEM_PUSH_TOKEN');

    const metricTemplates = await request(app)
      .get('/api/metrics/templates')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(metricTemplates.status).toBe(200);
    expect(metricTemplates.body.success).toBe(true);
    expect(metricTemplates.body.data.length).toBeGreaterThan(0);

    const trigger = await request(app)
      .post('/api/automation/trigger/generate-monthly-tasks')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ month: '2099-05' });
    expect(trigger.status).not.toBe(404);
    expect(trigger.body.message).not.toBe('接口不存在');
  });

  it('rejects invalid manager assignments and supports employee pagination', async () => {
    const hrToken = await TestHelper.getAuthToken('hr');

    const selfManager = await request(app)
      .put('/api/employees/e001')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ managerId: 'e001' });
    expect(selfManager.status).toBe(400);
    expect(selfManager.body.message).toBe('直属上级不能设置为本人');

    const missingManager = await request(app)
      .put('/api/employees/e001')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ managerId: 'nonexist999' });
    expect(missingManager.status).toBe(400);
    expect(missingManager.body.message).toBe('直属上级不存在或已禁用');

    const paged = await request(app)
      .get('/api/employees?page=1&limit=5')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(paged.status).toBe(200);
    expect(paged.body.data).toHaveLength(5);
    expect(paged.body.pagination).toMatchObject({ page: 1, limit: 5 });
    expect(paged.body.pagination.total).toBeGreaterThan(5);
  });

  it('blocks ordinary employees from reading HR template configuration lists', async () => {
    const token = await TestHelper.getAuthToken('employee');

    const response = await request(app)
      .get('/api/assessment-templates')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('keeps stats alias and satisfaction survey response alias available', async () => {
    const hrToken = await TestHelper.getAuthToken('hr');
    const employeeToken = await TestHelper.getAuthToken('employee');

    const stats = await request(app)
      .get('/api/stats/2099-01')
      .set('Authorization', `Bearer ${hrToken}`);
    expect(stats.status).toBe(200);
    expect(stats.body.success).toBe(true);

    const ensuredSurvey = await request(app)
      .post('/api/satisfaction-surveys/current/ensure')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ year: 2099, half: 1 });
    expect(ensuredSurvey.status).toBe(200);
    expect(ensuredSurvey.body.success).toBe(true);

    const survey = await request(app)
      .post('/api/satisfaction-surveys/respond')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        scores: {
          fairness: 5,
          feedbackTimeliness: 4,
          collaboration: 5,
          support: 4,
          overall: 5,
        },
        comment: '整体满意',
      });

    expect(survey.status).toBe(200);
    expect(survey.body).toMatchObject({
      success: true,
      message: '满意度调查已提交',
    });
  });

  it('prevents HR from elevating an account to admin', async () => {
    const hrToken = await TestHelper.getAuthToken('hr');

    const response = await request(app)
      .put('/api/employees/hr001')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({ role: 'admin' });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('prevents HR from creating privileged accounts', async () => {
    const hrToken = await TestHelper.getAuthToken('hr');

    const response = await request(app)
      .post('/api/employees')
      .set('Authorization', `Bearer ${hrToken}`)
      .send({
        id: 'security-admin-001',
        name: '安全测试管理员',
        department: '人力行政部',
        role: 'admin',
        level: 'senior',
        idCardLast6: '123456',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('rate-limits burst employee creation attempts', async () => {
    const hrToken = await TestHelper.getAuthToken('hr');
    const requests = Array.from({ length: 12 }, (_, index) => (
      request(app)
        .post('/api/employees')
        .set('Authorization', `Bearer ${hrToken}`)
        .set('X-Test-Rate-Limit', 'true')
        .send({
          id: `rate-limit-emp-${index}`,
          name: `限流测试员工${index}`,
          department: '工程技术中心',
          role: 'employee',
          level: 'junior',
          idCardLast6: `88${String(index).padStart(4, '0')}`.slice(-6),
          managerId: 'm011',
        })
    ));

    const responses = await Promise.all(requests);
    expect(responses.some((response) => response.status === 429)).toBe(true);
  });

  it('prevents HR from deleting GM/HR/admin accounts', async () => {
    const hrToken = await TestHelper.getAuthToken('hr');

    const response = await request(app)
      .delete('/api/employees/gm001')
      .set('Authorization', `Bearer ${hrToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
  });

  it('does not expose runtime environment details in health responses', async () => {
    const response = await request(app).get('/api/health');

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body).not.toHaveProperty('env');
  });
});
