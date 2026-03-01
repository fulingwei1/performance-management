import { query } from '../config/database';

// 面谈计划
export interface InterviewPlan {
  id?: number;
  title: string;
  description?: string;
  interview_type: 'regular' | 'probation' | 'promotion' | 'exit';
  scheduled_date: string;
  scheduled_time?: string;
  duration_minutes?: number;
  manager_id: number;
  employee_id: number;
  department_id?: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  template_id?: number;
  created_by?: number;
}

// 面谈记录
export interface InterviewRecord {
  id?: number;
  plan_id?: number;
  employee_id: number;
  manager_id: number;
  interview_date: string;
  interview_time?: string;
  duration_minutes?: number;
  employee_summary?: string;
  manager_feedback?: string;
  achievements?: string;
  challenges?: string;
  strengths?: string;
  improvements?: string;
  overall_rating?: number;
  performance_score?: number;
  potential_score?: number;
  nine_box_performance?: 'low' | 'medium' | 'high';
  nine_box_potential?: 'low' | 'medium' | 'high';
  notes?: string;
  attachments?: any;
  status: 'draft' | 'submitted' | 'approved';
}

// 改进计划
export interface ImprovementPlan {
  id?: number;
  interview_record_id: number;
  employee_id: number;
  manager_id: number;
  goal: string;
  description?: string;
  category?: 'skill' | 'behavior' | 'performance';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  start_date?: string;
  target_date?: string;
  actual_completion_date?: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'cancelled';
  progress_percentage?: number;
  resources_needed?: string;
  support_from_manager?: string;
  follow_up_notes?: string;
  last_reviewed_at?: Date;
}

export const InterviewPlanModel = {
  async create(data: Omit<InterviewPlan, 'id'>): Promise<InterviewPlan> {
    const rows = await query(
      `INSERT INTO interview_plans (
        title, description, interview_type, scheduled_date, scheduled_time, duration_minutes,
        manager_id, employee_id, department_id, status, template_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        data.title, data.description, data.interview_type, data.scheduled_date, data.scheduled_time,
        data.duration_minutes, data.manager_id, data.employee_id, data.department_id,
        data.status, data.template_id, data.created_by
      ]
    );
    return rows[0];
  },

  async findAll(filters?: { manager_id?: number; employee_id?: number; status?: string }): Promise<InterviewPlan[]> {
    let sql = 'SELECT * FROM interview_plans WHERE 1=1';
    const params: any[] = [];
    
    if (filters?.manager_id !== undefined) {
      params.push(filters.manager_id);
      sql += ` AND manager_id = $${params.length}`;
    }
    if (filters?.employee_id !== undefined) {
      params.push(filters.employee_id);
      sql += ` AND employee_id = $${params.length}`;
    }
    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }
    
    sql += ' ORDER BY scheduled_date DESC, created_at DESC';
    return await query(sql, params);
  },

  async findById(id: number): Promise<InterviewPlan | null> {
    const rows = await query('SELECT * FROM interview_plans WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async update(id: number, data: Partial<InterviewPlan>): Promise<boolean> {
    const fields = Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined);
    if (fields.length === 0) return false;
    
    const setClause = fields.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = fields.map(k => data[k as keyof typeof data]);
    
    const result: any = await query(
      `UPDATE interview_plans SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1}`,
      [...values, id]
    );
    return (result.affectedRows || 0) > 0;
  },

  async delete(id: number): Promise<boolean> {
    const result: any = await query('DELETE FROM interview_plans WHERE id = $1', [id]);
    return (result.affectedRows || 0) > 0;
  }
};

export const InterviewRecordModel = {
  async create(data: Omit<InterviewRecord, 'id'>): Promise<InterviewRecord> {
    const rows = await query(
      `INSERT INTO interview_records (
        plan_id, employee_id, manager_id, interview_date, interview_time, duration_minutes,
        employee_summary, manager_feedback, achievements, challenges, strengths, improvements,
        overall_rating, performance_score, potential_score, nine_box_performance, nine_box_potential,
        notes, attachments, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *`,
      [
        data.plan_id, data.employee_id, data.manager_id, data.interview_date, data.interview_time,
        data.duration_minutes, data.employee_summary, data.manager_feedback, data.achievements,
        data.challenges, data.strengths, data.improvements, data.overall_rating, data.performance_score,
        data.potential_score, data.nine_box_performance, data.nine_box_potential,
        data.notes, JSON.stringify(data.attachments), data.status
      ]
    );
    return rows[0];
  },

  async findAll(filters?: { employee_id?: number; manager_id?: number }): Promise<InterviewRecord[]> {
    let sql = 'SELECT * FROM interview_records WHERE 1=1';
    const params: any[] = [];
    
    if (filters?.employee_id !== undefined) {
      params.push(filters.employee_id);
      sql += ` AND employee_id = $${params.length}`;
    }
    if (filters?.manager_id !== undefined) {
      params.push(filters.manager_id);
      sql += ` AND manager_id = $${params.length}`;
    }
    
    sql += ' ORDER BY interview_date DESC, created_at DESC';
    return await query(sql, params);
  },

  async findById(id: number): Promise<InterviewRecord | null> {
    const rows = await query('SELECT * FROM interview_records WHERE id = $1', [id]);
    return rows[0] || null;
  }
};

export const ImprovementPlanModel = {
  async create(data: Omit<ImprovementPlan, 'id'>): Promise<ImprovementPlan> {
    const rows = await query(
      `INSERT INTO improvement_plans (
        interview_record_id, employee_id, manager_id, goal, description, category, priority,
        start_date, target_date, status, progress_percentage, resources_needed, support_from_manager
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        data.interview_record_id, data.employee_id, data.manager_id, data.goal, data.description,
        data.category, data.priority, data.start_date, data.target_date, data.status,
        data.progress_percentage, data.resources_needed, data.support_from_manager
      ]
    );
    return rows[0];
  },

  async findByInterviewRecord(interviewRecordId: number): Promise<ImprovementPlan[]> {
    return await query(
      'SELECT * FROM improvement_plans WHERE interview_record_id = $1 ORDER BY priority DESC, created_at DESC',
      [interviewRecordId]
    );
  },

  async findByEmployee(employeeId: number, status?: string): Promise<ImprovementPlan[]> {
    let sql = 'SELECT * FROM improvement_plans WHERE employee_id = $1';
    const params: any[] = [employeeId];
    
    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }
    
    sql += ' ORDER BY target_date ASC NULLS LAST';
    return await query(sql, params);
  },

  async updateProgress(id: number, progress: number, notes?: string): Promise<boolean> {
    const result: any = await query(
      `UPDATE improvement_plans 
       SET progress_percentage = $1, follow_up_notes = $2, last_reviewed_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [progress, notes, id]
    );
    return (result.affectedRows || 0) > 0;
  }
};
