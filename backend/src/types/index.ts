// 员工级别
export type EmployeeLevel = 'senior' | 'intermediate' | 'junior' | 'assistant';

// 员工角色
export type EmployeeRole = 'employee' | 'manager' | 'gm' | 'hr' | 'admin';

// 绩效记录状态
export type RecordStatus = 'draft' | 'submitted' | 'scored' | 'completed';

// 员工信息
export interface Employee {
  id: string;
  name: string;
  department: string;
  subDepartment: string;
  wecomUserId?: string;
  role: EmployeeRole;
  level: EmployeeLevel;
  managerId?: string;
  avatar?: string;
  email?: string;
  password?: string;
  // 身份证后六位（bcrypt hash），仅用于登录校验；任何接口返回时必须剔除
  idCardLast6Hash?: string;
  status?: 'active' | 'disabled' | 'inactive';
  createdAt?: Date;
  updatedAt?: Date;
}

// 指标评分（动态模板评分）
export interface MetricScore {
  metricId: string;
  metricName: string;
  metricCode: string;
  weight: number;
  score: number;     // 0.5-1.5 (L1-L5)
  level: ScoreLevel; // L1-L5
  comment?: string;
}

// 绩效记录
export interface PerformanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  department?: string;
  subDepartment?: string;
  employeeLevel?: EmployeeLevel;
  assessorId: string;
  assessorName?: string;
  month: string;

  // 模板相关（动态指标）
  templateId?: string;
  templateName?: string;
  departmentType?: string;
  metricScores?: MetricScore[];

  // 员工填写
  selfSummary: string;
  nextMonthPlan: string;
  employeeIssueTags?: string[];
  resourceNeedTags?: string[];
  improvementSuggestion?: string;
  suggestionAnonymous?: boolean;

  // 经理评分（旧版：兼容4项固定维度）
  taskCompletion: number;
  initiative: number;
  projectFeedback: number;
  qualityImprovement: number;
  totalScore: number;
  
  // 绩效等级
  level?: ScoreLevel;
  
  // 标准化分数
  normalizedScore?: number;
  
  // 经理评价
  managerComment: string;
  nextMonthWorkArrangement: string;
  evaluationKeywords?: string[];
  issueTypeTags?: string[];
  highlightTags?: string[];
  workTypeTags?: string[];
  improvementActionTags?: string[];
  issueAttributionTags?: string[];
  workloadTags?: string[];
  managerSuggestionTags?: string[];
  scoreEvidence?: string;
  monthlyStarRecommended?: boolean;
  monthlyStarCategory?: string;
  monthlyStarReason?: string;
  monthlyStarPublic?: boolean;
  
  // 分组排名
  groupType: 'high' | 'low';
  groupRank: number;
  crossDeptRank: number;
  departmentRank: number;
  companyRank: number;
  
  status: RecordStatus;
  
  // 任务冻结（超期自动冻结，仅HR可解冻）
  frozen?: boolean;
  deadline?: string; // 截止日期（下月3号）
  
  // 模拟数据标记
  isDemo?: boolean;
  
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// 月度任务
export interface MonthlyTask {
  id: string;
  managerId: string;
  month: string;
  tasks: TaskItem[];
  uploadedBy: string;
  uploadedAt?: Date;
}

export interface TaskItem {
  id: string;
  name: string;
  target: string;
  weight: number;
  completed: boolean;
  completionRate: number;
}



// 经理季度工作总结
export interface QuarterlySummary {
  id: string;
  managerId: string;
  managerName?: string;
  quarter: string;
  summary: string;
  nextQuarterPlan: string;
  status: 'draft' | 'submitted';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// 晋升/加薪申请
export type PromotionRequestStatus =
  | 'draft'
  | 'submitted'
  | 'manager_approved'
  | 'gm_approved'
  | 'hr_approved'
  | 'rejected';

export interface PromotionRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  department?: string;
  subDepartment?: string;
  employeeLevel?: EmployeeLevel;
  requesterId: string;
  requesterName?: string;
  requesterRole: 'employee' | 'manager';
  targetLevel: EmployeeLevel;
  targetPosition: string;
  raisePercentage: number;
  performanceSummary: string;
  skillSummary: string;
  competencySummary: string;
  workSummary: string;
  status: PromotionRequestStatus;
  nextRole?: EmployeeRole | null;
  managerComment?: string;
  managerApproverId?: string;
  managerApprovedAt?: Date | string;
  gmComment?: string;
  gmApproverId?: string;
  gmApprovedAt?: Date | string;
  hrComment?: string;
  hrApproverId?: string;
  hrApprovedAt?: Date | string;
  rejectedReason?: string;
  rejectedByRole?: 'manager' | 'gm' | 'hr';
  rejectedById?: string;
  rejectedAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  role: EmployeeRole;
  iat?: number;
  exp?: number;
}

// ============ 组织架构管理 ============
export interface Department {
  id: string;
  name: string;
  code: string;
  parentId?: string;
  managerId?: string;
  managerName?: string;
  sortOrder: number;
  status: 'active' | 'inactive';
  createdAt?: Date | string;
  updatedAt?: Date | string;
  children?: Department[];
}

export interface Position {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  departmentName?: string;
  level: EmployeeLevel;
  category: 'technical' | 'management' | 'support';
  description?: string;
  requirements?: string;
  status: 'active' | 'inactive';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============ 考核周期管理 ============
export type AssessmentCycleType = 'monthly' | 'quarterly' | 'annual' | 'probation';

export interface AssessmentCycle {
  id: string;
  name: string;
  type: AssessmentCycleType;
  year: number;
  startDate: string;
  endDate: string;
  selfAssessmentDeadline?: string;
  managerReviewDeadline?: string;
  hrReviewDeadline?: string;
  appealDeadline?: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  reminderDays: number;
  autoSubmit: boolean;
  excludeHolidays: boolean;
  description?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: 'national' | 'company';
}

// ============ 指标库管理 ============
export type MetricCategory = 'performance' | 'ability' | 'attitude' | 'bonus' | 'penalty';
export type MetricType = 'quantitative' | 'qualitative' | 'composite';
export type ScoreLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

export interface PerformanceMetric {
  id: string;
  name: string;
  code: string;
  category: MetricCategory;
  type: MetricType;
  description: string;
  scoringCriteria: ScoringCriterion[];
  weight: number;
  departmentIds?: string[];
  positionIds?: string[];
  applicableLevels: EmployeeLevel[];
  formula?: string;
  unit?: string;
  targetValue?: number;
  minValue: number;
  maxValue: number;
  dataSource?: string;
  status: 'active' | 'inactive';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface ScoringCriterion {
  level: ScoreLevel;
  score: number;
  description: string;
  examples?: string[];
}

export interface MetricTemplate {
  id: string;
  name: string;
  description?: string;
  positionId?: string;
  positionName?: string;
  metrics: {
    metricId: string;
    weight: number;
    required: boolean;
  }[];
  status: 'active' | 'inactive';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============ OKR/KPI 目标管理 ============

export interface StrategicObjective {
  id: string;
  title: string;
  description?: string;
  year: number;
  status: 'draft' | 'active' | 'completed' | 'cancelled';
  createdBy?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  // 新增字段
  type?: 'company-strategy' | 'company-key-work' | 'department-key-work';
  department?: string; // 仅部门重点工作需要
  content?: string; // 详细内容
  progress?: number; // 进度百分比
}

export type FeedbackCycle = 'weekly' | 'biweekly' | 'monthly' | 'quarterly';

export interface QuarterlyTarget {
  target: string;
  weight: number;
}

export interface MonthlyTargets {
  M1?: string;
  M2?: string;
  M3?: string;
  M4?: string;
  M5?: string;
  M6?: string;
  M7?: string;
  M8?: string;
  M9?: string;
  M10?: string;
  M11?: string;
  M12?: string;
}

export interface Objective {
  id: string;
  title: string;
  description?: string;
  level: 'company' | 'department' | 'individual';
  parentId?: string;
  strategicObjectiveId?: string;
  department?: string;
  ownerId?: string;
  year: number;
  quarter?: string;
  weight: number;
  progress: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'active' | 'completed' | 'cancelled';
  startDate?: Date | string;
  endDate?: Date | string;
  feedbackCycle?: FeedbackCycle;
  
  // 新增：目标拆解
  targetValue?: string;
  quarterlyTargets?: {
    Q1: QuarterlyTarget;
    Q2: QuarterlyTarget;
    Q3: QuarterlyTarget;
    Q4: QuarterlyTarget;
  };
  monthlyTargets?: MonthlyTargets;
  
  // 新增：员工确认
  employeeConfirmedAt?: Date | string;
  employeeFeedback?: string;
  
  // 新增：审批相关
  submittedAt?: Date | string;
  reviewedAt?: Date | string;
  reviewedBy?: string | number;
  reviewComment?: string;
  adjustmentReason?: string;
  
  createdAt?: Date | string;
  updatedAt?: Date | string;
  children?: Objective[];
  keyResults?: KeyResult[];
}

// 目标调整历史记录
export interface ObjectiveAdjustment {
  id: number;
  objectiveId: number;
  adjustedBy: number;
  adjustmentType: 'target_value' | 'quarterly_targets' | 'monthly_targets' | 'weight' | 'description';
  oldValue: string;  // JSON string
  newValue: string;  // JSON string
  reason?: string;
  createdAt: Date | string;
}

export interface OkrAssignment {
  id: string;
  objectiveId: string;
  assigneeId: string;
  assignedBy: string;
  deadline?: Date | string;
  message?: string;
  status: 'pending' | 'completed';
  createdAt?: Date | string;
}

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  metricType: 'number' | 'percentage' | 'boolean' | 'currency';
  targetValue?: number;
  currentValue: number;
  unit?: string;
  weight: number;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'at_risk';
  dueDate?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface KpiAssignment {
  id: string;
  employeeId: string;
  objectiveId?: string;
  keyResultId?: string;
  kpiName: string;
  targetValue?: number;
  actualValue: number;
  unit?: string;
  weight: number;
  score?: number;
  year: number;
  month?: string;
  status: 'pending' | 'submitted' | 'approved';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PerformanceContract {
  id: string;
  employeeId: string;
  managerId: string;
  year: number;
  objectivesSnapshot?: any;
  kpiSnapshot?: any;
  employeeSignedAt?: Date | string;
  managerSignedAt?: Date | string;
  status: 'draft' | 'pending_employee' | 'pending_manager' | 'signed' | 'revised';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// 目标进度（每月完成度追踪）
export interface GoalProgress {
  id: string;
  objectiveId: string;
  employeeId: string;
  year: number;
  month: number;
  
  // 员工填写
  employeeCompletionRate: number;  // 0-100
  employeeComment?: string;
  employeeSubmittedAt?: Date | string;
  
  // 经理审核
  managerCompletionRate?: number;  // 0-100
  managerComment?: string;
  managerReviewedAt?: Date | string;
  managerId?: string;
  
  // 状态
  status: 'draft' | 'employee_submitted' | 'manager_reviewed';
  
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface MonthlyReport {
  id: string;
  employeeId: string;
  year: number;
  month: number;
  summary?: string;
  achievements?: string;
  issues?: string;
  nextMonthPlan?: string;
  attachments?: any[];
  managerComment?: string;
  managerId?: string;
  commentedAt?: Date | string;
  status: 'draft' | 'submitted' | 'reviewed';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface PerformanceInterview {
  id: string;
  employeeId: string;
  interviewerId: string;
  year: number;
  interviewDate?: string;
  performanceSummary?: string;
  strengths?: string;
  improvements?: string;
  developmentPlan?: string;
  employeeFeedback?: string;
  agreedActions?: any[];
  status: 'scheduled' | 'completed' | 'cancelled';
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// ============ 附件管理 ============
export interface Attachment {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  relatedType: string; // 'objective' | 'kpi' | 'monthly-report'
  relatedId: string;
  uploadedBy: string;
  url?: string;
  createdAt?: Date | string;
}

// ============ 奖金管理 ============
export interface BonusRule {
  grade: string;
  coefficient: number;
  label: string;
  minScore: number;
  maxScore?: number;
}

export interface BonusConfig {
  id: string;
  rules: BonusRule[];
  updatedBy: string;
  updatedAt?: Date | string;
}

export interface BonusResult {
  id: string;
  employeeId: string;
  employeeName?: string;
  department?: string;
  year: number;
  quarter: number;
  score: number;
  grade: string;
  coefficient: number;
  baseSalary: number;
  bonus: number;
  adjusted: boolean;
  adjustedBy?: string;
  adjustedAt?: Date | string;
  createdAt?: Date | string;
}

// ============ 绩效申诉管理 ============
export interface Appeal {
  id: string;
  performanceRecordId: string;
  employeeId: string;
  employeeName?: string;
  department?: string;
  subDepartment?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  hrComment?: string;
  hrId?: string;
  hrName?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// ============ 自动化月度报告 ============
export interface MonthlyReportSummary {
  id: string;
  month: string;
  totalEmployees: number;
  participatedCount: number;
  draftCount: number;
  submittedCount: number;
  scoredCount: number;
  completedCount: number;
  participationRate: number;
  avgScore: number;
  maxScore: number;
  minScore: number;
  l5Count: number;
  l4Count: number;
  l3Count: number;
  l2Count: number;
  l1Count: number;
  departmentStats?: Record<string, { count: number; avgScore: number }>;
  anomalyReport?: any[];
  generatedAt: Date | string;
}

// ============ 绩效归档 ============
export interface PerformanceArchive {
  id: string;
  month: string;
  archiveData: Record<string, any>;
  snapshotSummary: Record<string, any>;
  archivedAt: Date | string;
  archivedBy?: string;
}

// ============ 自动化任务日志 ============
export interface AutomationLog {
  id: string;
  taskType: string;
  taskName?: string;
  status: 'running' | 'success' | 'failed';
  inputParams?: Record<string, any>;
  resultSummary?: Record<string, any>;
  errorMessage?: string;
  startedAt: Date | string;
  completedAt?: Date | string;
}
