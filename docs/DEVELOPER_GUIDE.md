# 差异化考核系统 - 开发者文档

## 📋 目录
1. [技术架构](#技术架构)
2. [项目结构](#项目结构)
3. [核心模块](#核心模块)
4. [数据库设计](#数据库设计)
5. [API 设计](#api-设计)
6. [开发指南](#开发指南)
7. [扩展开发](#扩展开发)

---

## 技术架构

### 技术栈

**后端**:
- **框架**: Node.js + Express + TypeScript
- **数据库**: PostgreSQL / MySQL / Memory DB
- **ORM**: 自定义 Query Builder
- **认证**: JWT
- **导出**: ExcelJS
- **日志**: Winston

**前端**:
- **框架**: React 19 + TypeScript
- **构建**: Vite 7.3.0
- **路由**: React Router v6
- **状态管理**: Zustand
- **UI组件**: Shadcn/ui + TailwindCSS 4
- **动画**: Framer Motion
- **图表**: Recharts

### 架构图

```
┌─────────────────────────────────────────────┐
│              Frontend (React)                │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐    │
│  │ Pages   │  │Components│  │  Stores  │    │
│  └─────────┘  └─────────┘  └──────────┘    │
└─────────────────────────────────────────────┘
                    ↕ HTTP/REST
┌─────────────────────────────────────────────┐
│             Backend (Express)                │
│  ┌─────────┐  ┌─────────┐  ┌──────────┐    │
│  │ Routes  │→ │Controller│→ │  Model   │    │
│  └─────────┘  └─────────┘  └──────────┘    │
│       ↓                           ↓         │
│  ┌─────────┐              ┌──────────┐     │
│  │Middleware│              │ Service  │     │
│  └─────────┘              └──────────┘     │
└─────────────────────────────────────────────┘
                    ↕ SQL
┌─────────────────────────────────────────────┐
│         Database (PostgreSQL/MySQL)         │
│   assessment_templates  │  monthly_assessments │
│   template_metrics      │  departments       │
└─────────────────────────────────────────────┘
```

---

## 项目结构

```
performance-management/
├── backend/                    # 后端代码
│   ├── src/
│   │   ├── config/            # 配置文件
│   │   │   ├── database.ts    # 数据库连接
│   │   │   ├── memory-db.ts   # Memory DB
│   │   │   ├── logger.ts      # 日志配置
│   │   │   ├── init-templates.ts  # 模板初始化
│   │   │   └── seed-assessment-test-data.ts  # 测试数据
│   │   ├── models/            # 数据模型
│   │   │   ├── assessmentTemplate.model.ts
│   │   │   └── monthlyAssessment.model.ts
│   │   ├── controllers/       # 控制器
│   │   │   ├── assessmentTemplate.controller.ts
│   │   │   ├── monthlyAssessment.controller.ts
│   │   │   ├── assessmentExport.controller.ts
│   │   │   └── assessmentStats.controller.ts
│   │   ├── routes/            # 路由
│   │   │   ├── assessmentTemplate.routes.ts
│   │   │   ├── monthlyAssessment.routes.ts
│   │   │   ├── assessmentExport.routes.ts
│   │   │   └── assessmentStats.routes.ts
│   │   ├── services/          # 业务逻辑
│   │   │   ├── assessmentExport.service.ts
│   │   │   └── assessmentStats.service.ts
│   │   ├── middleware/        # 中间件
│   │   │   └── errorHandler.ts
│   │   └── index.ts           # 入口文件
│   ├── migrations/            # 数据库迁移
│   │   ├── 010_department_classification.sql
│   │   └── 011_monthly_assessments.sql
│   ├── package.json
│   └── tsconfig.json
│
├── app/                       # 前端代码
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   │   ├── HR/
│   │   │   │   ├── DepartmentClassification.tsx
│   │   │   │   ├── AssessmentTemplates.tsx
│   │   │   │   ├── TemplateEditor.tsx
│   │   │   │   └── AssessmentExport.tsx
│   │   │   └── Manager/
│   │   │       └── DifferentiatedScoring.tsx
│   │   ├── components/       # 通用组件
│   │   │   ├── dashboard/
│   │   │   │   └── AssessmentStatsCard.tsx
│   │   │   ├── help/
│   │   │   │   └── DifferentiatedScoringHelp.tsx
│   │   │   └── ui/           # Shadcn/ui 组件
│   │   ├── stores/           # Zustand stores
│   │   ├── lib/              # 工具函数
│   │   ├── App.tsx           # 主应用
│   │   └── main.tsx          # 入口
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                      # 文档
│   ├── USER_MANUAL.md
│   ├── DEVELOPER_GUIDE.md
│   ├── ASSESSMENT_TESTING_GUIDE.md
│   └── ASSESSMENT_DEPLOYMENT.md
│
└── test-assessment-system.sh # 测试脚本
```

---

## 核心模块

### 1. 考核模板模块

**职责**: 管理不同部门类型的考核模板和指标

**关键文件**:
- `models/assessmentTemplate.model.ts` - 数据模型
- `controllers/assessmentTemplate.controller.ts` - CRUD操作
- `pages/HR/AssessmentTemplates.tsx` - 前端界面

**核心功能**:
```typescript
// 创建模板
await AssessmentTemplateModel.create({
  name: '销售部门标准模板',
  departmentType: 'sales',
  status: 'active',
  metrics: [...],
});

// 获取默认模板
const template = await AssessmentTemplateModel.findDefaultByType('sales');

// 添加指标
await AssessmentTemplateModel.addMetric(templateId, {
  metricName: '销售额完成率',
  metricCode: 'SALES_COMPLETION',
  weight: 30,
  category: 'performance',
  evaluationType: 'quantitative',
});
```

---

### 2. 月度评分模块

**职责**: 管理员工月度考核评分记录

**关键文件**:
- `models/monthlyAssessment.model.ts` - 数据模型
- `controllers/monthlyAssessment.controller.ts` - 评分CRUD
- `pages/Manager/DifferentiatedScoring.tsx` - 评分界面

**核心功能**:
```typescript
// 创建/更新评分
await MonthlyAssessmentModel.create({
  employeeId: 'emp001',
  month: '2026-03',
  templateId: 'template-sales-001',
  scores: [
    {
      metricName: '销售额完成率',
      metricCode: 'SALES_COMPLETION',
      weight: 30,
      level: 'L4',
      score: 1.2,
      comment: '表现优秀',
    },
  ],
  totalScore: 1.15,
  evaluatorId: 'm001',
  evaluatorName: '张经理',
});

// 查询员工历史评分
const history = await MonthlyAssessmentModel.findByEmployee('emp001');
```

---

### 3. 数据导出模块

**职责**: 导出评分数据为Excel文件

**关键文件**:
- `services/assessmentExport.service.ts` - 导出逻辑
- `controllers/assessmentExport.controller.ts` - API接口
- `pages/HR/AssessmentExport.tsx` - 导出界面

**核心功能**:
```typescript
// 导出月度评分
const buffer = await exportMonthlyAssessments({
  month: '2026-03',
  departmentType: 'sales',
});

// 导出部门统计
const buffer = await exportDepartmentTypeStats();

// 导出员工趋势
const buffer = await exportScoreTrendAnalysis('emp001');
```

---

### 4. 统计分析模块

**职责**: 提供各类统计分析数据

**关键文件**:
- `services/assessmentStats.service.ts` - 统计逻辑
- `controllers/assessmentStats.controller.ts` - API接口

**核心功能**:
```typescript
// 部门类型统计
const stats = await getDepartmentTypeStats();
// → [{ departmentType, templateCount, metricCount, ... }]

// 员工绩效趋势
const trend = await getEmployeePerformanceTrend('emp001');
// → { avgScore, trend: 'up', recentScores, ... }
```

---

## 数据库设计

### ER 图

```
┌─────────────────────────┐
│ assessment_templates    │
│ ─────────────────────── │
│ id (PK)                 │
│ name                    │
│ department_type         │◄─────┐
│ status                  │      │
│ created_at              │      │
│ updated_at              │      │
└─────────────────────────┘      │
            │                    │
            │ 1:N                │
            ▼                    │
┌─────────────────────────┐      │
│ template_metrics        │      │
│ ─────────────────────── │      │
│ id (PK)                 │      │
│ template_id (FK)        │      │
│ metric_name             │      │
│ metric_code             │      │
│ weight                  │      │
│ category                │      │
│ evaluation_type         │      │
└─────────────────────────┘      │
                                 │
┌─────────────────────────┐      │
│ monthly_assessments     │      │
│ ─────────────────────── │      │
│ id (PK)                 │      │
│ employee_id             │      │
│ month                   │      │
│ template_id (FK)        │──────┘
│ department_type         │
│ scores (JSONB)          │
│ total_score             │
│ evaluator_id            │
│ created_at              │
│ updated_at              │
│ UNIQUE(employee_id, month) │
└─────────────────────────┘
```

### 表设计

#### 1. assessment_templates

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | VARCHAR(100) | 模板名称 |
| department_type | VARCHAR(50) | 部门类型 |
| status | VARCHAR(20) | 状态（active/inactive） |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

#### 2. template_metrics

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| template_id | UUID | 模板ID（外键） |
| metric_name | VARCHAR(100) | 指标名称 |
| metric_code | VARCHAR(50) | 指标编码 |
| weight | INTEGER | 权重（0-100） |
| category | VARCHAR(50) | 类别 |
| evaluation_type | VARCHAR(20) | 评价类型 |
| description | TEXT | 描述 |
| sort_order | INTEGER | 排序 |

#### 3. monthly_assessments

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| employee_id | VARCHAR(50) | 员工ID |
| month | VARCHAR(7) | 月份（YYYY-MM） |
| template_id | UUID | 模板ID |
| template_name | VARCHAR(100) | 模板名称 |
| department_type | VARCHAR(50) | 部门类型 |
| scores | JSONB | 评分详情（JSON数组） |
| total_score | DECIMAL(5,2) | 总分 |
| evaluator_id | VARCHAR(50) | 评分人ID |
| evaluator_name | VARCHAR(100) | 评分人姓名 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |

**索引**:
```sql
CREATE INDEX idx_monthly_assessments_employee ON monthly_assessments(employee_id);
CREATE INDEX idx_monthly_assessments_month ON monthly_assessments(month);
CREATE INDEX idx_monthly_assessments_dept_type ON monthly_assessments(department_type);
CREATE UNIQUE INDEX uk_employee_month ON monthly_assessments(employee_id, month);
```

---

## API 设计

### 认证

所有API需要JWT认证：

```http
Authorization: Bearer <token>
```

### 考核模板 API

#### 获取所有模板

```http
GET /api/assessment-templates
Query: ?includeMetrics=true
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "销售部门标准模板",
      "departmentType": "sales",
      "status": "active",
      "metrics": [...]
    }
  ]
}
```

#### 获取默认模板

```http
GET /api/assessment-templates/default/:departmentType
```

#### 创建模板

```http
POST /api/assessment-templates
Content-Type: application/json

{
  "name": "自定义模板",
  "departmentType": "sales",
  "description": "...",
  "status": "active"
}
```

#### 添加指标

```http
POST /api/assessment-templates/:id/metrics

{
  "metricName": "销售额完成率",
  "metricCode": "SALES_COMPLETION",
  "weight": 30,
  "category": "performance",
  "evaluationType": "quantitative"
}
```

### 月度评分 API

#### 创建/更新评分

```http
POST /api/performance/monthly

{
  "employeeId": "emp001",
  "month": "2026-03",
  "templateId": "uuid",
  "templateName": "销售部门标准模板",
  "departmentType": "sales",
  "scores": [
    {
      "metricName": "销售额完成率",
      "metricCode": "SALES_COMPLETION",
      "weight": 30,
      "level": "L4",
      "score": 1.2,
      "comment": "表现优秀"
    }
  ],
  "totalScore": 1.15,
  "evaluatorId": "m001",
  "evaluatorName": "张经理"
}
```

#### 获取员工评分历史

```http
GET /api/performance/employee/:employeeId
```

### 导出 API

#### 导出月度评分

```http
GET /api/export/monthly-assessments?month=2026-03&departmentType=sales
Response: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
```

### 统计 API

#### 部门类型统计

```http
GET /api/stats/department-types
```

#### 员工绩效趋势

```http
GET /api/stats/employee-trend/:employeeId
```

---

## 开发指南

### 本地开发环境搭建

#### 1. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd ../app
npm install
```

#### 2. 配置环境变量

```bash
# backend/.env
PORT=3001
USE_MEMORY_DB=true
NODE_ENV=development
LOG_LEVEL=debug
```

```bash
# app/.env
VITE_API_URL=http://localhost:3001
```

#### 3. 初始化数据

```bash
# 启动后端（会自动初始化Memory DB）
cd backend
npm run dev

# 手动初始化模板（可选）
npm run init-templates
```

#### 4. 启动服务

```bash
# 终端1 - 后端
cd backend
npm run dev

# 终端2 - 前端
cd app
npm run dev
```

#### 5. 访问应用

- 前端: http://localhost:5173
- 后端API: http://localhost:3001
- 健康检查: http://localhost:3001/health

### 开发规范

#### TypeScript 配置

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

#### 代码风格

```typescript
// ✅ Good
export async function createTemplate(data: CreateTemplateDTO): Promise<Template> {
  try {
    const template = await AssessmentTemplateModel.create(data);
    logger.info(`Template created: ${template.id}`);
    return template;
  } catch (error) {
    logger.error('Failed to create template', error);
    throw error;
  }
}

// ❌ Bad
export async function createTemplate(data: any) {
  const template = await AssessmentTemplateModel.create(data);
  return template;
}
```

#### 错误处理

```typescript
// 使用 asyncHandler 包装
export const createTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { name, departmentType } = req.body;
  
  // 验证
  if (!name || !departmentType) {
    return res.status(400).json({ 
      success: false, 
      message: '缺少必要字段' 
    });
  }
  
  // 业务逻辑
  const template = await AssessmentTemplateModel.create({ name, departmentType });
  
  // 响应
  res.status(201).json({ 
    success: true, 
    data: template 
  });
});
```

### 测试

#### 单元测试

```typescript
// __tests__/models/assessmentTemplate.test.ts
import { AssessmentTemplateModel } from '@/models/assessmentTemplate.model';

describe('AssessmentTemplateModel', () => {
  it('should create template', async () => {
    const template = await AssessmentTemplateModel.create({
      name: 'Test Template',
      departmentType: 'sales',
      status: 'active',
    });
    
    expect(template.id).toBeDefined();
    expect(template.name).toBe('Test Template');
  });
});
```

#### API 测试

```bash
# 使用测试脚本
./test-assessment-system.sh
```

---

## 扩展开发

### 添加新的部门类型

#### 1. 更新类型定义

```typescript
// backend/src/types.ts
type DepartmentType = 'sales' | 'engineering' | 'manufacturing' | 'support' | 'management' | 'custom';
```

#### 2. 创建默认模板

```typescript
// backend/src/config/init-templates.ts
const customTemplate = {
  name: '自定义部门模板',
  departmentType: 'custom',
  metrics: [...],
};
```

#### 3. 更新前端

```typescript
// app/src/pages/HR/DepartmentClassification.tsx
const DEPARTMENT_TYPES = {
  // ...existing
  custom: { label: '自定义类', icon: '⚙️', color: 'bg-gray-100 text-gray-700' },
};
```

### 添加新的导出格式

#### 1. 创建导出服务

```typescript
// backend/src/services/assessmentExport.service.ts
export async function exportAsPDF(assessmentId: string): Promise<Buffer> {
  // PDF生成逻辑
}
```

#### 2. 添加路由

```typescript
// backend/src/routes/assessmentExport.routes.ts
router.get('/pdf/:assessmentId', exportController.exportAsPDF);
```

### 添加自定义统计指标

```typescript
// backend/src/services/assessmentStats.service.ts
export async function getCustomMetric(): Promise<CustomMetricData> {
  // 自定义统计逻辑
}
```

---

## 调试技巧

### 后端调试

```typescript
// 启用详细日志
LOG_LEVEL=debug npm run dev

// 使用调试器
node --inspect dist/index.js
```

### 前端调试

```typescript
// React DevTools
// Redux DevTools (for Zustand)

// 日志
console.log('[AssessmentTemplates]', templates);
```

### 数据库调试

```sql
-- 查看慢查询
EXPLAIN ANALYZE SELECT * FROM monthly_assessments WHERE employee_id = 'emp001';

-- 检查索引使用
SELECT * FROM pg_stat_user_indexes WHERE relname = 'monthly_assessments';
```

---

## 性能优化

### 后端优化

```typescript
// 1. 数据库连接池
const pool = new Pool({ max: 20 });

// 2. 查询优化
// 使用索引、限制返回字段
SELECT id, name FROM templates WHERE status = 'active';

// 3. 缓存
const cached = await redis.get(`template:${id}`);
if (cached) return JSON.parse(cached);
```

### 前端优化

```typescript
// 1. 懒加载
const AssessmentTemplates = lazy(() => import('@/pages/HR/AssessmentTemplates'));

// 2. Memo化
const MemoizedMetricList = memo(MetricList);

// 3. 虚拟滚动（大列表）
import { FixedSizeList } from 'react-window';
```

---

*开发者文档版本: 1.0*  
*最后更新: 2026-03-01*  
*适用版本: Phase 1*
