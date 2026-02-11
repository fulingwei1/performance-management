// 员工级别
export type EmployeeLevel = 'senior' | 'intermediate' | 'junior' | 'assistant';

// 员工信息
export interface Employee {
  id: string;
  name: string;
  department: string;
  subDepartment: string;
  role: 'employee' | 'manager' | 'gm' | 'hr';
  level: EmployeeLevel;
  managerId?: string;
  avatar?: string;
  workStatus?: 'active' | 'probation' | 'internship' | 'inactive' | 'retired';
  position?: string;
  joinDate?: string;
  phone?: string;
  status?: 'active' | 'inactive';
}

// 员工档案（完整信息）
export interface EmployeeArchive extends Employee {
  // 部门层级
  thirdDepartment?: string;
  
  // 入职信息
  isRegular?: boolean;
  regularDate?: string;
  
  // 合同信息
  contractStart?: string;
  contractEnd?: string;
  
  // 个人信息
  gender?: string;
  idCard?: string;
  birthDate?: string;
  age?: number;
  ethnicity?: string;
  politicalStatus?: string;
  maritalStatus?: string;
  
  // 联系方式
  email?: string;
  
  // 身体信息
  height?: number;
  weight?: number;
  
  // 地址信息
  birthplace?: string;
  homeAddress?: string;
  currentAddress?: string;
  
  // 紧急联系人
  emergencyContact?: string;
  emergencyPhone?: string;
  
  // 教育信息
  school?: string;
  graduationDate?: string;
  major?: string;
  education?: string;
  
  // 财务信息
  bankAccount?: string;
  socialSecurityNumber?: string;
  providentFundNumber?: string;
}

// 月度任务（由HR上传）
export interface MonthlyTask {
  id: string;
  managerId: string;
  month: string;
  tasks: {
    id: string;
    name: string;
    target: string;
    weight: number;
    completed: boolean;
    completionRate: number;
  }[];
  uploadedBy: string;
  uploadedAt: string;
}

// 临时工作
export interface TemporaryWork {
  id: string;
  managerId: string;
  month: string;
  name: string;
  description: string;
  completed: boolean;
  completionRate: number;
  addedBy: string;
  addedAt: string;
}

// 部门人才培养指标
export interface TalentDevelopment {
  id: string;
  managerId: string;
  quarter: string; // 2025-Q1格式
  indicators: {
    trainingSessions: number; // 培训场次
    employeesTrained: number; // 培训人数
    promotions: number; // 晋升人数
    newHires: number; // 新入职人数
    turnoverRate: number; // 离职率
    skillAssessments: number; // 技能评估次数
  };
  notes: string;
}

// 总经理对部门经理的评分
export interface GMManagerScore {
  id: string;
  managerId: string;
  managerName: string;
  quarter: string;
  
  // 年度经营计划月度任务完成情况 (40%)
  monthlyTaskCompletion: number;
  
  // 临时工作完成情况 (25%)
  temporaryWorkCompletion: number;
  
  // 工作量大小 (20%)
  workload: number;
  
  // 部门人才培养 (15%)
  talentDevelopment: number;
  
  // 总得分
  totalScore: number;
  
  // 评价
  gmComment: string;
  
  // 排名
  rank: number;
  
  status: 'pending' | 'scored' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// 经理季度工作总结
export interface QuarterlySummary {
  id: string;
  managerId: string;
  managerName: string;
  quarter: string; // 2026-Q1
  summary: string;
  nextQuarterPlan: string;
  status: 'draft' | 'submitted';
  createdAt: string;
  updatedAt: string;
}

// 晋升/加薪申请
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
  status: 'draft' | 'submitted' | 'manager_approved' | 'gm_approved' | 'hr_approved' | 'rejected';
  nextRole?: 'manager' | 'gm' | 'hr' | null;
  managerComment?: string;
  gmComment?: string;
  hrComment?: string;
  rejectedReason?: string;
  rejectedByRole?: 'manager' | 'gm' | 'hr';
  createdAt?: string;
  updatedAt?: string;
  managerApprovedAt?: string;
  gmApprovedAt?: string;
  hrApprovedAt?: string;
}

// 绩效考核记录
export interface PerformanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  subDepartment: string;
  employeeLevel: EmployeeLevel;
  assessorId: string;
  assessorName: string;
  month: string;
  
  // 员工填写
  selfSummary: string;
  nextMonthPlan: string;
  
  // AI建议
  aiSuggestion?: AISuggestion;
  
  // 经理评分 (L1-L5对应0.5-1.5)
  taskCompletion: number;
  initiative: number;
  projectFeedback: number;
  qualityImprovement: number;
  
  // 标准化分数（消除经理习惯差异）
  normalizedScore?: number;
  
  // 计算得分
  totalScore: number;
  
  // 分组排名
  groupType: 'high' | 'low';
  groupRank: number;
  crossDeptRank: number;
  
  // 经理评价
  managerComment: string;
  nextMonthWorkArrangement: string;
  
  // 360度评分
  peerReviews: PeerReview[];
  
  // 排名
  departmentRank: number;
  companyRank: number;
  
  status: 'draft' | 'submitted' | 'scored' | 'completed';
  createdAt: string;
  updatedAt: string;
}

// AI建议
export interface AISuggestion {
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestedScores: {
    taskCompletion: number;
    initiative: number;
    projectFeedback: number;
    qualityImprovement: number;
  };
  reasoning: string;
}

// 360度评分
export interface PeerReview {
  id: string;
  reviewerId: string;
  reviewerName: string;
  revieweeId: string;
  recordId: string;
  
  collaboration: number;
  professionalism: number;
  communication: number;
  
  comment?: string;
  createdAt: string;
}

// 评分等级
export type ScoreLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

// 评分维度
export interface ScoreDimension {
  key: string;
  name: string;
  weight: number;
  description: string;
}

// 统计信息
export interface Statistics {
  totalEmployees: number;
  averageScore: number;
  excellentRate: number;
  needImprovementCount: number;
}

// 筛选条件
export interface Filters {
  department?: string;
  subDepartment?: string;
  month?: string;
  status?: string;
  level?: EmployeeLevel;
  groupType?: 'high' | 'low';
}

// 用户登录信息
export interface LoginCredentials {
  username: string;
  password: string;
  role: 'employee' | 'manager' | 'gm' | 'hr';
}

// 分组配置
export interface GroupConfig {
  highLevels: EmployeeLevel[];
  lowLevels: EmployeeLevel[];
  crossDeptGroups: string[];
}

// 360度评分分配
export interface PeerReviewAssignment {
  revieweeId: string;
  revieweeName: string;
  reviewers: {
    id: string;
    name: string;
  }[];
}

// 报表数据
export interface ReportData {
  month: string;
  department: string;
  totalEmployees: number;
  averageScore: number;
  excellentCount: number;
  goodCount: number;
  normalCount: number;
  needImprovementCount: number;
}

// 标准化报告
export interface NormalizationReport {
  managerId: string;
  managerName: string;
  averageScore: number;
  stdDeviation: number;
  minScore: number;
  maxScore: number;
  count: number;
  strictness: {
    level: 'strict' | 'normal' | 'lenient';
    label: string;
    color: string;
  };
  adjustmentNeeded: boolean;
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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface OrgNode {
  id: string;
  name: string;
  type: 'company' | 'department' | 'position' | 'employee';
  data: Department | Position | Employee;
  children?: OrgNode[];
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
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentCalendar {
  year: number;
  cycles: AssessmentCycle[];
  holidays: Holiday[];
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
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
  updatedAt: string;
}

// ============ 考核流程扩展 ============
export interface AssessmentAppeal {
  id: string;
  recordId: string;
  employeeId: string;
  employeeName: string;
  reason: string;
  evidence?: string;
  status: 'pending' | 'reviewing' | 'approved' | 'rejected';
  submitTime: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewComment?: string;
  reviewTime?: string;
  originalScore: number;
  adjustedScore?: number;
}
