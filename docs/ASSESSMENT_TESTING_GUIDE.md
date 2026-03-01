# 差异化考核系统 - 测试指南

## 📋 目录
1. [环境准备](#环境准备)
2. [数据库初始化](#数据库初始化)
3. [测试数据生成](#测试数据生成)
4. [功能测试流程](#功能测试流程)
5. [API 测试](#api-测试)
6. [常见问题](#常见问题)

---

## 环境准备

### 启动服务

```bash
# 1. 启动后端（Memory DB 模式）
cd backend
PORT=3001 USE_MEMORY_DB=true npm run dev

# 2. 启动前端
cd app
VITE_API_URL=http://localhost:3001 npm run dev
```

### 验证服务状态

```bash
# 检查后端健康状态
curl http://localhost:3001/health

# 预期响应
{
  "success": true,
  "message": "Server is running",
  "timestamp": "..."
}
```

---

## 数据库初始化

### PostgreSQL 数据库

```bash
# 运行迁移脚本
psql -U postgres -d performance_db -f backend/migrations/010_department_classification.sql
psql -U postgres -d performance_db -f backend/migrations/011_monthly_assessments.sql
```

### MySQL 数据库

```sql
-- 使用 migrations 文件中的 MySQL 版本注释内容
-- 复制并执行对应的 CREATE TABLE 语句
```

### Memory DB（推荐用于测试）

```typescript
// Memory DB 会在启动时自动初始化
// 无需手动运行迁移脚本
```

---

## 测试数据生成

### 方法1：通过代码生成

```typescript
// backend/src/config/init-templates.ts
import { seedAssessmentTestData } from './seed-assessment-test-data';

async function initAll() {
  await initializeAssessmentTemplates();
  await seedAssessmentTestData(); // 生成测试评分数据
}

initAll();
```

### 方法2：通过 API 手动创建

```bash
# 1. 登录获取 token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hr001","password":"123456"}'

# 2. 创建评分记录
curl -X POST http://localhost:3001/api/performance/monthly \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "employeeId": "emp001",
    "month": "2026-03",
    "templateId": "template-sales-001",
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
  }'
```

### 测试数据覆盖

生成的测试数据包括：
- **4 名员工**（销售/工程/生产/支持各1人）
- **3 个月份**（2025-12, 2026-01, 2026-02）
- **共 12 条评分记录**
- **每条记录包含 6-9 个指标评分**

---

## 功能测试流程

### 1. HR - 部门分类管理

**测试路径**: `/hr/department-classification`

**测试步骤**:
1. 登录 HR 账号（`hr001` / `123456`）
2. 查看部门列表
3. 为部门设置类型（销售/工程/生产/支持/管理）
4. 保存并验证

**验证点**:
- ✅ 部门类型下拉选择正常
- ✅ 保存后数据持久化
- ✅ 类型图标和颜色正确显示

---

### 2. HR - 考核模板管理

**测试路径**: `/hr/assessment-templates`

**测试步骤**:
1. 查看默认模板列表（应有4个）
2. 点击"查看详情"查看指标
3. 创建新模板
4. 编辑现有模板
5. 删除测试模板

**验证点**:
- ✅ 模板列表正确显示
- ✅ 指标权重总和 = 100%
- ✅ CRUD 操作正常
- ✅ 状态切换（启用/禁用）正常

---

### 3. 经理 - 差异化评分

**测试路径**: `/manager/differentiated-scoring`

**测试步骤**:
1. 登录经理账号（`m001` / `123456`）
2. 选择员工（如 emp001）
3. 系统自动加载对应模板
4. 为每个指标选择评级（L1-L5）
5. 填写评价说明（可选）
6. 查看实时总分计算
7. 保存评分

**验证点**:
- ✅ 员工列表正确显示
- ✅ 模板自动匹配部门类型
- ✅ 评分界面响应灵敏
- ✅ 总分计算准确
- ✅ 完成度进度条正确
- ✅ 保存成功并提示

---

### 4. HR - 数据导出

**测试路径**: `/hr/assessment-export`

**测试步骤**:
1. 导出月度评分记录
   - 选择月份：2026-03
   - 选择部门类型：销售类
   - 点击"导出 Excel"
2. 导出部门类型统计
   - 直接点击"导出统计报表"
3. 导出员工评分趋势
   - 输入员工ID：emp001
   - 点击"导出趋势分析"

**验证点**:
- ✅ Excel 文件成功下载
- ✅ 文件格式正确（可用 Excel/WPS 打开）
- ✅ 数据完整无缺失
- ✅ 表头样式美观
- ✅ 统计数据准确

---

### 5. 员工 - 查看自己的评分

**测试路径**: `/employee/scores`

**测试步骤**:
1. 登录员工账号（`emp001` / `123456`）
2. 查看评分历史
3. 查看详细评分报告
4. 下载个人评分记录

**验证点**:
- ✅ 只能看到自己的评分
- ✅ 评分详情展示完整
- ✅ 趋势图表正确

---

## API 测试

### 考核模板 API

```bash
# 获取所有模板
curl http://localhost:3001/api/assessment-templates \
  -H "Authorization: Bearer YOUR_TOKEN"

# 获取默认模板
curl http://localhost:3001/api/assessment-templates/default/sales \
  -H "Authorization: Bearer YOUR_TOKEN"

# 创建模板
curl -X POST http://localhost:3001/api/assessment-templates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{...}'
```

### 月度评分 API

```bash
# 创建评分
curl -X POST http://localhost:3001/api/performance/monthly \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{...}'

# 获取员工评分历史
curl http://localhost:3001/api/performance/employee/emp001 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 获取特定月份评分
curl http://localhost:3001/api/performance/employee/emp001/month/2026-03 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 导出 API

```bash
# 导出月度评分
curl "http://localhost:3001/api/export/monthly-assessments?month=2026-03" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o monthly_assessments.xlsx

# 导出部门统计
curl http://localhost:3001/api/export/department-stats \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o department_stats.xlsx

# 导出员工趋势
curl http://localhost:3001/api/export/score-trend/emp001 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o employee_trend.xlsx
```

### 统计 API

```bash
# 部门类型统计
curl http://localhost:3001/api/stats/department-types \
  -H "Authorization: Bearer YOUR_TOKEN"

# 员工绩效趋势
curl http://localhost:3001/api/stats/employee-trend/emp001 \
  -H "Authorization: Bearer YOUR_TOKEN"

# 评分分布
curl http://localhost:3001/api/stats/score-distribution?month=2026-03 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 常见问题

### Q1: 模板加载失败？

**原因**: 部门类型未配置或模板未初始化

**解决**:
```typescript
// 运行模板初始化
npm run init-templates
```

### Q2: 评分保存失败？

**检查**:
1. 权重总和是否 = 100%
2. 总分是否在 0-2 范围内
3. 月份格式是否为 YYYY-MM
4. 是否有权限

### Q3: 导出文件乱码？

**原因**: 编码问题

**解决**: 使用支持 UTF-8 的 Excel 版本或 WPS

### Q4: Memory DB 数据丢失？

**说明**: Memory DB 数据存储在内存中，重启后会丢失

**解决**: 
- 测试环境：每次重启后重新生成测试数据
- 生产环境：使用 PostgreSQL/MySQL

---

## 性能测试

### 并发评分测试

```bash
# 使用 Apache Bench 测试
ab -n 100 -c 10 -T 'application/json' \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -p post_data.json \
  http://localhost:3001/api/performance/monthly
```

### 大数据导出测试

```bash
# 导出大量数据（100+ 员工）
time curl "http://localhost:3001/api/export/monthly-assessments?month=2026-03" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o large_export.xlsx
```

---

## 测试检查清单

### 功能测试
- [ ] 部门分类管理正常
- [ ] 模板 CRUD 正常
- [ ] 差异化评分正常
- [ ] 自动模板匹配正常
- [ ] 评分计算准确
- [ ] 数据导出正常
- [ ] 统计 API 正常

### 边界测试
- [ ] 空数据处理
- [ ] 无效输入验证
- [ ] 权限控制
- [ ] 并发操作
- [ ] 大数据量处理

### UI/UX 测试
- [ ] 响应式布局
- [ ] 加载状态
- [ ] 错误提示
- [ ] 成功反馈
- [ ] 帮助说明

### 性能测试
- [ ] 页面加载速度 < 2s
- [ ] API 响应时间 < 500ms
- [ ] Excel 导出时间合理
- [ ] 内存占用正常

---

## 测试完成标准

✅ **所有核心功能正常运行**  
✅ **边界条件处理正确**  
✅ **用户体验流畅**  
✅ **性能指标达标**  
✅ **无严重 Bug**  

---

*测试日期: 2026-03-01*  
*版本: Phase 1 Day 6*
