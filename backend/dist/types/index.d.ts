export type EmployeeLevel = 'senior' | 'intermediate' | 'junior' | 'assistant';
export type EmployeeRole = 'employee' | 'manager' | 'gm' | 'hr' | 'admin';
export type RecordStatus = 'draft' | 'submitted' | 'scored' | 'completed';
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
    status?: 'active' | 'disabled' | 'inactive';
    createdAt?: Date;
    updatedAt?: Date;
}
export interface EmployeeArchive extends Employee {
    thirdDepartment?: string;
    workStatus?: 'active' | 'probation' | 'internship' | 'inactive' | 'retired';
    position?: string;
    joinDate?: string;
    isRegular?: boolean;
    regularDate?: string;
    contractStart?: string;
    contractEnd?: string;
    gender?: string;
    idCard?: string;
    birthDate?: string;
    age?: number;
    ethnicity?: string;
    politicalStatus?: string;
    maritalStatus?: string;
    phone?: string;
    email?: string;
    height?: number;
    weight?: number;
    birthplace?: string;
    homeAddress?: string;
    currentAddress?: string;
    emergencyContact?: string;
    emergencyPhone?: string;
    school?: string;
    graduationDate?: string;
    major?: string;
    education?: string;
    bankAccount?: string;
    socialSecurityNumber?: string;
    providentFundNumber?: string;
    status?: 'active' | 'inactive' | 'disabled';
}
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
    selfSummary: string;
    nextMonthPlan: string;
    taskCompletion: number;
    initiative: number;
    projectFeedback: number;
    qualityImprovement: number;
    totalScore: number;
    level?: ScoreLevel;
    normalizedScore?: number;
    managerComment: string;
    nextMonthWorkArrangement: string;
    peerReviews?: PeerReview[];
    groupType: 'high' | 'low';
    groupRank: number;
    crossDeptRank: number;
    departmentRank: number;
    companyRank: number;
    status: RecordStatus;
    isDemo?: boolean;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}
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
export type PromotionRequestStatus = 'draft' | 'submitted' | 'manager_approved' | 'gm_approved' | 'hr_approved' | 'rejected';
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
export interface JWTPayload {
    userId: string;
    role: EmployeeRole;
    iat?: number;
    exp?: number;
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    message?: string;
    error?: string;
}
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
export interface StrategicObjective {
    id: string;
    title: string;
    description?: string;
    year: number;
    status: 'draft' | 'active' | 'completed' | 'cancelled';
    createdBy?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
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
    status: 'draft' | 'active' | 'completed' | 'cancelled';
    startDate?: Date | string;
    endDate?: Date | string;
    feedbackCycle?: FeedbackCycle;
    targetValue?: string;
    quarterlyTargets?: {
        Q1: QuarterlyTarget;
        Q2: QuarterlyTarget;
        Q3: QuarterlyTarget;
        Q4: QuarterlyTarget;
    };
    monthlyTargets?: MonthlyTargets;
    employeeConfirmedAt?: Date | string;
    employeeFeedback?: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
    children?: Objective[];
    keyResults?: KeyResult[];
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
export interface GoalProgress {
    id: string;
    objectiveId: string;
    employeeId: string;
    year: number;
    month: number;
    employeeCompletionRate: number;
    employeeComment?: string;
    employeeSubmittedAt?: Date | string;
    managerCompletionRate?: number;
    managerComment?: string;
    managerReviewedAt?: Date | string;
    managerId?: string;
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
export interface Attachment {
    id: string;
    filename: string;
    originalName: string;
    mimeType: string;
    size: number;
    relatedType: string;
    relatedId: string;
    uploadedBy: string;
    url?: string;
    createdAt?: Date | string;
}
export interface PeerReviewCycle {
    id: string;
    title: string;
    year: number;
    quarter: number;
    startDate: string;
    endDate: string;
    participants: string[];
    status: 'draft' | 'active' | 'completed';
    createdBy: string;
    createdAt?: Date | string;
    updatedAt?: Date | string;
}
export interface PeerReviewTask {
    id: string;
    cycleId: string;
    reviewerId: string;
    revieweeId: string;
    scores?: PeerReviewScore[];
    status: 'pending' | 'submitted';
    submittedAt?: Date | string;
    createdAt?: Date | string;
}
export interface PeerReviewScore {
    dimension: string;
    score: number;
    comment?: string;
}
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
//# sourceMappingURL=index.d.ts.map