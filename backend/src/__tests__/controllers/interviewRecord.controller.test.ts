/**
 * InterviewRecord Controller 单元测试
 * 测试面谈计划、面谈记录、改进计划的 HTTP 端点
 */

import request from 'supertest';
import app from '../../index';
import {
  InterviewPlanModel,
  InterviewRecordModel,
  ImprovementPlanModel
} from '../../models/interviewRecord.model';

jest.mock('../../models/interviewRecord.model');

const mockedPlanModel = InterviewPlanModel as jest.Mocked<typeof InterviewPlanModel>;
const mockedRecordModel = InterviewRecordModel as jest.Mocked<typeof InterviewRecordModel>;
const mockedImprovementModel = ImprovementPlanModel as jest.Mocked<typeof ImprovementPlanModel>;

describe('InterviewRecord Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ==================== Interview Plans ====================
  describe('POST /api/interview-records/plans - createPlan', () => {
    const validPlan = {
      title: 'Q1绩效面谈',
      description: '第一季度回顾',
      interview_type: 'quarterly',
      scheduled_date: '2026-04-01',
      scheduled_time: '14:00',
      duration_minutes: 60,
      manager_id: 1,
      employee_id: 5,
      department_id: 2
    };

    it('应成功创建面谈计划', async () => {
      mockedPlanModel.create.mockResolvedValue({ id: 1, ...validPlan, status: 'scheduled' } as any);

      const res = await request(app)
        .post('/api/interview-records/plans')
        .send(validPlan);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('面谈计划创建成功');
      expect(res.body.data).toBeDefined();
    });

    it('缺少必填字段时应返回400', async () => {
      const res = await request(app)
        .post('/api/interview-records/plans')
        .send({ title: '测试' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('缺少必填字段');
    });

    it('缺少manager_id时应返回400', async () => {
      const res = await request(app)
        .post('/api/interview-records/plans')
        .send({ title: '测试', interview_type: 'quarterly', scheduled_date: '2026-04-01', employee_id: 5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Model抛出异常时应返回500', async () => {
      mockedPlanModel.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/interview-records/plans')
        .send(validPlan);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/interview-records/plans - getPlans', () => {
    it('应返回计划列表', async () => {
      const plans = [
        { id: 1, title: 'Q1面谈', status: 'scheduled' },
        { id: 2, title: 'Q2面谈', status: 'completed' }
      ];
      mockedPlanModel.findAll.mockResolvedValue(plans as any);

      const res = await request(app).get('/api/interview-records/plans');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('应支持按manager_id和status筛选', async () => {
      mockedPlanModel.findAll.mockResolvedValue([] as any);

      await request(app).get('/api/interview-records/plans?manager_id=1&status=scheduled');

      expect(mockedPlanModel.findAll).toHaveBeenCalledWith({
        manager_id: 1,
        employee_id: undefined,
        status: 'scheduled'
      });
    });

    it('Model抛出异常时应返回500', async () => {
      mockedPlanModel.findAll.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/interview-records/plans');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/interview-records/plans/:id - updatePlan', () => {
    it('应成功更新计划', async () => {
      mockedPlanModel.update.mockResolvedValue(true);

      const res = await request(app)
        .put('/api/interview-records/plans/1')
        .send({ title: '更新后的标题', status: 'completed' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('更新成功');
    });

    it('计划不存在时应返回404', async () => {
      mockedPlanModel.update.mockResolvedValue(false);

      const res = await request(app)
        .put('/api/interview-records/plans/999')
        .send({ title: '不存在' });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('面谈计划不存在');
    });
  });

  // ==================== Interview Records ====================
  describe('POST /api/interview-records/records - createRecord', () => {
    const validRecord = {
      plan_id: 1,
      employee_id: 5,
      manager_id: 1,
      interview_date: '2026-04-01',
      interview_time: '14:00',
      duration_minutes: 45,
      employee_summary: '本季度完成了3个项目',
      manager_feedback: '整体表现出色',
      overall_rating: 'good',
      performance_score: 85
    };

    it('应成功创建面谈记录', async () => {
      mockedRecordModel.create.mockResolvedValue({ id: 1, ...validRecord, status: 'draft' } as any);

      const res = await request(app)
        .post('/api/interview-records/records')
        .send(validRecord);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('面谈记录创建成功');
    });

    it('缺少必填字段时应返回400', async () => {
      const res = await request(app)
        .post('/api/interview-records/records')
        .send({ employee_id: 5 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Model抛出异常时应返回500', async () => {
      mockedRecordModel.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/interview-records/records')
        .send(validRecord);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/interview-records/records - getRecords', () => {
    it('应返回记录列表', async () => {
      const records = [{ id: 1, employee_id: 5, manager_id: 1 }];
      mockedRecordModel.findAll.mockResolvedValue(records as any);

      const res = await request(app).get('/api/interview-records/records');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(1);
    });

    it('应支持按employee_id筛选', async () => {
      mockedRecordModel.findAll.mockResolvedValue([] as any);

      await request(app).get('/api/interview-records/records?employee_id=5&manager_id=1');

      expect(mockedRecordModel.findAll).toHaveBeenCalledWith({
        employee_id: 5,
        manager_id: 1
      });
    });
  });

  describe('GET /api/interview-records/records/:id - getRecordById', () => {
    it('应返回记录详情（含改进计划）', async () => {
      const record = { id: 1, employee_id: 5, manager_id: 1, overall_rating: 'good' };
      const improvements = [{ id: 1, goal: '提升管理能力', progress_percentage: 30 }];
      mockedRecordModel.findById.mockResolvedValue(record as any);
      mockedImprovementModel.findByInterviewRecord.mockResolvedValue(improvements as any);

      const res = await request(app).get('/api/interview-records/records/1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.improvement_plans).toHaveLength(1);
    });

    it('记录不存在时应返回404', async () => {
      mockedRecordModel.findById.mockResolvedValue(null as any);

      const res = await request(app).get('/api/interview-records/records/999');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('面谈记录不存在');
    });
  });

  // ==================== Improvement Plans ====================
  describe('POST /api/interview-records/improvement-plans - createImprovementPlan', () => {
    const validPlan = {
      interview_record_id: 1,
      employee_id: 5,
      manager_id: 1,
      goal: '提升项目管理能力',
      description: '通过PMP培训和实际项目锻炼',
      category: 'skill',
      priority: 'high',
      start_date: '2026-04-01',
      target_date: '2026-06-30'
    };

    it('应成功创建改进计划', async () => {
      mockedImprovementModel.create.mockResolvedValue({ id: 1, ...validPlan, status: 'not_started', progress_percentage: 0 } as any);

      const res = await request(app)
        .post('/api/interview-records/improvement-plans')
        .send(validPlan);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('改进计划创建成功');
    });

    it('缺少必填字段时应返回400', async () => {
      const res = await request(app)
        .post('/api/interview-records/improvement-plans')
        .send({ goal: '测试' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('缺少goal时应返回400', async () => {
      const res = await request(app)
        .post('/api/interview-records/improvement-plans')
        .send({ interview_record_id: 1, employee_id: 5, manager_id: 1 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('Model抛出异常时应返回500', async () => {
      mockedImprovementModel.create.mockRejectedValue(new Error('DB error'));

      const res = await request(app)
        .post('/api/interview-records/improvement-plans')
        .send(validPlan);

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/interview-records/improvement-plans/:id/progress - updateProgress', () => {
    it('应成功更新进度', async () => {
      mockedImprovementModel.updateProgress.mockResolvedValue(true);

      const res = await request(app)
        .put('/api/interview-records/improvement-plans/1/progress')
        .send({ progress: 50, notes: '已完成PMP课程' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('进度更新成功');
    });

    it('进度值无效时应返回400（负数）', async () => {
      const res = await request(app)
        .put('/api/interview-records/improvement-plans/1/progress')
        .send({ progress: -10 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('0-100');
    });

    it('进度值无效时应返回400（超过100）', async () => {
      const res = await request(app)
        .put('/api/interview-records/improvement-plans/1/progress')
        .send({ progress: 150 });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('进度值缺失时应返回400', async () => {
      const res = await request(app)
        .put('/api/interview-records/improvement-plans/1/progress')
        .send({ notes: '备注' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('改进计划不存在时应返回404', async () => {
      mockedImprovementModel.updateProgress.mockResolvedValue(false);

      const res = await request(app)
        .put('/api/interview-records/improvement-plans/999/progress')
        .send({ progress: 50 });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/interview-records/improvement-plans/employee/:employeeId - getByEmployee', () => {
    it('应返回员工的改进计划', async () => {
      const plans = [
        { id: 1, goal: '提升管理能力', status: 'in_progress' },
        { id: 2, goal: '学习新技术', status: 'not_started' }
      ];
      mockedImprovementModel.findByEmployee.mockResolvedValue(plans as any);

      const res = await request(app).get('/api/interview-records/improvement-plans/employee/5');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.total).toBe(2);
    });

    it('应支持按状态筛选', async () => {
      mockedImprovementModel.findByEmployee.mockResolvedValue([] as any);

      await request(app).get('/api/interview-records/improvement-plans/employee/5?status=in_progress');

      expect(mockedImprovementModel.findByEmployee).toHaveBeenCalledWith(5, 'in_progress');
    });

    it('Model抛出异常时应返回500', async () => {
      mockedImprovementModel.findByEmployee.mockRejectedValue(new Error('DB error'));

      const res = await request(app).get('/api/interview-records/improvement-plans/employee/5');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
