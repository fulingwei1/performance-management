import { query } from '../config/database';

// 简化版本 - 只支持 PostgreSQL，后续可扩展 Memory DB

export interface ReviewCycle {
  id?: number;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: 'draft' | 'active' | 'closed';
  review_type: 'peer' | 'upward' | 'cross';
  is_anonymous: boolean;
  created_by?: number;
}

export interface ReviewRelationship {
  id?: number;
  cycle_id: number;
  reviewer_id: number;
  reviewee_id: number;
  relationship_type: 'peer' | 'manager' | 'subordinate' | 'cross_dept';
  department_id?: number;
  weight: number;
  status: 'pending' | 'completed';
}

export interface PeerReview {
  id?: number;
  relationship_id: number;
  cycle_id: number;
  reviewer_id: number;
  reviewee_id: number;
  teamwork_score?: number;
  communication_score?: number;
  professional_score?: number;
  responsibility_score?: number;
  innovation_score?: number;
  total_score?: number;
  strengths?: string;
  improvements?: string;
  overall_comment?: string;
  is_anonymous: boolean;
  submitted_at?: Date;
}

export interface ReviewStatistics {
  id?: number;
  cycle_id: number;
  reviewee_id: number;
  total_reviews: number;
  completed_reviews: number;
  avg_teamwork?: number;
  avg_communication?: number;
  avg_professional?: number;
  avg_responsibility?: number;
  avg_innovation?: number;
  avg_total_score?: number;
}

export const ReviewCycleModel = {
  async create(data: Omit<ReviewCycle, 'id'>): Promise<ReviewCycle> {
    const rows = await query(
      `INSERT INTO review_cycles (name, description, start_date, end_date, status, review_type, is_anonymous, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [data.name, data.description, data.start_date, data.end_date, data.status, data.review_type, data.is_anonymous, data.created_by]
    );
    return rows[0];
  },

  async findAll(filters?: { status?: string; review_type?: string }): Promise<ReviewCycle[]> {
    let sql = 'SELECT * FROM review_cycles WHERE 1=1';
    const params: any[] = [];
    
    if (filters?.status) {
      params.push(filters.status);
      sql += ` AND status = $${params.length}`;
    }
    if (filters?.review_type) {
      params.push(filters.review_type);
      sql += ` AND review_type = $${params.length}`;
    }
    
    sql += ' ORDER BY created_at DESC';
    return await query(sql, params);
  },

  async findById(id: number): Promise<ReviewCycle | null> {
    const rows = await query('SELECT * FROM review_cycles WHERE id = $1', [id]);
    return rows[0] || null;
  },

  async update(id: number, data: Partial<ReviewCycle>): Promise<boolean> {
    const fields = Object.keys(data).filter(k => data[k as keyof typeof data] !== undefined);
    if (fields.length === 0) return false;
    
    const setClause = fields.map((k, i) => `${k} = $${i + 1}`).join(', ');
    const values = fields.map(k => data[k as keyof typeof data]);
    
    const result: any = await query(
      `UPDATE review_cycles SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1}`,
      [...values, id]
    );
    return (result.affectedRows || 0) > 0;
  },

  async delete(id: number): Promise<boolean> {
    const result: any = await query('DELETE FROM review_cycles WHERE id = $1', [id]);
    return (result.affectedRows || 0) > 0;
  }
};

export const ReviewRelationshipModel = {
  async createBatch(relationships: Omit<ReviewRelationship, 'id'>[]): Promise<number> {
    if (relationships.length === 0) return 0;
    
    const values = relationships.map((r, i) => {
      const base = i * 7 + 1;
      return `($${base}, $${base+1}, $${base+2}, $${base+3}, $${base+4}, $${base+5}, $${base+6})`;
    }).join(',');
    
    const params = relationships.flatMap(r => [
      r.cycle_id, r.reviewer_id, r.reviewee_id, r.relationship_type,
      r.department_id || null, r.weight, r.status
    ]);
    
    const result: any = await query(
      `INSERT INTO review_relationships (cycle_id, reviewer_id, reviewee_id, relationship_type, department_id, weight, status) 
       VALUES ${values}`,
      params
    );
    return result.affectedRows || 0;
  },

  async findByCycle(cycleId: number, filters?: { reviewer_id?: number; reviewee_id?: number }): Promise<ReviewRelationship[]> {
    let sql = 'SELECT * FROM review_relationships WHERE cycle_id = $1';
    const params: any[] = [cycleId];
    
    if (filters?.reviewer_id !== undefined) {
      params.push(filters.reviewer_id);
      sql += ` AND reviewer_id = $${params.length}`;
    }
    if (filters?.reviewee_id !== undefined) {
      params.push(filters.reviewee_id);
      sql += ` AND reviewee_id = $${params.length}`;
    }
    
    return await query(sql, params);
  },

  async updateStatus(id: number, status: 'pending' | 'completed'): Promise<boolean> {
    const result: any = await query(
      'UPDATE review_relationships SET status = $1, updated_at = NOW() WHERE id = $2',
      [status, id]
    );
    return (result.affectedRows || 0) > 0;
  }
};

export const PeerReviewModel = {
  async create(data: Omit<PeerReview, 'id'>): Promise<PeerReview> {
    const rows = await query(
      `INSERT INTO peer_reviews (
        relationship_id, cycle_id, reviewer_id, reviewee_id,
        teamwork_score, communication_score, professional_score, responsibility_score, innovation_score,
        total_score, strengths, improvements, overall_comment, is_anonymous, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        data.relationship_id, data.cycle_id, data.reviewer_id, data.reviewee_id,
        data.teamwork_score, data.communication_score, data.professional_score,
        data.responsibility_score, data.innovation_score,
        data.total_score, data.strengths, data.improvements,
        data.overall_comment, data.is_anonymous, data.submitted_at
      ]
    );
    return rows[0];
  },

  async findByCycle(cycleId: number, filters?: { reviewer_id?: number; reviewee_id?: number }): Promise<PeerReview[]> {
    let sql = 'SELECT * FROM peer_reviews WHERE cycle_id = $1';
    const params: any[] = [cycleId];
    
    if (filters?.reviewer_id !== undefined) {
      params.push(filters.reviewer_id);
      sql += ` AND reviewer_id = $${params.length}`;
    }
    if (filters?.reviewee_id !== undefined) {
      params.push(filters.reviewee_id);
      sql += ` AND reviewee_id = $${params.length}`;
    }
    
    sql += ' ORDER BY created_at DESC';
    return await query(sql, params);
  }
};

export const ReviewStatisticsModel = {
  async findByCycle(cycleId: number, revieweeId?: number): Promise<ReviewStatistics[]> {
    let sql = 'SELECT * FROM review_statistics WHERE cycle_id = $1';
    const params: any[] = [cycleId];
    
    if (revieweeId !== undefined) {
      params.push(revieweeId);
      sql += ` AND reviewee_id = $${params.length}`;
    }
    
    sql += ' ORDER BY avg_total_score DESC NULLS LAST';
    return await query(sql, params);
  }
};
