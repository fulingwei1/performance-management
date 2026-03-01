# API 接口文档

> ATE 绩效管理系统完整 API 参考，共 42 个端点。

## 认证说明

所有 API（除登录外）需在请求头携带 JWT Token：

```
Authorization: Bearer <token>
```

### 获取 Token

```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "admin",
  "password": "admin123"
}
```

**响应：**

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "name": "管理员"
  }
}
```

## 错误码

| HTTP 状态码 | 说明 |
|------------|------|
| 200 | 成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 / Token 过期 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

**错误响应格式：**

```json
{
  "error": "错误描述信息",
  "code": "ERROR_CODE"
}
```

---

## 1. 认证模块 (Auth)

### POST /api/auth/login

登录获取 Token。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| username | string | ✅ | 用户名 |
| password | string | ✅ | 密码 |

### GET /api/auth/me

获取当前登录用户信息。

**响应：**
```json
{
  "id": 1,
  "username": "admin",
  "name": "管理员",
  "role": "admin",
  "department_id": 1
}
```

---

## 2. 员工管理 (Employee)

### GET /api/employees

获取员工列表。支持分页和筛选。

| 参数 | 类型 | 说明 |
|------|------|------|
| page | number | 页码（默认 1） |
| limit | number | 每页数量（默认 20） |
| department_id | number | 部门筛选 |
| role | string | 角色筛选 |
| search | string | 姓名搜索 |

### GET /api/employees/:id

获取单个员工详情。

### POST /api/employees

创建员工（需 Admin/HR 权限）。

```json
{
  "username": "zhang_san",
  "password": "123456",
  "name": "张三",
  "role": "employee",
  "department_id": 2,
  "position": "测试工程师",
  "email": "zhangsan@company.com"
}
```

### PUT /api/employees/:id

更新员工信息。

### DELETE /api/employees/:id

删除员工（需 Admin 权限）。

---

## 3. 部门管理 (Department)

### GET /api/departments

获取部门列表。

### POST /api/departments

创建部门。

```json
{
  "name": "研发部",
  "parent_id": null,
  "manager_id": 5
}
```

### PUT /api/departments/:id

更新部门信息。

### DELETE /api/departments/:id

删除部门。

---

## 4. 战略目标 (Strategic Objectives)

### GET /api/strategic-objectives

获取战略目标列表。

| 参数 | 类型 | 说明 |
|------|------|------|
| year | number | 年份筛选 |
| status | string | 状态筛选（draft/active/completed） |

### POST /api/strategic-objectives

创建战略目标（需 GM 权限）。

```json
{
  "title": "2026年营收目标",
  "description": "实现全年营收增长30%",
  "year": 2026,
  "target_value": 30,
  "unit": "%"
}
```

### PUT /api/strategic-objectives/:id

更新战略目标。

### DELETE /api/strategic-objectives/:id

删除战略目标。

---

## 5. 个人目标 (Objectives)

### GET /api/objectives

获取目标列表（按当前用户权限过滤）。

### POST /api/objectives

创建个人目标。

```json
{
  "title": "完成Q1测试任务",
  "description": "完成10个项目的ICT测试",
  "strategic_objective_id": 1,
  "weight": 30,
  "target_value": 10,
  "unit": "个",
  "deadline": "2026-03-31"
}
```

### PUT /api/objectives/:id

更新目标。

### DELETE /api/objectives/:id

删除目标。

---

## 6. 目标审批 (Goal Approval)

### GET /api/goal-approvals

获取待审批目标列表。

### POST /api/goal-approvals/:id/approve

审批通过。

```json
{
  "comment": "目标合理，同意"
}
```

### POST /api/goal-approvals/:id/reject

审批驳回。

```json
{
  "comment": "目标值偏低，请调整"
}
```

---

## 7. 目标进度 (Goal Progress)

### GET /api/goal-progress/:objectiveId

获取目标进度记录。

### POST /api/goal-progress

提交进度更新。

```json
{
  "objective_id": 1,
  "quarter": "Q1",
  "progress_value": 5,
  "description": "已完成5个项目测试"
}
```

---

## 8. 目标仪表板 (Goal Dashboard)

### GET /api/goal-dashboard

获取目标完成情况概览。

### GET /api/goal-dashboard/team

获取团队目标概览（经理视角）。

---

## 9. KPI 分配 (KPI Assignment)

### GET /api/kpi-assignments

获取 KPI 列表。

### POST /api/kpi-assignments

分配 KPI。

```json
{
  "employee_id": 3,
  "kpi_name": "测试通过率",
  "target_value": 95,
  "unit": "%",
  "weight": 20,
  "period": "2026-Q1"
}
```

### PUT /api/kpi-assignments/:id

更新 KPI。

### DELETE /api/kpi-assignments/:id

删除 KPI。

---

## 10. 月度报告 (Monthly Report)

### GET /api/monthly-reports

获取月度绩效列表。

| 参数 | 类型 | 说明 |
|------|------|------|
| employee_id | number | 员工 ID |
| year | number | 年份 |
| month | number | 月份 |

### POST /api/monthly-reports

提交月度绩效评分。

```json
{
  "employee_id": 3,
  "year": 2026,
  "month": 1,
  "score": 85,
  "comment": "本月表现优秀，完成所有测试任务",
  "keywords": ["责任心强", "质量意识高"]
}
```

### PUT /api/monthly-reports/:id

更新月度评分。

---

## 11. 季度总结 (Quarterly Summary)

### GET /api/quarterly-summaries

获取季度总结列表。

### POST /api/quarterly-summaries

提交季度总结。

```json
{
  "year": 2026,
  "quarter": "Q1",
  "summary": "本季度完成...",
  "achievements": "主要成绩...",
  "improvements": "改进方向..."
}
```

---

## 12. 同事互评 (Peer Review)

### GET /api/peer-reviews

获取互评列表。

### POST /api/peer-reviews

提交互评。

```json
{
  "reviewee_id": 5,
  "cycle_id": 1,
  "score": 88,
  "comment": "团队协作能力强",
  "is_anonymous": true
}
```

### GET /api/peer-review-cycles

获取互评周期列表。

### POST /api/peer-review-cycles

创建互评周期（HR 权限）。

```json
{
  "name": "2026年Q1互评",
  "start_date": "2026-03-01",
  "end_date": "2026-03-15"
}
```

---

## 13. 绩效评估 (Performance)

### GET /api/performance

获取绩效评估记录。

### POST /api/performance

创建绩效评估。

### PUT /api/performance/:id

更新绩效评估。

---

## 14. 绩效合约 (Performance Contract)

### GET /api/performance-contracts

获取绩效合约列表。

### POST /api/performance-contracts

创建绩效合约。

```json
{
  "employee_id": 3,
  "year": 2026,
  "objectives": [...],
  "kpis": [...],
  "status": "draft"
}
```

### PUT /api/performance-contracts/:id

更新合约。

### POST /api/performance-contracts/:id/sign

签署合约。

---

## 15. 绩效面谈 (Performance Interview)

### GET /api/performance-interviews

获取面谈记录。

### POST /api/performance-interviews

创建面谈记录。

```json
{
  "employee_id": 3,
  "interview_date": "2026-01-15",
  "content": "面谈内容...",
  "action_items": "改进措施..."
}
```

---

## 16. 绩效申诉 (Appeal)

### GET /api/appeals

获取申诉列表。

### POST /api/appeals

提交申诉。

```json
{
  "performance_id": 1,
  "reason": "评分有误，实际完成率为100%",
  "evidence": "附件链接..."
}
```

### PUT /api/appeals/:id/process

处理申诉（经理/HR）。

```json
{
  "status": "approved",
  "response": "经核实，调整评分"
}
```

---

## 17. 考核发布 (Assessment)

### GET /api/assessment-cycles

获取考核周期。

### POST /api/assessment-cycles

创建考核周期。

### POST /api/assessment-publications

发布考核结果。

```json
{
  "cycle_id": 1,
  "publish_scope": "all",
  "notify": true
}
```

---

## 18. 晋升管理 (Promotion)

### GET /api/promotion-requests

获取晋升申请列表。

### POST /api/promotion-requests

提交晋升申请。

```json
{
  "current_level": "P5",
  "target_level": "P6",
  "performance_summary": "业绩总结...",
  "skill_summary": "技能总结...",
  "capability_summary": "能力总结...",
  "work_summary": "工作总结..."
}
```

### PUT /api/promotion-requests/:id/approve

审批晋升申请。

### PUT /api/promotion-requests/:id/reject

驳回晋升申请。

---

## 19. 通知 (Notification)

### GET /api/notifications

获取通知列表。

### PUT /api/notifications/:id/read

标记已读。

### PUT /api/notifications/read-all

全部标记已读。

---

## 20. 审计日志 (Audit Log)

### GET /api/audit-logs

获取审计日志（Admin 权限）。

| 参数 | 类型 | 说明 |
|------|------|------|
| action | string | 操作类型筛选 |
| user_id | number | 用户筛选 |
| start_date | string | 开始日期 |
| end_date | string | 结束日期 |
| page | number | 页码 |
| limit | number | 每页数量 |

---

## 21. 仪表板 (Dashboard)

### GET /api/dashboard

获取仪表板数据。

### GET /api/dashboard/stats

获取统计数据。

---

## 22. AI 服务

### POST /api/ai/generate

AI 生成评价/总结。

```json
{
  "type": "monthly_review",
  "context": {
    "employee_name": "张三",
    "score": 85,
    "period": "2026年1月"
  }
}
```

### GET /api/ai/stats

获取 AI 使用统计。

### GET /api/ai/stats/global

获取全局 AI 使用统计（Admin）。

---

## 23. 指标库 (Metric Library)

### GET /api/metric-library

获取指标库列表。

### POST /api/metric-library

添加指标。

---

## 24. 数据导入 (Data Import)

### POST /api/data-import/employees

批量导入员工数据（Excel）。

```
Content-Type: multipart/form-data
file: employees.xlsx
```

### POST /api/data-import/performance

批量导入绩效数据。

### GET /api/data-import/template/:type

下载导入模板。

---

## 25. 数据导出 (Data Export)

### GET /api/data-export/employees

导出员工数据（Excel）。

### GET /api/data-export/performance

导出绩效数据。

| 参数 | 类型 | 说明 |
|------|------|------|
| format | string | 导出格式（xlsx/csv） |
| year | number | 年份 |
| department_id | number | 部门筛选 |

---

## 26. 绩效分析 (Analytics)

### GET /api/analytics/overview

获取绩效分析概览。

### GET /api/analytics/trends

获取绩效趋势数据。

### GET /api/analytics/department-comparison

部门对比分析。

### GET /api/analytics/distribution

绩效分布分析。

---

## 27. 组织架构 (Organization)

### GET /api/organization/tree

获取组织架构树。

### GET /api/organization/chart

获取组织架构图数据（ReactFlow 格式）。

---

## 28. 附件 (Attachment)

### POST /api/attachments/upload

上传附件。

### GET /api/attachments/:id

下载附件。

---

## 29. 设置 (Settings)

### GET /api/settings

获取系统设置。

### PUT /api/settings

更新系统设置（Admin）。

---

## 30. 待办事项 (Todo)

### GET /api/todos

获取待办列表。

### PUT /api/todos/:id/complete

完成待办。

---

## 31. 自动化任务 (Automation)

### GET /api/automation/tasks

获取自动化任务列表。

### POST /api/automation/tasks

创建自动化任务。

### PUT /api/automation/tasks/:id/toggle

启用/停用任务。

---

## 32. 奖金 (Bonus)

### GET /api/bonus

获取奖金数据。

### POST /api/bonus/calculate

计算奖金。

---

## 33. OKR

### GET /api/okr

获取 OKR 列表。

### POST /api/okr

创建 OKR。

### PUT /api/okr/:id

更新 OKR。

---

## 34. 导出 (Export)

### GET /api/export/report

导出综合报告。

| 参数 | 类型 | 说明 |
|------|------|------|
| type | string | 报告类型 |
| format | string | 格式（pdf/xlsx） |
| period | string | 时间段 |
