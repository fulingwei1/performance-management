/**
 * 数据批量导入脚本
 * 使用方法: node scripts/bulk-import.js
 */

const fs = require('fs');
const path = require('path');

// 配置
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001/api';
const AUTH_CREDENTIALS = {
  username: '林作倩',
  password: '123456',
  role: 'hr'
};

// 示例数据模板
const SAMPLE_DATA = {
  // 部门数据
  departments: [
    {
      id: 'dept-sales',
      name: '销售部',
      code: 'SALES',
      sortOrder: 10
    },
    {
      id: 'dept-sales-1',
      name: '销售一部',
      code: 'SALES-01',
      parentId: 'dept-sales',
      sortOrder: 1
    },
    {
      id: 'dept-service',
      name: '客服部',
      code: 'SERVICE',
      sortOrder: 11
    }
  ],
  
  // 岗位数据
  positions: [
    {
      name: '销售经理',
      code: 'SALES-MGR',
      departmentId: 'dept-sales',
      level: 'senior',
      category: 'management',
      description: '负责销售团队管理和业绩达成'
    },
    {
      name: '销售工程师',
      code: 'SALES-ENG',
      departmentId: 'dept-sales',
      level: 'intermediate',
      category: 'technical',
      description: '负责客户开发和产品销售'
    },
    {
      name: '客服专员',
      code: 'SERVICE-SPEC',
      departmentId: 'dept-service',
      level: 'intermediate',
      category: 'support',
      description: '负责客户咨询和售后服务'
    }
  ],
  
  // 员工数据
  employees: [
    {
      id: 'm010',
      name: '销售经理',
      department: '销售部',
      subDepartment: '销售一部',
      role: 'manager',
      level: 'senior'
    },
    {
      id: 'e100',
      name: '张三',
      department: '销售部',
      subDepartment: '销售一部',
      role: 'employee',
      level: 'intermediate',
      managerId: 'm010'
    },
    {
      id: 'e101',
      name: '李四',
      department: '销售部',
      subDepartment: '销售一部',
      role: 'employee',
      level: 'junior',
      managerId: 'm010'
    },
    {
      id: 'm011',
      name: '客服经理',
      department: '客服部',
      subDepartment: '客服部',
      role: 'manager',
      level: 'senior'
    },
    {
      id: 'e102',
      name: '王五',
      department: '客服部',
      subDepartment: '客服部',
      role: 'employee',
      level: 'intermediate',
      managerId: 'm011'
    }
  ],
  
  // 考核指标
  metrics: [
    {
      name: '销售额完成率',
      code: 'SALES-QUOTA',
      category: 'performance',
      type: 'quantitative',
      description: '月度销售目标完成情况',
      weight: 50,
      minValue: 0,
      maxValue: 200,
      unit: '%',
      scoringCriteria: [
        { level: 'L1', score: 0.5, description: '完成率<60%' },
        { level: 'L2', score: 0.8, description: '完成率60-80%' },
        { level: 'L3', score: 1.0, description: '完成率80-100%' },
        { level: 'L4', score: 1.2, description: '完成率100-120%' },
        { level: 'L5', score: 1.5, description: '完成率>120%' }
      ]
    },
    {
      name: '新客户开发数',
      code: 'NEW-CUSTOMER',
      category: 'performance',
      type: 'quantitative',
      description: '每月新开发客户数量',
      weight: 20,
      minValue: 0,
      maxValue: 10,
      unit: '个',
      scoringCriteria: [
        { level: 'L1', score: 0.5, description: '0个' },
        { level: 'L2', score: 0.8, description: '1-2个' },
        { level: 'L3', score: 1.0, description: '3-4个' },
        { level: 'L4', score: 1.2, description: '5-6个' },
        { level: 'L5', score: 1.5, description: '>6个' }
      ]
    },
    {
      name: '客户满意度',
      code: 'CSAT',
      category: 'performance',
      type: 'quantitative',
      description: '客户对服务的满意程度评分',
      weight: 20,
      minValue: 0,
      maxValue: 100,
      unit: '分',
      scoringCriteria: [
        { level: 'L1', score: 0.5, description: '<60分' },
        { level: 'L2', score: 0.8, description: '60-70分' },
        { level: 'L3', score: 1.0, description: '70-80分' },
        { level: 'L4', score: 1.2, description: '80-90分' },
        { level: 'L5', score: 1.5, description: '>90分' }
      ]
    },
    {
      name: '售后响应时效',
      code: 'RESPONSE-TIME',
      category: 'performance',
      type: 'quantitative',
      description: '客户问题响应时间',
      weight: 30,
      minValue: 0,
      maxValue: 24,
      unit: '小时',
      scoringCriteria: [
        { level: 'L1', score: 0.5, description: '>8小时' },
        { level: 'L2', score: 0.8, description: '4-8小时' },
        { level: 'L3', score: 1.0, description: '2-4小时' },
        { level: 'L4', score: 1.2, description: '1-2小时' },
        { level: 'L5', score: 1.5, description: '<1小时' }
      ]
    }
  ],
  
  // 岗位指标模板
  templates: [
    {
      name: '销售工程师考核模板',
      description: '适用于销售岗位人员',
      positionCode: 'SALES-ENG',
      metrics: [
        { metricCode: 'SALES-QUOTA', weight: 50, required: true },
        { metricCode: 'NEW-CUSTOMER', weight: 20, required: true },
        { metricCode: 'INITIATIVE', weight: 15, required: true },
        { metricCode: 'CSAT', weight: 15, required: true }
      ]
    },
    {
      name: '客服专员考核模板',
      description: '适用于客服岗位人员',
      positionCode: 'SERVICE-SPEC',
      metrics: [
        { metricCode: 'RESPONSE-TIME', weight: 30, required: true },
        { metricCode: 'CSAT', weight: 40, required: true },
        { metricCode: 'INITIATIVE', weight: 20, required: true },
        { metricCode: 'QUALITY', weight: 10, required: true }
      ]
    }
  ]
};

// 导入函数
async function importData() {
  console.log('🚀 开始数据导入...\n');
  
  try {
    // 1. 登录获取token
    console.log('🔐 正在登录...');
    const loginRes = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(AUTH_CREDENTIALS)
    });
    
    if (!loginRes.ok) {
      throw new Error('登录失败，请检查用户名密码');
    }
    
    const loginData = await loginRes.json();
    if (!loginData.success) {
      throw new Error(loginData.error || '登录失败');
    }
    
    const token = loginData.data.token;
    console.log('✅ 登录成功\n');
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
    
    // 2. 导入部门
    console.log('📁 正在导入部门...');
    let successCount = 0;
    for (const dept of SAMPLE_DATA.departments) {
      try {
        const res = await fetch(`${API_BASE_URL}/organization/departments`, {
          method: 'POST',
          headers,
          body: JSON.stringify(dept)
        });
        if (res.ok) {
          console.log(`  ✅ ${dept.name}`);
          successCount++;
        } else {
          const err = await res.json();
          console.log(`  ⚠️ ${dept.name}: ${err.error || '已存在或导入失败'}`);
        }
      } catch (e) {
        console.log(`  ❌ ${dept.name}: ${e.message}`);
      }
    }
    console.log(`   导入完成: ${successCount}/${SAMPLE_DATA.departments.length}\n`);
    
    // 3. 导入岗位
    console.log('💼 正在导入岗位...');
    successCount = 0;
    for (const pos of SAMPLE_DATA.positions) {
      try {
        const res = await fetch(`${API_BASE_URL}/organization/positions`, {
          method: 'POST',
          headers,
          body: JSON.stringify(pos)
        });
        if (res.ok) {
          console.log(`  ✅ ${pos.name}`);
          successCount++;
        } else {
          const err = await res.json();
          console.log(`  ⚠️ ${pos.name}: ${err.error || '已存在或导入失败'}`);
        }
      } catch (e) {
        console.log(`  ❌ ${pos.name}: ${e.message}`);
      }
    }
    console.log(`   导入完成: ${successCount}/${SAMPLE_DATA.positions.length}\n`);
    
    // 4. 导入员工
    console.log('👥 正在导入员工...');
    successCount = 0;
    for (const emp of SAMPLE_DATA.employees) {
      try {
        const res = await fetch(`${API_BASE_URL}/employees`, {
          method: 'POST',
          headers,
          body: JSON.stringify(emp)
        });
        if (res.ok) {
          console.log(`  ✅ ${emp.name} (${emp.id})`);
          successCount++;
        } else {
          const err = await res.json();
          console.log(`  ⚠️ ${emp.name}: ${err.error || '已存在或导入失败'}`);
        }
      } catch (e) {
        console.log(`  ❌ ${emp.name}: ${e.message}`);
      }
    }
    console.log(`   导入完成: ${successCount}/${SAMPLE_DATA.employees.length}\n`);
    
    // 5. 导入指标
    console.log('📊 正在导入考核指标...');
    successCount = 0;
    for (const metric of SAMPLE_DATA.metrics) {
      try {
        const res = await fetch(`${API_BASE_URL}/metrics`, {
          method: 'POST',
          headers,
          body: JSON.stringify(metric)
        });
        if (res.ok) {
          console.log(`  ✅ ${metric.name}`);
          successCount++;
        } else {
          const err = await res.json();
          console.log(`  ⚠️ ${metric.name}: ${err.error || '已存在或导入失败'}`);
        }
      } catch (e) {
        console.log(`  ❌ ${metric.name}: ${e.message}`);
      }
    }
    console.log(`   导入完成: ${successCount}/${SAMPLE_DATA.metrics.length}\n`);
    
    console.log('🎉 数据导入完成！');
    console.log('\n📌 提示:');
    console.log('  - 所有新员工默认密码: 123456');
    console.log('  - 已存在的数据会被跳过');
    console.log('  - 可以通过管理界面继续添加更多数据');
    
  } catch (error) {
    console.error('\n❌ 导入失败:', error.message);
    process.exit(1);
  }
}

// 导出数据模板
function exportTemplate() {
  const templatePath = path.join(__dirname, 'import-data-template.json');
  fs.writeFileSync(templatePath, JSON.stringify(SAMPLE_DATA, null, 2));
  console.log(`✅ 数据模板已导出到: ${templatePath}`);
  console.log('\n请修改该文件中的数据，然后重新运行脚本。');
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--template') || args.includes('-t')) {
    exportTemplate();
    return;
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
数据批量导入脚本

使用方法:
  node bulk-import.js              执行数据导入
  node bulk-import.js --template   导出数据模板
  node bulk-import.js --help       显示帮助

环境变量:
  API_URL   API地址 (默认: http://localhost:3001/api)

默认账号:
  用户名: 林作倩
  密码: 123456
  角色: hr
    `);
    return;
  }
  
  // 检查是否需要自定义数据文件
  const customDataPath = path.join(__dirname, 'import-data.json');
  if (fs.existsSync(customDataPath)) {
    console.log('📄 发现自定义数据文件，正在加载...\n');
    const customData = JSON.parse(fs.readFileSync(customDataPath, 'utf8'));
    Object.assign(SAMPLE_DATA, customData);
  }
  
  await importData();
}

// 运行
main().catch(console.error);
