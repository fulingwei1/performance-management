-- Phase 2: 索引优化
-- 创建时间: 2026-03-01
-- 描述: 基于查询模式分析，添加缺失索引和复合索引
-- 参考: docs/DATABASE_OPTIMIZATION.md

-- ============================================
-- 1. 高优先级：复合索引
-- ============================================

-- peer_reviews: 触发器和统计查询的核心路径
-- 场景: WHERE cycle_id = X AND reviewee_id = Y (触发器每次INSERT/UPDATE都执行)
CREATE INDEX IF NOT EXISTS idx_peer_reviews_cycle_reviewee 
  ON peer_reviews(cycle_id, reviewee_id);

-- review_relationships: "我需要评谁" 查询
-- 场景: WHERE cycle_id = X AND reviewer_id = Y AND status = 'pending'
CREATE INDEX IF NOT EXISTS idx_review_rel_cycle_reviewer 
  ON review_relationships(cycle_id, reviewer_id, status);

-- interview_reminders: 定时任务查未发送提醒
-- 场景: WHERE is_sent = FALSE AND reminder_date <= CURDATE()
CREATE INDEX IF NOT EXISTS idx_reminders_unsent 
  ON interview_reminders(is_sent, reminder_date);

-- improvement_plans: 按员工+状态查询
-- 场景: WHERE employee_id = X AND status = 'in_progress'
CREATE INDEX IF NOT EXISTS idx_improvement_employee_status 
  ON improvement_plans(employee_id, status);

-- ============================================
-- 2. 中优先级：缺失的单列索引
-- ============================================

-- improvement_plans: 经理查看下属改进计划
CREATE INDEX IF NOT EXISTS idx_improvement_manager 
  ON improvement_plans(manager_id);

-- interview_plans: JOIN面谈模板
CREATE INDEX IF NOT EXISTS idx_interview_plans_template 
  ON interview_plans(template_id);

-- review_relationships: 按部门筛选
CREATE INDEX IF NOT EXISTS idx_review_rel_dept 
  ON review_relationships(department_id);
