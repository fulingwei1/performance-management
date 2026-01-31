#!/usr/bin/env node
/**
 * ATE绩效管理系统后端服务 - Standalone版本
 * 无需外部依赖，使用Node.js内置模块
 */

const http = require('http');
const crypto = require('crypto');
const url = require('url');

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'performance_system_secret_key_2024';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

// 内存存储
const memoryStore = {
  employees: new Map(),
  performanceRecords: new Map(),
  metrics: [
    { key: 'taskCompletion', name: '任务完成', weight: 40, description: '按时完成任务的质量和数量' },
    { key: 'initiative', name: '主动性', weight: 30, description: '主动承担责任和解决问题' },
    { key: 'projectFeedback', name: '项目反馈', weight: 20, description: '在项目中的表现和反馈' },
    { key: 'qualityImprovement', name: '质量改进', weight: 10, description: '持续改进工作质量' }
  ],
  organization: null
};

// 简单的bcrypt模拟（使用SHA256）
const bcrypt = {
  hash: async (password, saltRounds) => {
    return crypto.createHash('sha256').update(password + 'salt').digest('hex');
  },
  compare: async (password, hash) => {
    const hashed = crypto.createHash('sha256').update(password + 'salt').digest('hex');
    return hashed === hash;
  }
};

// 简单的JWT实现
const jwt = {
  sign: (payload, secret, options) => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
  },
  verify: (token, secret) => {
    const [header, body, signature] = token.split('.');
    const expectedSig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSig) throw new Error('Invalid signature');
    return JSON.parse(Buffer.from(body, 'base64url').toString());
  }
};

// 初始化员工数据
const initialEmployees = [
  { id: 'm001', name: '于振华', department: '工程技术中心', subDepartment: '测试部', role: 'manager', level: 'senior', managerId: null },
  { id: 'm002', name: '张丙波', department: '工程技术中心', subDepartment: '机械部', role: 'manager', level: 'senior', managerId: null },
  { id: 'm003', name: '王俊', department: '工程技术中心', subDepartment: 'PLC', role: 'manager', level: 'senior', managerId: null },
  { id: 'm004', name: '黎佩锋', department: '工程技术中心', subDepartment: '技术开发部-软件组', role: 'manager', level: 'senior', managerId: null },
  { id: 'm005', name: '梁柱', department: '工程技术中心', subDepartment: '技术开发部-电子硬件组', role: 'manager', level: 'senior', managerId: null },
  { id: 'm006', name: '周定炫', department: '工程技术中心', subDepartment: '售前技术部', role: 'manager', level: 'senior', managerId: null },
  { id: 'gm001', name: '郑汝才', department: '总经办', subDepartment: '总经理办公室', role: 'gm', level: 'senior', managerId: null },
  { id: 'hr001', name: '林作倩', department: '人力资源部', subDepartment: '人力资源部', role: 'hr', level: 'senior', managerId: null },
  { id: 'hr002', name: '符凌维', department: '人力资源部', subDepartment: '人力资源部', role: 'hr', level: 'senior', managerId: null },
  { id: 'e001', name: '周欢欢', department: '工程技术中心', subDepartment: '测试部', role: 'employee', level: 'intermediate', managerId: 'm001' },
  { id: 'e002', name: '卢成桢', department: '工程技术中心', subDepartment: '测试部', role: 'employee', level: 'senior', managerId: 'm001' },
  { id: 'e003', name: '杨明博', department: '工程技术中心', subDepartment: '测试部', role: 'employee', level: 'junior', managerId: 'm001' },
  { id: 'e004', name: '张海波', department: '工程技术中心', subDepartment: '测试部', role: 'employee', level: 'intermediate', managerId: 'm001' },
  { id: 'e005', name: '庄松滨', department: '工程技术中心', subDepartment: '测试部', role: 'employee', level: 'junior', managerId: 'm001' },
  { id: 'e006', name: '刘孙伟', department: '工程技术中心', subDepartment: '测试部', role: 'employee', level: 'assistant', managerId: 'm001' },
  { id: 'e007', name: '符慰', department: '工程技术中心', subDepartment: '测试部', role: 'employee', level: 'intermediate', managerId: 'm001' },
  { id: 'e008', name: '林海', department: '工程技术中心', subDepartment: '测试部', role: 'employee', level: 'senior', managerId: 'm001' },
  { id: 'e009', name: '丁盼', department: '工程技术中心', subDepartment: '测试部', role: 'employee', level: 'junior', managerId: 'm001' },
  { id: 'e010', name: '李志文', department: '工程技术中心', subDepartment: '测试部', role: 'employee', level: 'assistant', managerId: 'm001' },
  { id: 'e011', name: '刘伟', department: '工程技术中心', subDepartment: '测试部', role: 'employee', level: 'intermediate', managerId: 'm001' },
  { id: 'e012', name: '肖英明', department: '工程技术中心', subDepartment: '测试部', role: 'employee', level: 'junior', managerId: 'm001' },
  { id: 'e013', name: '刘万成', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'senior', managerId: 'm002' },
  { id: 'e014', name: '房思琦', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'intermediate', managerId: 'm002' },
  { id: 'e015', name: '王玉梅', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'junior', managerId: 'm002' },
  { id: 'e016', name: '李学伟', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'senior', managerId: 'm002' },
  { id: 'e017', name: '洪国安', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'intermediate', managerId: 'm002' },
  { id: 'e018', name: '丘文华', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'junior', managerId: 'm002' },
  { id: 'e019', name: '张小川', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'assistant', managerId: 'm002' },
  { id: 'e020', name: '黄云华', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'intermediate', managerId: 'm002' },
  { id: 'e021', name: '杜磊', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'senior', managerId: 'm003' },
  { id: 'e022', name: '陈泽顺', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'intermediate', managerId: 'm003' },
  { id: 'e023', name: '刘钊玲', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'junior', managerId: 'm003' },
  { id: 'e024', name: '陈东洲', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'senior', managerId: 'm003' },
  { id: 'e025', name: '黄雷', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'intermediate', managerId: 'm003' },
  { id: 'e026', name: '温日波', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'junior', managerId: 'm003' },
  { id: 'e027', name: '马伟', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'assistant', managerId: 'm003' },
  { id: 'e028', name: '曾均佳', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'intermediate', managerId: 'm003' },
];

// 初始化数据
initialEmployees.forEach(emp => {
  memoryStore.employees.set(emp.id, {
    ...emp,
    password: crypto.createHash('sha256').update('123456' + 'salt').digest('hex')
  });
});

console.log(`✅ 内存数据库初始化完成，加载了 ${memoryStore.employees.size} 名员工`);

// 获取分组类型
const getGroupType = (level) => {
  return ['senior', 'intermediate'].includes(level) ? 'high' : 'low';
};

// 初始化绩效记录数据
const initializePerformanceRecords = () => {
  const currentMonth = '2026-01';
  
  Array.from(memoryStore.employees.values())
    .filter(emp => emp.role === 'employee')
    .forEach(employee => {
      // 为每个员工创建当月的绩效记录
      const recordId = `rec-${employee.id}-${currentMonth}`;
      
      // 如果记录不存在，则创建
      if (!memoryStore.performanceRecords.has(recordId)) {
        const manager = memoryStore.employees.get(employee.managerId);
        memoryStore.performanceRecords.set(recordId, {
          id: recordId,
          employeeId: employee.id,
          assessorId: employee.managerId,
          month: currentMonth,
          selfSummary: `${employee.name}的${currentMonth}月份工作总结`,
          nextMonthPlan: `${employee.name}的${currentMonth}月份工作计划`,
          taskCompletion: 1.0,
          initiative: 1.0,
          projectFeedback: 1.0,
          qualityImprovement: 1.0,
          totalScore: 1.0,
          managerComment: '',
          nextMonthWorkArrangement: '',
          groupType: getGroupType(employee.level),
          groupRank: 1,
          crossDeptRank: 1,
          departmentRank: 1,
          companyRank: 1,
          status: 'submitted',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
  
  console.log(`✅ 绩效记录初始化完成，创建了 ${memoryStore.performanceRecords.size} 条记录`);
};

initializePerformanceRecords();

// 解析请求体
const parseBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        resolve({});
      }
    });
  });
};

// 发送响应
const sendResponse = (res, statusCode, data) => {
  res.writeHead(statusCode, { ...corsHeaders, 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

// 认证中间件
const authenticate = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  try {
    return jwt.verify(authHeader.substring(7), JWT_SECRET);
  } catch (e) {
    return null;
  }
};

// 路由处理
const routes = {
  // 健康检查
  'GET /health': (req, res) => {
    sendResponse(res, 200, { success: true, message: '服务器运行正常', timestamp: new Date().toISOString() });
  },

  // 登录
  'POST /api/auth/login': async (req, res) => {
    const body = await parseBody(req);
    const { username, password, role } = body;
    
    let employee = null;
    for (const emp of memoryStore.employees.values()) {
      if (emp.name === username) {
        employee = emp;
        break;
      }
    }
    
    if (!employee) {
      return sendResponse(res, 401, { success: false, error: '用户名或密码错误' });
    }
    
    if (employee.role !== role) {
      return sendResponse(res, 401, { success: false, error: '角色不匹配' });
    }
    
    const hashedPassword = crypto.createHash('sha256').update(password + 'salt').digest('hex');
    if (hashedPassword !== employee.password) {
      return sendResponse(res, 401, { success: false, error: '用户名或密码错误' });
    }
    
    const token = jwt.sign({ userId: employee.id, role: employee.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userInfo } = employee;
    
    sendResponse(res, 200, { success: true, data: { user: userInfo, token }, message: '登录成功' });
  },

  // 获取当前用户
  'GET /api/auth/me': (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    const employee = memoryStore.employees.get(user.userId);
    if (!employee) {
      return sendResponse(res, 404, { success: false, error: '用户不存在' });
    }
    
    const { password, ...userInfo } = employee;
    sendResponse(res, 200, { success: true, data: userInfo });
  },

  // 获取所有员工
  'GET /api/employees': (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    const employees = Array.from(memoryStore.employees.values()).map(({ password, ...rest }) => rest);
    sendResponse(res, 200, { success: true, data: employees });
  },

  // 获取所有经理
  'GET /api/employees/managers': (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    const managers = Array.from(memoryStore.employees.values())
      .filter(emp => emp.role === 'manager')
      .map(({ password, ...rest }) => rest);
    sendResponse(res, 200, { success: true, data: managers });
  },

  // 获取下属
  'GET /api/employees/subordinates': (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'manager') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    const subordinates = Array.from(memoryStore.employees.values())
      .filter(emp => emp.managerId === user.userId)
      .map(({ password, ...rest }) => rest);
    sendResponse(res, 200, { success: true, data: subordinates });
  },

  // 获取我的绩效记录
  'GET /api/performance/my-records': (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    const records = Array.from(memoryStore.performanceRecords.values())
      .filter(r => r.employeeId === user.userId)
      .map(r => {
        const emp = memoryStore.employees.get(r.employeeId);
        const assessor = memoryStore.employees.get(r.assessorId);
        return {
          ...r,
          employeeName: emp?.name || '',
          department: emp?.department || '',
          subDepartment: emp?.subDepartment || '',
          employeeLevel: emp?.level,
          assessorName: assessor?.name || ''
        };
      });
    sendResponse(res, 200, { success: true, data: records });
  },

  // 获取团队绩效记录（按月查询）
  'GET /api/performance/team-records': (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'manager') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    const parsedUrl = url.parse(req.url, true);
    const month = parsedUrl.query.month;
    
    const subordinateIds = Array.from(memoryStore.employees.values())
      .filter(emp => emp.managerId === user.userId)
      .map(emp => emp.id);
    
    let records = Array.from(memoryStore.performanceRecords.values())
      .filter(r => subordinateIds.includes(r.employeeId));
    
    if (month) {
      records = records.filter(r => r.month === month);
    }
    
    records = records.map(r => {
      const emp = memoryStore.employees.get(r.employeeId);
      const assessor = memoryStore.employees.get(r.assessorId);
      return {
        ...r,
        employeeName: emp?.name || '',
        department: emp?.department || '',
        subDepartment: emp?.subDepartment || '',
        employeeLevel: emp?.level,
        assessorName: assessor?.name || ''
      };
    });
    
    sendResponse(res, 200, { success: true, data: records });
  },

  // 获取员工绩效历史
  'GET /api/performance/employee/:employeeId/history': (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    const parsedUrl = url.parse(req.url, true);
    const employeeId = parsedUrl.pathname.split('/').pop();
    
    // 检查权限：HR或该员工的经理可以查看
    const employee = memoryStore.employees.get(employeeId);
    if (!employee) {
      return sendResponse(res, 404, { success: false, error: '员工不存在' });
    }
    
    if (user.role !== 'hr' && employee.managerId !== user.userId) {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    // 获取该员工的所有绩效记录
    let records = Array.from(memoryStore.performanceRecords.values())
      .filter(r => r.employeeId === employeeId && (r.status === 'completed' || r.status === 'scored'))
      .sort((a, b) => b.month.localeCompare(a.month));
    
    records = records.map(r => {
      const emp = memoryStore.employees.get(r.employeeId);
      const assessor = memoryStore.employees.get(r.assessorId);
      return {
        ...r,
        employeeName: emp?.name || '',
        department: emp?.department || '',
        subDepartment: emp?.subDepartment || '',
        employeeLevel: emp?.level,
        assessorName: assessor?.name || ''
      };
    });
    
    sendResponse(res, 200, { success: true, data: records });
  },

  // 提交工作总结
  'POST /api/performance/summary': async (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'employee') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    const body = await parseBody(req);
    const { month, selfSummary, nextMonthPlan } = body;
    
    const employee = memoryStore.employees.get(user.userId);
    if (!employee) {
      return sendResponse(res, 404, { success: false, error: '员工不存在' });
    }
    
    const recordId = `rec-${employee.id}-${month}`;
    const record = {
      id: recordId,
      employeeId: employee.id,
      assessorId: employee.managerId || '',
      month,
      selfSummary,
      nextMonthPlan,
      taskCompletion: 1.0,
      initiative: 1.0,
      projectFeedback: 1.0,
      qualityImprovement: 1.0,
      totalScore: 0,
      managerComment: '',
      nextMonthWorkArrangement: '',
      peerReviews: [],
      groupType: getGroupType(employee.level),
      groupRank: 0,
      crossDeptRank: 0,
      departmentRank: 0,
      companyRank: 0,
      status: 'submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    memoryStore.performanceRecords.set(recordId, record);
    
    const emp = memoryStore.employees.get(record.employeeId);
    const assessor = memoryStore.employees.get(record.assessorId);
    
    sendResponse(res, 200, {
      success: true,
      data: {
        ...record,
        employeeName: emp?.name || '',
        department: emp?.department || '',
        subDepartment: emp?.subDepartment || '',
        employeeLevel: emp?.level,
        assessorName: assessor?.name || ''
      },
      message: '工作总结提交成功'
    });
  },

  // 经理评分
  'POST /api/performance/score': async (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'manager') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    const body = await parseBody(req);
    const { id, taskCompletion, initiative, projectFeedback, qualityImprovement, managerComment, nextMonthWorkArrangement } = body;
    
    const record = memoryStore.performanceRecords.get(id);
    if (!record) {
      return sendResponse(res, 404, { success: false, error: '记录不存在' });
    }
    
    const totalScore = taskCompletion * 0.4 + initiative * 0.3 + projectFeedback * 0.2 + qualityImprovement * 0.1;
    
    record.taskCompletion = taskCompletion;
    record.initiative = initiative;
    record.projectFeedback = projectFeedback;
    record.qualityImprovement = qualityImprovement;
    record.totalScore = parseFloat(totalScore.toFixed(2));
    record.managerComment = managerComment;
    record.nextMonthWorkArrangement = nextMonthWorkArrangement;
    record.status = 'completed';
    record.updatedAt = new Date().toISOString();
    
    memoryStore.performanceRecords.set(id, record);
    
    // 更新排名
    const month = record.month;
    const monthRecords = Array.from(memoryStore.performanceRecords.values())
      .filter(r => r.month === month && r.status === 'completed');
    
    monthRecords.sort((a, b) => b.totalScore - a.totalScore);
    monthRecords.forEach((r, index) => {
      const rec = memoryStore.performanceRecords.get(r.id);
      if (rec) {
        rec.companyRank = index + 1;
        memoryStore.performanceRecords.set(r.id, rec);
      }
    });
    
    const emp = memoryStore.employees.get(record.employeeId);
    const assessor = memoryStore.employees.get(record.assessorId);
    
    sendResponse(res, 200, {
      success: true,
      data: {
        ...record,
        employeeName: emp?.name || '',
        department: emp?.department || '',
        subDepartment: emp?.subDepartment || '',
        employeeLevel: emp?.level,
        assessorName: assessor?.name || ''
      },
      message: '评分提交成功'
    });
  },

  // HR获取所有员工
  'GET /api/hr/employees': (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'hr') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    const employees = Array.from(memoryStore.employees.values()).map(emp => {
      const { password: _, ...empData } = emp;
      return empData;
    });
    
    sendResponse(res, 200, { success: true, data: employees });
  },

  // HR新增员工
  'POST /api/hr/employees': async (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'hr') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    const body = await parseBody(req);
    const { name, department, subDepartment, role, level, managerId } = body;
    
    const id = `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newEmployee = {
      id,
      name,
      department: department || '工程技术中心',
      subDepartment: subDepartment || '',
      role: role || 'employee',
      level: level || 'intermediate',
      managerId: managerId || undefined,
      password: crypto.createHash('sha256').update('123456' + 'salt').digest('hex'),
      createdAt: new Date().toISOString()
    };
    
    memoryStore.employees.set(id, newEmployee);
    
    const { password: _, ...empData } = newEmployee;
    sendResponse(res, 200, { success: true, data: empData, message: '员工添加成功' });
  },

  // HR更新员工
  'PUT /api/hr/employees/:id': async (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'hr') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    const parsedUrl = url.parse(req.url, true);
    const employeeId = parsedUrl.pathname.split('/').pop();
    const body = await parseBody(req);
    const { name, department, subDepartment, role, level, managerId } = body;
    
    const employee = memoryStore.employees.get(employeeId);
    if (!employee) {
      return sendResponse(res, 404, { success: false, error: '员工不存在' });
    }
    
    employee.name = name || employee.name;
    employee.department = department || employee.department;
    employee.subDepartment = subDepartment || employee.subDepartment;
    employee.role = role || employee.role;
    employee.level = level || employee.level;
    employee.managerId = managerId || undefined;
    employee.updatedAt = new Date().toISOString();
    
    memoryStore.employees.set(employeeId, employee);
    
    const { password: _, ...empData } = employee;
    sendResponse(res, 200, { success: true, data: empData, message: '员工更新成功' });
  },

  // HR删除员工
  'DELETE /api/hr/employees/:id': (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'hr') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    const parsedUrl = url.parse(req.url, true);
    const employeeId = parsedUrl.pathname.split('/').pop();
    
    if (!memoryStore.employees.has(employeeId)) {
      return sendResponse(res, 404, { success: false, error: '员工不存在' });
    }
    
    memoryStore.employees.delete(employeeId);
    
    sendResponse(res, 200, { success: true, message: '员工删除成功' });
  },

  // HR批量导入员工
  'POST /api/hr/employees/import': async (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'hr') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    const body = await parseBody(req);
    const { employees: importedEmployees } = body;
    
    let successCount = 0;
    let failedCount = 0;
    const errors = [];
    
    for (const empData of importedEmployees) {
      try {
        const id = `emp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newEmployee = {
          id,
          name: empData.name,
          department: empData.department || '工程技术中心',
          subDepartment: empData.subDepartment || '',
          role: empData.role || 'employee',
          level: empData.level || 'intermediate',
          managerId: empData.managerId || undefined,
          password: crypto.createHash('sha256').update('123456' + 'salt').digest('hex'),
          createdAt: new Date().toISOString()
        };
        
        memoryStore.employees.set(id, newEmployee);
        successCount++;
      } catch (error) {
        failedCount++;
        errors.push(`${empData.name}: ${error.message}`);
      }
    }
    
    sendResponse(res, 200, {
      success: true,
      data: { successCount, failedCount, total: importedEmployees.length },
      message: `成功导入${successCount}名员工，失败${failedCount}名`,
      errors: errors.length > 0 ? errors : undefined
    });
  },

  // HR导出员工
  'GET /api/hr/employees/export': (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'hr') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    const employees = Array.from(memoryStore.employees.values()).map(emp => {
      const { password: _, ...empData } = emp;
      return empData;
    });
    
    // 设置CSV响应头
    res.writeHead(200, {
      ...corsHeaders,
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="employees_${new Date().toISOString().split('T')[0]}.csv"`
    });
    
    // 生成CSV内容
    const headers = 'ID,姓名,部门,子部门,角色,级别,经理ID,创建时间\n';
    const rows = employees.map(emp => 
      `${emp.id},${emp.name},${emp.department},${emp.subDepartment},${emp.role},${emp.level},${emp.managerId || ''},${emp.createdAt || ''}`
    ).join('\n');
    
    res.end(headers + rows);
  },

  // HR获取考核指标
  'GET /api/hr/metrics': (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'hr') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    // 从内存中获取指标配置，如果没有则使用默认值
    const metrics = memoryStore.metrics || [
      { key: 'taskCompletion', name: '任务完成', weight: 40, description: '按时完成任务的质量和数量' },
      { key: 'initiative', name: '主动性', weight: 30, description: '主动承担责任和解决问题' },
      { key: 'projectFeedback', name: '项目反馈', weight: 20, description: '在项目中的表现和反馈' },
      { key: 'qualityImprovement', name: '质量改进', weight: 10, description: '持续改进工作质量' }
    ];
    
    sendResponse(res, 200, { success: true, data: metrics });
  },

  // HR更新考核指标
  'PUT /api/hr/metrics': async (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'hr') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    const body = await parseBody(req);
    const { metrics } = body;
    
    // 验证权重总和是否为100
    const totalWeight = metrics.reduce((sum, m) => sum + m.weight, 0);
    if (totalWeight !== 100) {
      return sendResponse(res, 400, { success: false, error: `权重总和必须为100%，当前为${totalWeight}%` });
    }
    
    // 保存到内存
    memoryStore.metrics = metrics;
    
    sendResponse(res, 200, { success: true, data: metrics, message: '指标配置保存成功' });
  },

  // HR获取组织架构
  'GET /api/hr/organization': (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'hr') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    // 从内存获取或生成组织架构
    let organization = memoryStore.organization;
    
    if (!organization) {
      // 如果没有，则根据员工数据生成
      const employees = Array.from(memoryStore.employees.values());
      const departments = [...new Set(employees.map(e => e.department))];
      
      organization = departments.map(dept => {
        const deptEmployees = employees.filter(e => e.department === dept);
        const subDepartments = [...new Set(deptEmployees.map(e => e.subDepartment).filter(Boolean))];
        
        return {
          id: dept,
          name: dept,
          type: 'department',
          children: subDepartments.map(subDept => {
            const subDeptEmployees = deptEmployees.filter(e => e.subDepartment === subDept);
            const manager = subDeptEmployees.find(e => e.role === 'manager');
            
            return {
              id: subDept,
              name: subDept,
              type: 'subDepartment',
              managerId: manager?.id,
              children: subDeptEmployees
                .filter(e => e.role === 'employee')
                .map(e => ({
                  id: e.id,
                  name: e.name,
                  type: 'employee'
                }))
            };
          })
        };
      });
      
      memoryStore.organization = organization;
    }
    
    sendResponse(res, 200, { success: true, data: organization });
  },

  // HR更新组织架构
  'PUT /api/hr/organization': async (req, res) => {
    const user = authenticate(req);
    if (!user) {
      return sendResponse(res, 401, { success: false, error: '未认证' });
    }
    
    if (user.role !== 'hr') {
      return sendResponse(res, 403, { success: false, error: '权限不足' });
    }
    
    const body = await parseBody(req);
    const { organization } = body;
    
    // 保存组织架构到内存
    memoryStore.organization = organization;
    
    // 可选：根据组织架构更新员工的上下级关系
    // 这里可以添加逻辑来更新员工的managerId
    
    sendResponse(res, 200, { success: true, data: organization, message: '组织架构保存成功' });
  }
};

// 创建服务器
const server = http.createServer(async (req, res) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const routeKey = `${req.method} ${parsedUrl.pathname}`;
  
  console.log(`${new Date().toISOString()} - ${req.method} ${parsedUrl.pathname}`);
  
  // 支持参数路由的匹配
  let handler = routes[routeKey];
  if (!handler) {
    // 尝试匹配参数路由
    const routeKeys = Object.keys(routes);
    for (const key of routeKeys) {
      const [method, path] = key.split(' ');
      if (method !== req.method) continue;
      
      // 将路径转换为正则表达式
      const regexPath = path.replace(/:id/g, '([^/]+)');
      const regex = new RegExp(`^${regexPath}$`);
      
      if (regex.test(parsedUrl.pathname)) {
        handler = routes[key];
        break;
      }
    }
  }
  
  if (handler) {
    try {
      await handler(req, res);
    } catch (error) {
      console.error('Error:', error);
      sendResponse(res, 500, { success: false, error: '服务器内部错误' });
    }
  } else {
    sendResponse(res, 404, { success: false, error: '接口不存在' });
  }
});

// 启动服务器
server.listen(PORT, () => {
  console.log(`\n🚀 服务器启动成功`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`📚 API文档: http://localhost:${PORT}/health`);
  console.log('');
});
