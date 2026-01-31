# 数据导入与考核体系扩展指南

## 📊 当前系统概况

### 已有考核部门（47名员工）
| 部门 | 人数 | 经理 |
|------|------|------|
| 测试部 | 12人 | 于振华 |
| 机械部 | 12人 | 张丙波 |
| PLC | 12人 | 王俊 |
| 技术开发部-软件组 | 5人 | 黎佩锋 |
| 技术开发部-电子硬件组 | 4人 | 梁柱 |
| 售前技术部 | 2人 | 周定炫 |

### 当前考核指标（4维度）
1. **承担任务量及任务完成情况** - 权重40%
2. **主动性态度与遵守纪律** - 权重30%
3. **参与项目经理的反馈情况** - 权重20%
4. **工作质量意识与工作改进** - 权重10%

---

## 🚀 数据导入方式

### 方式一：通过管理界面导入（推荐）

**步骤：**
1. 登录系统，进入HR角色
2. 点击侧边栏【组织架构】菜单
3. 在部门管理页面，点击"新增部门"创建部门结构
4. 在岗位管理页面，点击"新增岗位"创建岗位
5. 进入【员工管理】（原EmployeeManagement页面）
6. 点击"导入名册"，上传CSV格式的员工名单

**CSV格式示例：**
```csv
编号,姓名,部门,子部门,角色,级别,上级编号
e001,张三,工程技术中心,测试部,employee,intermediate,m001
e002,李四,销售部,销售一部,employee,senior,m010
m010,王五,销售部,销售一部,manager,senior,
```

### 方式二：通过API批量导入

**1. 准备JSON数据文件：**
创建 `import-data.json`：

```json
{
  "departments": [
    {
      "id": "dept-sales",
      "name": "销售部",
      "code": "SALES",
      "parentId": null,
      "managerId": "m010",
      "sortOrder": 1
    },
    {
      "id": "dept-sales-1",
      "name": "销售一部",
      "code": "SALES-01",
      "parentId": "dept-sales",
      "managerId": "m010",
      "sortOrder": 1
    }
  ],
  "positions": [
    {
      "name": "销售经理",
      "code": "SALES-MGR",
      "departmentId": "dept-sales",
      "level": "senior",
      "category": "management"
    },
    {
      "name": "销售工程师",
      "code": "SALES-ENG",
      "departmentId": "dept-sales",
      "level": "intermediate",
      "category": "technical"
    }
  ],
  "employees": [
    {
      "id": "m010",
      "name": "王五",
      "department": "销售部",
      "subDepartment": "销售一部",
      "role": "manager",
      "level": "senior"
    },
    {
      "id": "e100",
      "name": "赵六",
      "department": "销售部",
      "subDepartment": "销售一部",
      "role": "employee",
      "level": "intermediate",
      "managerId": "m010"
    }
  ]
}
```

**2. 使用curl命令导入：**

```bash
# 1. 先登录获取token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"王HR","password":"123456","role":"hr"}'

# 2. 导入部门
curl -X POST http://localhost:3001/api/organization/departments \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"销售部","code":"SALES","sortOrder":1}'

# 3. 导入员工
curl -X POST http://localhost:3001/api/employees \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"name":"张三","department":"销售部","subDepartment":"销售一部","role":"employee","level":"intermediate","managerId":"m010"}'
```

### 方式三：直接修改初始化文件

**文件路径：** `backend/src/config/init-data.ts`

**步骤：**
1. 在 `initialEmployees` 数组中添加新员工
2. 重新启动后端服务
3. 系统会自动初始化数据到内存数据库

**示例：**
```typescript
// 在 initialEmployees 数组中添加
{ 
  id: 'e100', 
  name: '新员工', 
  department: '销售部', 
  subDepartment: '销售一部', 
  role: 'employee' as const, 
  level: 'intermediate' as const, 
  managerId: 'm010', 
  password: '123456' 
}
```

---

## 🎯 新增考核部门

### 当前支持部门
系统已定义以下部门（在 `app/src/lib/mockData.ts`）：
- ✅ 工程技术中心（测试部、机械部、PLC、技术开发部）
- ✅ 售前技术部
- ⏳ 项目管理部（暂无员工）
- ⏳ 客服部（暂无员工）
- ⏳ 销售部（暂无员工）

### 新增部门步骤

**方法1：通过管理界面（推荐）**
1. 登录HR账号
2. 进入【组织架构】→【部门管理】
3. 点击"新增部门"
4. 填写部门信息：
   - 部门名称：如"销售部"
   - 部门编码：如"SALES"
   - 上级部门：如有
   - 部门负责人：选择经理

**方法2：通过前端mock数据扩展**
编辑 `app/src/lib/mockData.ts`：
```typescript
export const departments = [
  // ... 现有部门
  {
    name: '销售部',
    subDepartments: ['销售一部', '销售二部', '大客户部']
  },
  {
    name: '客服部',
    subDepartments: ['客服一部', '技术支持组']
  }
];
```

---

## 📈 新增考核指标

### 当前指标体系
系统当前使用4个通用指标，适用于所有技术部门。

### 添加新指标步骤

**方法1：通过指标库管理界面**
1. 登录HR账号
2. 进入【指标库】菜单
3. 点击"新建指标"
4. 配置指标信息：
   - **指标名称**：如"客户满意度"
   - **指标编码**：如"CSAT"
   - **分类**：业绩/能力/态度/加分/扣分
   - **类型**：定量/定性/综合
   - **权重**：0-100%
   - **评分标准**：L1-L5各级别描述

**方法2：通过后端初始化默认指标**
编辑 `backend/src/models/metricLibrary.model.ts`，在 `initializeDefaultMetrics` 方法中添加：

```typescript
{
  id: 'metric-customer-satisfaction',
  name: '客户满意度',
  code: 'CSAT',
  category: 'performance',
  type: 'quantitative',
  description: '客户对服务的满意程度',
  scoringCriteria: [
    { level: 'L1', score: 0.5, description: '客户投诉较多' },
    { level: 'L2', score: 0.8, description: '客户基本满意' },
    { level: 'L3', score: 1.0, description: '客户满意' },
    { level: 'L4', score: 1.2, description: '客户非常满意' },
    { level: 'L5', score: 1.5, description: '客户高度认可并推荐' }
  ],
  weight: 20,
  applicableLevels: ['senior', 'intermediate', 'junior', 'assistant'],
  minValue: 0,
  maxValue: 100,
  unit: '%',
  status: 'active'
}
```

### 按岗位配置不同指标

**创建岗位指标模板：**
1. 进入【指标库】→【岗位模板】
2. 选择岗位（如"销售工程师"）
3. 从指标库选择适用的指标
4. 设置各指标权重（总和必须=100%）

**销售岗位示例模板：**
```json
{
  "name": "销售工程师考核模板",
  "positionId": "pos-sales-eng",
  "metrics": [
    { "metricId": "metric-sales-quota", "weight": 40, "required": true },
    { "metricId": "metric-customer-satisfaction", "weight": 30, "required": true },
    { "metricId": "metric-initiative", "weight": 20, "required": true },
    { "metricId": "metric-teamwork", "weight": 10, "required": true }
  ]
}
```

---

## 🔧 新增考核方式

### 当前支持的考核方式
1. **上级评价**（已启用）- 直接上级评分
2. **双线考核**（已启用）- 职能+项目双重评价
3. **360度评价**（部分实现）- 上级+同级+下级+自评+客户

### 启用360度评价

**配置步骤：**
1. 进入【考核周期管理】
2. 创建或编辑考核周期
3. 开启"启用360度评价"选项
4. 系统会自动为员工分配互评对象

**查看互评分配：**
- 经理可在【360度评分管理】页面查看和分配互评关系
- 员工在【360度评分】页面进行互评

### 自定义考核流程

**支持的考核流程节点：**
- ✅ 员工自评
- ✅ 经理评分
- ✅ HR审核
- ⏳ 结果公示
- ⏳ 申诉处理

**配置流程：**
1. 进入【考核周期管理】
2. 设置各阶段截止日期：
   - 自评截止日期
   - 经理评分截止日期
   - HR审核截止日期
   - 申诉截止日期
3. 设置提醒时间（提前N天提醒）
4. 开启/关闭自动提交

---

## 📝 快速开始：添加销售部考核示例

### 步骤1：创建部门结构
```bash
# 创建销售部
curl -X POST http://localhost:3001/api/organization/departments \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"销售部","code":"SALES","sortOrder":10}'

# 创建销售一部（子部门）
curl -X POST http://localhost:3001/api/organization/departments \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name":"销售一部","code":"SALES-01","parentId":"dept-sales","sortOrder":1}'
```

### 步骤2：创建岗位
```bash
# 创建销售经理岗位
curl -X POST http://localhost:3001/api/organization/positions \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "销售经理",
    "code": "SALES-MGR",
    "departmentId": "dept-sales",
    "level": "senior",
    "category": "management"
  }'

# 创建销售工程师岗位
curl -X POST http://localhost:3001/api/organization/positions \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "销售工程师",
    "code": "SALES-ENG",
    "departmentId": "dept-sales",
    "level": "intermediate",
    "category": "technical"
  }'
```

### 步骤3：添加员工
```bash
# 添加销售经理
curl -X POST http://localhost:3001/api/employees \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "id": "m010",
    "name": "销售经理",
    "department": "销售部",
    "subDepartment": "销售一部",
    "role": "manager",
    "level": "senior"
  }'

# 添加销售人员
curl -X POST http://localhost:3001/api/employees \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "id": "e100",
    "name": "销售员张三",
    "department": "销售部",
    "subDepartment": "销售一部",
    "role": "employee",
    "level": "intermediate",
    "managerId": "m010"
  }'
```

### 步骤4：创建销售专用指标
```bash
# 创建销售额指标
curl -X POST http://localhost:3001/api/metrics \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "销售额完成率",
    "code": "SALES-QUOTA",
    "category": "performance",
    "type": "quantitative",
    "description": "月度销售目标完成情况",
    "weight": 50,
    "minValue": 0,
    "maxValue": 200,
    "unit": "%",
    "scoringCriteria": [
      {"level": "L1", "score": 0.5, "description": "完成率<60%"},
      {"level": "L2", "score": 0.8, "description": "完成率60-80%"},
      {"level": "L3", "score": 1.0, "description": "完成率80-100%"},
      {"level": "L4", "score": 1.2, "description": "完成率100-120%"},
      {"level": "L5", "score": 1.5, "description": "完成率>120%"}
    ]
  }'

# 创建客户开发指标
curl -X POST http://localhost:3001/api/metrics \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "新客户开发数",
    "code": "NEW-CUSTOMER",
    "category": "performance",
    "type": "quantitative",
    "description": "每月新开发客户数量",
    "weight": 20,
    "minValue": 0,
    "maxValue": 10,
    "unit": "个"
  }'
```

---

## ⚠️ 注意事项

1. **数据备份**：导入前建议备份现有数据
2. **ID唯一性**：员工ID、部门ID必须唯一
3. **上下级关系**：员工的managerId必须是系统中存在的经理ID
4. **权重总和**：岗位模板中各指标权重必须等于100%
5. **密码设置**：新导入员工默认密码为"123456"，首次登录需修改

## 📞 技术支持

如有问题，请检查：
- 后端服务是否正常运行（端口3001）
- 前端服务是否正常运行（端口5173）
- 数据库连接是否正常（或内存模式是否启用）
- 浏览器控制台是否有报错信息
