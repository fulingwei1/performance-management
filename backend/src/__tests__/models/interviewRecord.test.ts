/**
 * InterviewRecord Model 单元测试
 * 测试 InterviewPlanModel, InterviewRecordModel, ImprovementPlanModel
 */

import { InterviewPlanModel, InterviewRecordModel, ImprovementPlanModel } from '../../models/interviewRecord.model';

// Mock the database query function
const mockQuery = jest.fn();
jest.mock('../../config/database', () => ({
  query: (...args: any[]) => mockQuery(...args),
}));

describe('InterviewRecord Model', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  // ==================== InterviewPlanModel ====================
  describe('InterviewPlanModel', () => {
    const samplePlan = {
      id: 1,
      title: 'Q1绩效面谈',
      description: '第一季度绩效回顾面谈',
      interview_type: 'regular' as const,
      scheduled_date: '2026-03-15',
      scheduled_time: '14:00',
      duration_minutes: 60,
      manager_id: 1,
      employee_id: 10,
      department_id: 2,
      status: 'scheduled' as const,
      template_id: 1,
      created_by: 1,
    };

    it('should create an interview plan', async () => {
      mockQuery.mockResolvedValue([samplePlan]);

      const { id, ...input } = samplePlan;
      const result = await InterviewPlanModel.create(input);

      expect(mockQuery).toHaveBeenCalledTimes(1);
      expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO interview_plans');
      expect(mockQuery.mock.calls[0][1]).toHaveLength(12);
      expect(result).toEqual(samplePlan);
    });

    it('should find all plans without filters', async () => {
      mockQuery.mockResolvedValue([samplePlan]);

      const result = await InterviewPlanModel.findAll();

      expect(mockQuery.mock.calls[0][0]).toContain('SELECT * FROM interview_plans');
      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY scheduled_date DESC');
      expect(result).toEqual([samplePlan]);
    });

    it('should find plans by manager_id', async () => {
      mockQuery.mockResolvedValue([samplePlan]);

      await InterviewPlanModel.findAll({ manager_id: 1 });

      expect(mockQuery.mock.calls[0][0]).toContain('AND manager_id =');
      expect(mockQuery.mock.calls[0][1]).toContain(1);
    });

    it('should find plans by employee_id', async () => {
      mockQuery.mockResolvedValue([]);

      await InterviewPlanModel.findAll({ employee_id: 10 });

      expect(mockQuery.mock.calls[0][0]).toContain('AND employee_id =');
    });

    it('should find plans by status', async () => {
      mockQuery.mockResolvedValue([]);

      await InterviewPlanModel.findAll({ status: 'completed' });

      expect(mockQuery.mock.calls[0][0]).toContain('AND status =');
    });

    it('should find plans with multiple filters', async () => {
      mockQuery.mockResolvedValue([]);

      await InterviewPlanModel.findAll({ manager_id: 1, employee_id: 10, status: 'scheduled' });

      const sql = mockQuery.mock.calls[0][0];
      expect(sql).toContain('AND manager_id =');
      expect(sql).toContain('AND employee_id =');
      expect(sql).toContain('AND status =');
      expect(mockQuery.mock.calls[0][1]).toHaveLength(3);
    });

    it('should find plan by id', async () => {
      mockQuery.mockResolvedValue([samplePlan]);

      const result = await InterviewPlanModel.findById(1);

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM interview_plans WHERE id = $1', [1]);
      expect(result).toEqual(samplePlan);
    });

    it('should return null when plan not found', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await InterviewPlanModel.findById(999);

      expect(result).toBeNull();
    });

    it('should update a plan', async () => {
      const mockResult: any = [];
      mockResult.affectedRows = 1;
      mockQuery.mockResolvedValue(mockResult);

      await InterviewPlanModel.update(1, { status: 'completed' });

      expect(mockQuery.mock.calls[0][0]).toContain('UPDATE interview_plans SET');
      expect(mockQuery.mock.calls[0][0]).toContain('updated_at = NOW()');
    });

    it('should return false when updating with no fields', async () => {
      const result = await InterviewPlanModel.update(1, {});

      expect(mockQuery).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should delete a plan', async () => {
      const mockResult: any = [];
      mockResult.affectedRows = 1;
      mockQuery.mockResolvedValue(mockResult);

      await InterviewPlanModel.delete(1);

      expect(mockQuery).toHaveBeenCalledWith('DELETE FROM interview_plans WHERE id = $1', [1]);
    });
  });

  // ==================== InterviewRecordModel ====================
  describe('InterviewRecordModel', () => {
    const sampleRecord = {
      id: 1,
      plan_id: 1,
      employee_id: 10,
      manager_id: 1,
      interview_date: '2026-03-15',
      interview_time: '14:00',
      duration_minutes: 55,
      employee_summary: '本季度完成了主要目标',
      manager_feedback: '表现良好，需加强沟通',
      achievements: '完成项目A、B',
      challenges: '跨部门协作困难',
      strengths: '技术能力强',
      improvements: '时间管理需改进',
      overall_rating: 4,
      performance_score: 85,
      potential_score: 80,
      nine_box_performance: 'high' as const,
      nine_box_potential: 'medium' as const,
      notes: '下季度重点关注领导力发展',
      attachments: [{ name: 'review.pdf', url: '/uploads/review.pdf' }],
      status: 'submitted' as const,
    };

    it('should create an interview record', async () => {
      mockQuery.mockResolvedValue([sampleRecord]);

      const { id, ...input } = sampleRecord;
      const result = await InterviewRecordModel.create(input);

      expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO interview_records');
      expect(mockQuery.mock.calls[0][1]).toHaveLength(20);
      expect(result).toEqual(sampleRecord);
    });

    it('should stringify attachments when creating', async () => {
      mockQuery.mockResolvedValue([sampleRecord]);

      const { id, ...input } = sampleRecord;
      await InterviewRecordModel.create(input);

      // attachments should be JSON stringified (index 18 in params)
      const params = mockQuery.mock.calls[0][1];
      expect(params[18]).toBe(JSON.stringify(input.attachments));
    });

    it('should find all records without filters', async () => {
      mockQuery.mockResolvedValue([sampleRecord]);

      const result = await InterviewRecordModel.findAll();

      expect(mockQuery.mock.calls[0][0]).toContain('SELECT * FROM interview_records');
      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY interview_date DESC');
      expect(result).toEqual([sampleRecord]);
    });

    it('should find records by employee_id', async () => {
      mockQuery.mockResolvedValue([sampleRecord]);

      await InterviewRecordModel.findAll({ employee_id: 10 });

      expect(mockQuery.mock.calls[0][0]).toContain('AND employee_id =');
    });

    it('should find records by manager_id', async () => {
      mockQuery.mockResolvedValue([]);

      await InterviewRecordModel.findAll({ manager_id: 1 });

      expect(mockQuery.mock.calls[0][0]).toContain('AND manager_id =');
    });

    it('should find record by id', async () => {
      mockQuery.mockResolvedValue([sampleRecord]);

      const result = await InterviewRecordModel.findById(1);

      expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM interview_records WHERE id = $1', [1]);
      expect(result).toEqual(sampleRecord);
    });

    it('should return null when record not found', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await InterviewRecordModel.findById(999);

      expect(result).toBeNull();
    });
  });

  // ==================== ImprovementPlanModel ====================
  describe('ImprovementPlanModel', () => {
    const sampleImprovement = {
      id: 1,
      interview_record_id: 1,
      employee_id: 10,
      manager_id: 1,
      goal: '提升沟通能力',
      description: '参加沟通培训课程',
      category: 'skill' as const,
      priority: 'high' as const,
      start_date: '2026-04-01',
      target_date: '2026-06-30',
      status: 'not_started' as const,
      progress_percentage: 0,
      resources_needed: '培训预算',
      support_from_manager: '每周1对1辅导',
    };

    it('should create an improvement plan', async () => {
      mockQuery.mockResolvedValue([sampleImprovement]);

      const { id, ...input } = sampleImprovement;
      const result = await ImprovementPlanModel.create(input);

      expect(mockQuery.mock.calls[0][0]).toContain('INSERT INTO improvement_plans');
      expect(mockQuery.mock.calls[0][1]).toHaveLength(13);
      expect(result).toEqual(sampleImprovement);
    });

    it('should find improvement plans by interview record', async () => {
      mockQuery.mockResolvedValue([sampleImprovement]);

      const result = await ImprovementPlanModel.findByInterviewRecord(1);

      expect(mockQuery.mock.calls[0][0]).toContain('WHERE interview_record_id = $1');
      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY priority DESC');
      expect(result).toEqual([sampleImprovement]);
    });

    it('should find improvement plans by employee without status filter', async () => {
      mockQuery.mockResolvedValue([sampleImprovement]);

      const result = await ImprovementPlanModel.findByEmployee(10);

      expect(mockQuery.mock.calls[0][0]).toContain('WHERE employee_id = $1');
      expect(mockQuery.mock.calls[0][0]).toContain('ORDER BY target_date ASC');
      expect(mockQuery.mock.calls[0][1]).toEqual([10]);
    });

    it('should find improvement plans by employee with status filter', async () => {
      mockQuery.mockResolvedValue([]);

      await ImprovementPlanModel.findByEmployee(10, 'in_progress');

      expect(mockQuery.mock.calls[0][0]).toContain('AND status =');
      expect(mockQuery.mock.calls[0][1]).toEqual([10, 'in_progress']);
    });

    it('should update progress', async () => {
      const mockResult: any = [];
      mockResult.affectedRows = 1;
      mockQuery.mockResolvedValue(mockResult);

      await ImprovementPlanModel.updateProgress(1, 50, '进展顺利');

      expect(mockQuery.mock.calls[0][0]).toContain('UPDATE improvement_plans');
      expect(mockQuery.mock.calls[0][0]).toContain('progress_percentage = $1');
      expect(mockQuery.mock.calls[0][0]).toContain('last_reviewed_at = NOW()');
      expect(mockQuery.mock.calls[0][1]).toEqual([50, '进展顺利', 1]);
    });

    it('should update progress without notes', async () => {
      const mockResult: any = [];
      mockResult.affectedRows = 1;
      mockQuery.mockResolvedValue(mockResult);

      await ImprovementPlanModel.updateProgress(1, 75);

      expect(mockQuery.mock.calls[0][1]).toEqual([75, undefined, 1]);
    });

    it('should return empty array when no plans found', async () => {
      mockQuery.mockResolvedValue([]);

      const result = await ImprovementPlanModel.findByEmployee(999);

      expect(result).toEqual([]);
    });
  });
});
