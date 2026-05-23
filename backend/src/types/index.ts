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
  // 是否已录入身份证后六位；仅返回布尔值，不返回原值或 hash
  hasIdCardLast6?: boolean;
  status?: 'active' | 'disabled' | 'inactive';
  mustChangePassword?: boolean;
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

export interface PerformanceInterviewFormAttachment {
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  uploadedAt: Date | string;
  path?: string;
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
  interviewFormAttachment?: PerformanceInterviewFormAttachment;
  
  // 分组排名
  groupType: 'all' | 'high' | 'low' | string;
  groupRank: number;
  crossDeptRank: number;
  departmentRank: number;
  companyRank: number;
  
  status: RecordStatus;
  
  // 任务冻结（超期自动冻结，仅HR可解冻）
  frozen?: boolean;
  deadline?: string; // 截止日期（下月3号）

  // 演示数据标记
  isDemo?: boolean;
  
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

export type ScoreLevel = 'L1' | 'L2' | 'L3' | 'L4' | 'L5';

// ============ 登录日志 ============
export interface LoginLog {
  id: string;
  employeeId: string;
  employeeName: string;
  role: EmployeeRole;
  department: string;
  subDepartment: string;
  loginTime: Date;
  loginMethod: 'idCard' | 'password';
  loginIp: string;
  userAgent: string;
  success: boolean;
  failureReason?: string;
}
