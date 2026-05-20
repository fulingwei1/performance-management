// 员工级别
export type EmployeeLevel = 'senior' | 'intermediate' | 'junior' | 'assistant';

// 员工信息
export interface Employee {
  id: string;
  userId?: string | number;  // 别名，兼容不同代码中的引用
  name: string;
  department: string;
  subDepartment: string;
  wecomUserId?: string;
  role: 'employee' | 'manager' | 'gm' | 'hr' | 'admin';
  roles?: Array<'employee' | 'manager' | 'gm' | 'hr' | 'admin'>;
  roleLabels?: string[];
  capabilities?: {
    canManageTeam?: boolean;
    canManageSystem?: boolean;
    canSubmitSelfSummary?: boolean;
  };
  level: EmployeeLevel;
  managerId?: string;
  avatar?: string;
  workStatus?: 'active' | 'probation' | 'internship' | 'inactive' | 'retired';
  position?: string;
  joinDate?: string;
  phone?: string;
  status?: 'active' | 'inactive' | 'disabled';
  mustChangePassword?: boolean;
  hasIdCardLast6?: boolean;
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
  employeeIssueTags?: string[];
  resourceNeedTags?: string[];
  improvementSuggestion?: string;
  suggestionAnonymous?: boolean;
  
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
  evaluationKeywords?: string[];
  scoreEvidence?: string;
  issueTypeTags?: string[];
  highlightTags?: string[];
  workTypeTags?: string[];
  improvementActionTags?: string[];
  issueAttributionTags?: string[];
  workloadTags?: string[];
  managerSuggestionTags?: string[];
  monthlyStarRecommended?: boolean;
  monthlyStarCategory?: string;
  monthlyStarReason?: string;
  monthlyStarPublic?: boolean;
  interviewFormAttachment?: {
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    uploadedBy: string;
    uploadedAt: string;
  };
  
  // 排名
  departmentRank: number;
  companyRank: number;

  // 发布后对比口径
  companyAverageScore?: number | null;
  companyScoredCount?: number;
  departmentAverageScore?: number | null;
  departmentScoredCount?: number;
  isPublished?: boolean;
  quarterlySummary?: Record<string, unknown> | null;
  
  status: 'draft' | 'submitted' | 'scored' | 'completed' | 'not_submitted';
  createdAt: string;
  updatedAt: string;
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
  // 身份证后六位（演示环境也可兼容旧密码）
  idCardLast6: string;
}

// 分组配置
export interface GroupConfig {
  highLevels: EmployeeLevel[];
  lowLevels: EmployeeLevel[];
  crossDeptGroups: string[];
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

// ============ 考核模板 ============
export interface AssessmentTemplate {
  id: string;
  name: string;
  description?: string;
  departmentType: string;
  isDefault: boolean;
  status: string;
  createdAt: string;
  updatedAt?: string;
  metrics?: Array<{
    id: string;
    metricName: string;
    metricCode: string;
    weight: number;
    category: string;
    evaluationType: 'quantitative' | 'qualitative';
  }>;
  // 分配规则字段
  applicableRoles?: string[];
  applicableLevels?: string[];
  applicablePositions?: string[];
  priority?: number;
}
