// 员工级别
export type EmployeeLevel = 'senior' | 'intermediate' | 'junior' | 'assistant';

// 员工角色
export type EmployeeRole = 'employee' | 'manager' | 'gm' | 'hr';

// 绩效记录状态
export type RecordStatus = 'draft' | 'submitted' | 'scored' | 'completed';

// 员工信息
export interface Employee {
  id: string;
  name: string;
  department: string;
  subDepartment: string;
  role: EmployeeRole;
  level: EmployeeLevel;
  managerId?: string;
  avatar?: string;
  password?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

// 员工档案（扩展信息）
export interface EmployeeArchive extends Employee {
  // 部门层级
  thirdDepartment?: string;
  
  // 在职状态
  workStatus?: 'active' | 'probation' | 'internship' | 'inactive' | 'retired';
  
  // 岗位信息
  position?: string;
  
  // 入职信息
  joinDate?: string;
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
  phone?: string;
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
  
  // 状态
  status?: 'active' | 'inactive';
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
  
  // 员工填写
  selfSummary: string;
  nextMonthPlan: string;
  
  // 经理评分
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
  
  // 360度评分
  peerReviews?: PeerReview[];
  
  // 分组排名
  groupType: 'high' | 'low';
  groupRank: number;
  crossDeptRank: number;
  departmentRank: number;
  companyRank: number;
  
  status: RecordStatus;
  
  // 模拟数据标记
  isDemo?: boolean;
  
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// 360度评分
export interface PeerReview {
  id: string;
  reviewerId: string;
  reviewerName?: string;
  revieweeId: string;
  revieweeName?: string;
  recordId: string;
  collaboration: number;
  professionalism: number;
  communication: number;
  comment?: string;
  month: string;
  createdAt?: Date;
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
  addedAt?: Date;
}

// 总经理评分
export interface GMManagerScore {
  id: string;
  managerId: string;
  managerName?: string;
  quarter: string;
  monthlyTaskCompletion: number;
  temporaryWorkCompletion: number;
  workload: number;
  talentDevelopment: number;
  totalScore: number;
  gmComment: string;
  rank: number;
  status: 'pending' | 'scored' | 'completed';
  createdAt?: Date;
  updatedAt?: Date;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  role: EmployeeRole;
  iat?: number;
  exp?: number;
}

// API响应格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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
  createdAt?: Date | string;
  updatedAt?: Date | string;
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
