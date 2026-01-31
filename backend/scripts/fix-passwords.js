const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

// 生成正确的密码哈希
async function generateAllHashes() {
  const password = '123456';
  const rounds = 10;

  const employees = [
    // 部门经理
    { id: 'm001', name: '于振华', department: '工程技术中心', subDepartment: '测试部', role: 'manager', level: 'senior', managerId: undefined },
    { id: 'm002', name: '张丙波', department: '工程技术中心', subDepartment: '机械部', role: 'manager', level: 'senior', managerId: undefined },
    { id: 'm003', name: '王俊', department: '工程技术中心', subDepartment: 'PLC', role: 'manager', level: 'senior', managerId: undefined },
    { id: 'm004', name: '黎佩锋', department: '工程技术中心', subDepartment: '技术开发部-软件组', role: 'manager', level: 'senior', managerId: undefined },
    { id: 'm005', name: '梁柱', department: '工程技术中心', subDepartment: '技术开发部-电子硬件组', role: 'manager', level: 'senior', managerId: undefined },
    { id: 'm006', name: '周定炫', department: '工程技术中心', subDepartment: '售前技术部', role: 'manager', level: 'senior', managerId: undefined },
    // 总经理
    { id: 'gm001', name: '郑汝才', department: '总经办', subDepartment: '总经理办公室', role: 'gm', level: 'senior', managerId: undefined },
    // HR
    { id: 'hr001', name: '林作倩', department: '人力资源部', subDepartment: '人力资源部', role: 'hr', level: 'senior', managerId: undefined },
    { id: 'hr002', name: '符凌维', department: '人力资源部', subDepartment: '人力资源部', role: 'hr', level: 'senior', managerId: undefined },
    // 测试部员工
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
    // 机械部员工
    { id: 'e013', name: '刘万成', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'senior', managerId: 'm002' },
    { id: 'e014', name: '房思琦', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'intermediate', managerId: 'm002' },
    { id: 'e015', name: '王玉梅', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'junior', managerId: 'm002' },
    { id: 'e016', name: '李学伟', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'senior', managerId: 'm002' },
    { id: 'e017', name: '洪国安', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'intermediate', managerId: 'm002' },
    { id: 'e018', name: '丘文华', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'junior', managerId: 'm002' },
    { id: 'e019', name: '张小川', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'assistant', managerId: 'm002' },
    { id: 'e020', name: '黄云华', department: '工程技术中心', subDepartment: '机械部', role: 'employee', level: 'intermediate', managerId: 'm002' },
    // PLC员工
    { id: 'e021', name: '杜磊', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'senior', managerId: 'm003' },
    { id: 'e022', name: '陈泽顺', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'intermediate', managerId: 'm003' },
    { id: 'e023', name: '刘钊玲', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'junior', managerId: 'm003' },
    { id: 'e024', name: '陈东洲', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'senior', managerId: 'm003' },
    { id: 'e025', name: '黄雷', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'intermediate', managerId: 'm003' },
    { id: 'e026', name: '温日波', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'junior', managerId: 'm003' },
    { id: 'e027', name: '马伟', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'assistant', managerId: 'm003' },
    { id: 'e028', name: '曾均佳', department: '工程技术中心', subDepartment: 'PLC', role: 'employee', level: 'intermediate', managerId: 'm003' },
    // 技术开发部员工
    { id: 'e029', name: '唐孝日', department: '工程技术中心', subDepartment: '技术开发部-软件组', role: 'employee', level: 'senior', managerId: 'm004' },
    { id: 'e030', name: '林宇寰', department: '工程技术中心', subDepartment: '技术开发部-软件组', role: 'employee', level: 'intermediate', managerId: 'm004' },
    { id: 'e031', name: '田求发', department: '工程技术中心', subDepartment: '技术开发部-软件组', role: 'employee', level: 'junior', managerId: 'm004' },
    { id: 'e032', name: '程传伦', department: '工程技术中心', subDepartment: '技术开发部-电子硬件组', role: 'employee', level: 'senior', managerId: 'm005' },
    { id: 'e033', name: '席程', department: '工程技术中心', subDepartment: '技术开发部-电子硬件组', role: 'employee', level: 'intermediate', managerId: 'm005' },
    // 售前技术部员工
    { id: 'e034', name: '罗畅', department: '工程技术中心', subDepartment: '售前技术部', role: 'employee', level: 'senior', managerId: 'm006' },
    { id: 'e035', name: '马伟伟', department: '工程技术中心', subDepartment: '售前技术部', role: 'employee', level: 'intermediate', managerId: 'm006' },
  ];

  console.log('开始生成密码哈希...');

  for (const emp of employees) {
    emp.password = await bcrypt.hash(password, rounds);
  }

  console.log('密码哈希生成完成');

  return employees;
}

async function updateMemoryDB() {
  const employees = await generateAllHashes();

  // 读取模板
  let content = fs.readFileSync('src/config/memory-db.ts', 'utf8');

  // 替换 initialEmployees 数组
  const employeesCode = employees.map((emp, index) => {
    const last = index === employees.length - 1 ? '' : ',';
    const managerId = emp.managerId ? `'${emp.managerId}'` : 'undefined';
    return `    { id: '${emp.id}', name: '${emp.name}', department: '${emp.department}', subDepartment: '${emp.subDepartment}', role: '${emp.role}' as EmployeeRole, level: '${emp.level}' as EmployeeLevel, managerId: ${managerId}, password: '${emp.password}' }${last}`;
  }).join('\n');

  const startIndex = content.indexOf('const initialEmployees = [');
  const endIndex = content.indexOf('];\n\n// 初始化内存数据库');

  if (startIndex === -1 || endIndex === -1) {
    throw new Error('未找到 initialEmployees 数组');
  }

  const before = content.substring(0, startIndex + 'const initialEmployees = ['.length);
  const after = content.substring(endIndex);

  const newContent = before + '\n' + employeesCode + after;

  fs.writeFileSync('src/config/memory-db.ts', newContent, 'utf8');
  console.log('✅ memory-db.ts 已更新');
  console.log(`📝 更新了 ${employees.length} 名员工的密码哈希`);
}

updateMemoryDB().catch(err => {
  console.error('❌ 更新失败:', err);
  process.exit(1);
});
