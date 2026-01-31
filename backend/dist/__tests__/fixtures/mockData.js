"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validScoreData = exports.validSummaryData = exports.validEmployeeData = exports.invalidLoginData = exports.validLoginData = exports.mockPerformanceRecords = exports.mockEmployees = void 0;
// 注意：这些ID必须与init-data.ts中初始化的员工ID一致
exports.mockEmployees = [
    {
        id: 'm001',
        username: 'manager001',
        password: '$2a$10$testhashedpassword123',
        name: '于振华',
        email: 'manager001@ate.com',
        role: 'manager',
        department: '工程技术中心',
        subDepartment: '测试部',
        level: 'senior',
        position: '技术经理',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
    },
    {
        id: 'e001',
        username: 'emp001',
        password: '$2a$10$testhashedpassword456',
        name: '周欢欢',
        email: 'emp001@ate.com',
        role: 'employee',
        department: '工程技术中心',
        subDepartment: '测试部',
        level: 'intermediate',
        position: '测试工程师',
        managerId: 'm001',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
    },
    {
        id: 'hr001',
        username: 'hr001',
        password: '$2a$10$testhashedpassword789',
        name: '林作倩',
        email: 'hr001@ate.com',
        role: 'hr',
        department: '人力资源部',
        subDepartment: '人力资源部',
        level: 'senior',
        position: 'HR经理',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
    },
    {
        id: 'hr002',
        username: 'hr002',
        password: '$2a$10$testhashedpassword790',
        name: '符凌维',
        email: 'hr002@ate.com',
        role: 'hr',
        department: '人力资源部',
        subDepartment: '人力资源部',
        level: 'senior',
        position: 'HR经理',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01')
    }
];
exports.mockPerformanceRecords = [
    {
        id: '1',
        employeeId: '2',
        employeeName: '李员工',
        assessorId: '1',
        assessorName: '张经理',
        department: '研发部',
        subDepartment: '前端组',
        employeeLevel: 'intermediate',
        month: '2024-01',
        selfSummary: '本月完成了前端开发任务',
        nextMonthPlan: '下月计划完成移动端适配',
        taskCompletion: 1.2,
        initiative: 1.1,
        projectFeedback: 1.0,
        qualityImprovement: 1.0,
        totalScore: 1.15,
        managerComment: '表现优秀',
        nextMonthWorkArrangement: '继续跟进移动端项目',
        peerReviews: [],
        groupType: 'high',
        groupRank: 1,
        crossDeptRank: 2,
        departmentRank: 1,
        companyRank: 5,
        status: 'completed',
        createdAt: new Date('2024-01-15'),
        updatedAt: new Date('2024-01-15')
    },
    {
        id: '2',
        employeeId: '2',
        employeeName: '李员工',
        assessorId: '1',
        assessorName: '张经理',
        department: '研发部',
        subDepartment: '前端组',
        employeeLevel: 'intermediate',
        month: '2024-02',
        selfSummary: '完成了移动端适配工作',
        nextMonthPlan: '优化页面性能',
        taskCompletion: 1.0,
        initiative: 1.2,
        projectFeedback: 1.1,
        qualityImprovement: 1.0,
        totalScore: 1.08,
        managerComment: '良好',
        nextMonthWorkArrangement: '参与性能优化项目',
        peerReviews: [],
        groupType: 'high',
        groupRank: 2,
        crossDeptRank: 3,
        departmentRank: 2,
        companyRank: 8,
        status: 'completed',
        createdAt: new Date('2024-02-15'),
        updatedAt: new Date('2024-02-15')
    }
];
exports.validLoginData = {
    username: '于振华',
    password: '123456',
    role: 'manager'
};
exports.invalidLoginData = {
    username: 'wronguser',
    password: 'wrongpassword',
    role: 'manager'
};
exports.validEmployeeData = {
    id: 'newemp001',
    password: 'password123',
    name: '新员工',
    department: '研发部',
    subDepartment: '测试组',
    role: 'employee',
    level: 'intermediate',
    managerId: 'm001'
};
exports.validSummaryData = {
    month: '2024-03',
    selfSummary: '本月完成了测试用例编写',
    nextMonthPlan: '下月计划完成更多任务',
    taskCompletion: 1.1,
    initiative: 1.0,
    projectFeedback: 1.0,
    qualityImprovement: 1.0
};
exports.validScoreData = {
    id: 'rec-e034-2024-03',
    taskCompletion: 1.2,
    initiative: 1.1,
    projectFeedback: 1.0,
    qualityImprovement: 1.0,
    managerComment: '工作表现优秀',
    nextMonthWorkArrangement: '继续负责当前项目'
};
//# sourceMappingURL=mockData.js.map