# 核心部门、岗位、考核模板初始化指南

## 📋 概述

本指南提供了一套完整的 SQL 脚本，用于初始化绩效管理系统中的：
- **核心部门**（8 个）
- **核心岗位**（22 个）
- **考核指标**（30+ 个）
- **考核模板**（12 个）
- **评分标准**（L1-L5 五级）

## 📁 文件说明

- `013_core_department_templates.sql` - 主初始化脚本
- `execute-migration.js` - Node.js 执行脚本（本地）
- `execute_migration.sh` - SSH 执行脚本（ECS）

## 🚀 执行方式

### 方式 1：通过 ECS 服务器执行（推荐）

```bash
# 1. 将 SQL 文件复制到 ECS 服务器
scp backend/migrations/013_core_department_templates.sql root@8.138.230.46:/tmp/

# 2. SSH 到 ECS 服务器
ssh root@8.138.230.46

# 3. 进入项目目录
cd /opt/performance-management

# 4. 执行 SQL 脚本
docker compose exec -T postgres psql -U postgres -d performance_management -f /tmp/013_core_department_templates.sql

# 5. 验证数据
docker compose exec -T postgres psql -U postgres -d performance_management -c "
SELECT '部门数' as type, COUNT(*) FROM departments
UNION ALL
SELECT '岗位数', COUNT(*) FROM positions
UNION ALL
SELECT '指标数', COUNT(*) FROM performance_metrics
UNION ALL
SELECT '模板数', COUNT(*) FROM metric_templates;
"
```

### 方式 2：通过 Node.js 脚本执行（本地开发）

```bash
cd backend
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/performance_management"
node src/scripts/execute-migration.js
```

### 方式 3：通过前端 UI 手动创建

1. 登录系统（HR 或管理员账号）
2. 进入「HR」→「指标库管理」
3. 点击「新建模板」
4. 选择岗位和级别
5. 添加指标并配置权重
6. 保存模板

## 📊 初始化数据清单

### 核心部门（8 个）

| 部门 | 编码 | 类型 | 说明 |
|------|------|------|------|
| 工程技术中心 | ENG | engineering | 技术研发核心部门 |
| 测试部 | TEST | engineering | 质量保障 |
| 研发部 | RD | engineering | 产品开发 |
| 人力资源部 | HR | support | 人力资源管理 |
| 销售部 | SALES | sales | 市场销售 |
| 生产部 | PROD | manufacturing | 生产制造 |
| 财务部 | FIN | support | 财务管理 |
| 质量部 | QA | support | 质量控制 |

### 核心岗位（22 个）

| 岗位 | 部门 | 级别 | 说明 |
|------|------|------|------|
| 工程技术总监 | 工程技术中心 | director | 技术战略管理 |
| 技术经理 | 工程技术中心 | senior | 技术团队管理 |
| 高级工程师 | 工程技术中心 | senior | 核心技术开发 |
| 中级工程师 | 工程技术中心 | intermediate | 模块开发 |
| 初级工程师 | 工程技术中心 | junior | 基础开发 |
| 测试经理 | 测试部 | senior | 测试团队管理 |
| 高级测试工程师 | 测试部 | senior | 复杂测试 |
| 中级测试工程师 | 测试部 | intermediate | 功能测试 |
| 初级测试工程师 | 测试部 | junior | 基础测试 |
| 人力资源总监 | 人力资源部 | director | HR 战略规划 |
| HR 经理 | 人力资源部 | senior | HR 团队管理 |
| HR 专员 | 人力资源部 | intermediate | 招聘/培训/绩效 |
| 销售总监 | 销售部 | director | 销售战略管理 |
| 销售经理 | 销售部 | senior | 销售团队管理 |
| 销售代表 | 销售部 | intermediate | 客户维护 |
| 生产经理 | 生产部 | senior | 生产计划管理 |
| 生产主管 | 生产部 | intermediate | 生产线管理 |
| 生产工人 | 生产部 | junior | 产品制造 |
| 质量经理 | 质量部 | senior | 质量体系建设 |
| 质量工程师 | 质量部 | intermediate | 质量检验 |
| 财务经理 | 财务部 | senior | 财务管理 |
| 会计 | 财务部 | intermediate | 日常账务 |

### 考核指标（30+ 个）

#### 业绩类指标（15 个）
- 任务完成率、工作质量、工作效率、deadline 遵守率、成本控制
- 销售额完成率、新客户开发、回款率、客户满意度
- 代码质量、Bug 修复率、技术创新、文档完整性
- 产量完成率、安全事故次数、设备利用率
- 团队绩效、项目交付、战略执行

#### 能力类指标（5 个）
- 专业技能、学习能力、问题解决、沟通能力、领导力

#### 态度类指标（4 个）
- 责任心、团队协作、主动性、出勤率

### 考核模板（12 个）

| 模板 | 适用岗位 | 级别 | 核心指标 |
|------|---------|------|---------|
| 高级工程师考核模板 | 高级工程师 | senior | 任务完成、代码质量、Bug 修复、技术创新 |
| 中级工程师考核模板 | 中级工程师 | intermediate | 任务完成、代码质量、Bug 修复、文档 |
| 初级工程师考核模板 | 初级工程师 | junior | 任务完成、工作质量、学习能力、主动性 |
| 高级测试工程师考核模板 | 高级测试工程师 | senior | 任务完成、工作质量、Bug 修复、技术创新 |
| 中级测试工程师考核模板 | 中级测试工程师 | intermediate | 任务完成、工作质量、效率、文档 |
| 销售经理考核模板 | 销售经理 | senior | 销售完成、回款率、团队绩效、客户满意度 |
| 销售代表考核模板 | 销售代表 | intermediate | 销售完成、新客户开发、回款率、客户满意度 |
| 生产经理考核模板 | 生产经理 | senior | 产量完成、工作质量、安全、设备利用 |
| 生产工人考核模板 | 生产工人 | junior | 产量完成、工作质量、安全、出勤 |
| HR 经理考核模板 | HR 经理 | senior | 任务完成、团队绩效、战略执行、领导力 |
| 质量经理考核模板 | 质量经理 | senior | 工作质量、任务完成、问题解决、文档 |
| 财务经理考核模板 | 财务经理 | senior | 任务完成、成本控制、工作质量、文档 |

### 评分标准（L1-L5）

| 级别 | 分数 | 说明 |
|------|------|------|
| L1 | 0.5 | 严重不达标 |
| L2 | 0.8 | 部分达标 |
| L3 | 1.0 | 基本达标 |
| L4 | 1.2 | 优秀达标 |
| L5 | 1.5 | 卓越达标 |

## 🔧 自定义配置

### 修改指标权重

```sql
-- 更新模板指标权重
UPDATE metric_template_metrics 
SET weight = 35 
WHERE template_id = 'template-eng-senior' 
  AND metric_id = 'metric-task-completion';
```

### 添加新指标

```sql
-- 添加新指标
INSERT INTO performance_metrics (id, name, code, category, type, description, weight)
VALUES ('metric-custom', '自定义指标', 'CUSTOM', 'performance', 'quantitative', '描述', 10);

-- 关联到模板
INSERT INTO metric_template_metrics (template_id, metric_id, weight, required)
VALUES ('template-eng-senior', 'metric-custom', 10, true);
```

### 添加新部门/岗位

```sql
-- 添加部门
INSERT INTO departments (id, name, code, department_type)
VALUES ('dept-new', '新部门', 'NEW', 'engineering');

-- 添加岗位
INSERT INTO positions (id, name, department_id, level, description)
VALUES ('pos-new', '新岗位', 'dept-new', 'senior', '描述');
```

## ✅ 验证

执行完成后，可以通过以下 SQL 验证：

```sql
-- 查看所有部门
SELECT id, name, code, department_type FROM departments ORDER BY sort_order;

-- 查看所有岗位
SELECT p.id, p.name, d.name as department, p.level 
FROM positions p 
JOIN departments d ON p.department_id = d.id 
ORDER BY d.sort_order, p.level;

-- 查看所有模板及其指标
SELECT t.name, p.name as position, m.name as metric, tm.weight
FROM metric_templates t
JOIN positions p ON t.position_id = p.id
JOIN metric_template_metrics tm ON t.id = tm.template_id
JOIN performance_metrics m ON tm.metric_id = m.id
ORDER BY t.name, tm.weight DESC;
```

## 📝 注意事项

1. **幂等性**：脚本使用 `ON CONFLICT` 确保可重复执行
2. **权限要求**：需要 HR 或管理员权限才能创建模板
3. **数据备份**：执行前建议备份数据库
4. **权重校验**：每个模板的指标权重总和应为 100%
5. **评分标准**：L1-L5 评分标准已预配置，可根据需要调整

## 🎯 后续步骤

1. 执行初始化脚本
2. 登录系统验证数据
3. 根据实际业务调整指标权重
4. 为现有员工分配考核模板
5. 开始第一个考核周期

---

**生成时间**: 2026-04-26
**适用系统**: 绩效管理系统 v1.0+
