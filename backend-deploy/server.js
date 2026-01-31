#!/usr/bin/env node
/**
 * ATE绩效管理系统后端服务
 * 使用内存数据库模式运行（无需MySQL）
 */

const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'performance_system_secret_key_2024';

// 内存存储
const memoryStore = {
  employees: new Map(),
  performanceRecords: new Map(),
  peerReviews: new Map()
};

// 初始化员工数据
const initialEmployees = [
  // 部门经理
  { id: 'm001', name: '于振华', department: '工程技术中心', subDepartment: '测试部', role: 'manager', level: 'senior', managerId: null },
  { id: 'm002', name: '张丙波', department: '工程技术中心', subDepartment: '机械部', role: 'manager', level: 'senior', managerId: null },
  { id: 'm003', name: '王俊', department: '工程技术中心', subDepartment: 'PLC', role: 'manager', level: 'senior', managerId: null },
  { id: 'm004', name: '黎佩锋', department: '工程技术中心', subDepartment: '技术开发部-软件组', role: 'manager', level: 'senior', managerId: null },
  { id: 'm005', name: '梁柱', department: '工程技术中心', subDepartment: '技术开发部-电子硬件组', role: 'manager', level: 'senior', managerId: null },
  { id: 'm006', name: '周定炫', department: '工程技术中心', subDepartment: '售前技术部', role: 'manager', level: 'senior', managerId: null },
  
  // 总经理
  { id: 'gm001', name: '郑汝才', department: '总经办', subDepartment: '总经理办公室', role: 'gm', level: 'senior', managerId: null },
  
  // HR
  { id: 'hr001', name: '林作倩', department: '人力资源部', subDepartment: '人力资源部', role: 'hr', level: 'senior', managerId: null },
  { id: 'hr002', name: '符凌维', department: '人力资源部', subDepartment: '人力资源部', role: 'hr', level: 'senior', managerId: null },
  
  // 测试部员工 (12人)
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
  
  // 机械部员工 (8人)
  { id: 'e013', name: '刘万成', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'senior', managerId: 'm002' },
  { id: 'e014', name: '房思琦', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'intermediate', managerId: 'm002' },
  { id: 'e015', name: '王玉梅', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'junior', managerId: 'm002' },
  { id: 'e016', name: '李学伟', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'senior', managerId: 'm002' },
  { id: 'e017', name: '洪国安', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'intermediate', managerId: 'm002' },
  { id: 'e018', name: '丘文华', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'junior', managerId: 'm002' },
  { id: 'e019', name: '张小川', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'assistant', managerId: 'm002' },
  { id: 'e020', name: '黄云华', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'intermediate', managerId: 'm002' },
  
  // PLC员工 (8人)
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
    password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' // 123456
  });
});

console.log(`✅ 内存数据库初始化完成，加载了 ${memoryStore.employees.size} 名员工`);

// 中间件
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// 认证中间件
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: '未提供认证令牌' });
    }
    const token = authHeader.substring(7);
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    res.status(401).json({ success: false, error: '认证令牌无效或已过期' });
  }
};

// 角色权限检查
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: '未认证' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: '权限不足' });
    }
    next();
  };
};

// 获取分组类型
const getGroupType = (level) => {
  return ['senior', 'intermediate'].includes(level) ? 'high' : 'low';
};

// 健康检查
app.get('/health', (req, res) => {
  res.json({ success: true, message: '服务器运行正常', timestamp: new Date().toISOString() });
});

// ========== 认证接口 ==========
// 登录
app.post('/api/auth/login', async (req, res) => {
  const { username, password, role } = req.body;
  
  // 查找员工
  let employee = null;
  for (const emp of memoryStore.employees.values()) {
    if (emp.name === username) {
      employee = emp;
      break;
    }
  }
  
  if (!employee) {
    return res.status(401).json({ success: false, error: '用户名或密码错误' });
  }
  
  if (employee.role !== role) {
    return res.status(401).json({ success: false, error: '角色不匹配' });
  }
  
  const isValidPassword = await bcrypt.compare(password, employee.password);
  if (!isValidPassword) {
    return res.status(401).json({ success: false, error: '用户名或密码错误' });
  }
  
  const token = jwt.sign({ userId: employee.id, role: employee.role }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...userInfo } = employee;
  
  res.json({ success: true, data: { user: userInfo, token }, message: '登录成功' });
});

// 获取当前用户
app.get('/api/auth/me', authenticate, (req, res) => {
  const employee = memoryStore.employees.get(req.user.userId);
  if (!employee) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }
  const { password, ...userInfo } = employee;
  res.json({ success: true, data: userInfo });
});

// ========== 员工接口 ==========
// 获取所有员工
app.get('/api/employees', authenticate, (req, res) => {
  const employees = Array.from(memoryStore.employees.values()).map(({ password, ...rest }) => rest);
  res.json({ success: true, data: employees });
});

// 获取所有经理
app.get('/api/employees/managers', authenticate, (req, res) => {
  const managers = Array.from(memoryStore.employees.values())
    .filter(emp => emp.role === 'manager')
    .map(({ password, ...rest }) => rest);
  res.json({ success: true, data: managers });
});

// 获取下属
app.get('/api/employees/subordinates', authenticate, requireRole('manager'), (req, res) => {
  const subordinates = Array.from(memoryStore.employees.values())
    .filter(emp => emp.managerId === req.user.userId)
    .map(({ password, ...rest }) => rest);
  res.json({ success: true, data: subordinates });
});

// 根据ID获取员工
app.get('/api/employees/:id', authenticate, (req, res) => {
  const employee = memoryStore.employees.get(req.params.id);
  if (!employee) {
    return res.status(404).json({ success: false, error: '员工不存在' });
  }
  const { password, ...userInfo } = employee;
  res.json({ success: true, data: userInfo });
});

// ========== 绩效接口 ==========
// 获取我的绩效记录
app.get('/api/performance/my-records', authenticate, (req, res) => {
  const records = Array.from(memoryStore.performanceRecords.values())
    .filter(r => r.employeeId === req.user.userId)
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
  res.json({ success: true, data: records });
});

// 获取团队绩效记录（经理）
app.get('/api/performance/team-records', authenticate, requireRole('manager'), (req, res) => {
  const { month } = req.query;
  
  // 获取经理的所有下属
  const subordinateIds = Array.from(memoryStore.employees.values())
    .filter(emp => emp.managerId === req.user.userId)
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
  
  res.json({ success: true, data: records });
});

// 提交工作总结
app.post('/api/performance/summary', authenticate, requireRole('employee'), async (req, res) => {
  const { month, selfSummary, nextMonthPlan } = req.body;
  
  const employee = memoryStore.employees.get(req.user.userId);
  if (!employee) {
    return res.status(404).json({ success: false, error: '员工不存在' });
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
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  memoryStore.performanceRecords.set(recordId, record);
  
  const emp = memoryStore.employees.get(record.employeeId);
  const assessor = memoryStore.employees.get(record.assessorId);
  
  res.json({
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
});

// 经理评分
app.post('/api/performance/score', authenticate, requireRole('manager'), async (req, res) => {
  const { id, taskCompletion, initiative, projectFeedback, qualityImprovement, managerComment, nextMonthWorkArrangement } = req.body;
  
  const record = memoryStore.performanceRecords.get(id);
  if (!record) {
    return res.status(404).json({ success: false, error: '记录不存在' });
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
  record.updatedAt = new Date();
  
  // 更新排名
  const month = record.month;
  const monthRecords = Array.from(memoryStore.performanceRecords.values())
    .filter(r => r.month === month && r.status === 'completed');
  
  // 公司排名
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
  
  res.json({
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
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🚀 服务器启动成功`);
  console.log(`📍 地址: http://localhost:${PORT}`);
  console.log(`📚 API文档: http://localhost:${PORT}/health`);
  console.log('');
});
