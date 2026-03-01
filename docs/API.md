# ATE绩效管理系统 Phase 2 API文档

> 基础URL: `http://localhost:3001` (开发) | `https://performance-management-api-three.vercel.app` (生产)
> 
> Swagger UI: http://localhost:3001/api-docs
> 
> OpenAPI JSON: http://localhost:3001/api-docs.json

## 认证

所有API需要Bearer Token认证：

```
Authorization: Bearer <JWT_TOKEN>
```

## 通用响应格式

**成功:**
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

**失败:**
```json
{
  "success": false,
  "message": "错误描述",
  "error": "详细错误信息"
}
```

---

## 一、360度互评模块

### 1.1 互评周期管理

#### POST /api/peer-reviews/cycles — 创建互评周期

**权限:** HR

**请求体:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 周期名称 |
| description | string | | 描述 |
| start_date | date | ✅ | 开始日期 |
| end_date | date | ✅ | 结束日期 |
| review_type | string | | peer/360/upward/downward，默认peer |
| is_anonymous | boolean | | 是否匿名，默认false |

**请求示例:**
```json
{
  "name": "2026年Q1互评",
  "description": "第一季度360度互评",
  "start_date": "2026-01-01",
  "end_date": "2026-03-31",
  "review_type": "peer",
  "is_anonymous": false
}
```

**响应 201:**
```json
{
  "success": true,
  "message": "互评周期创建成功",
  "data": {
    "id": 1,
    "name": "2026年Q1互评",
    "status": "draft",
    ...
  }
}
```

---

#### GET /api/peer-reviews/cycles — 获取周期列表

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| status | string | draft/active/completed/cancelled |
| review_type | string | peer/360/upward/downward |

**响应 200:**
```json
{
  "success": true,
  "data": [...],
  "total": 5
}
```

---

#### GET /api/peer-reviews/cycles/:id — 获取单个周期

**路径参数:** `id` (integer) — 周期ID

**响应:** 200 成功 / 404 不存在

---

#### PUT /api/peer-reviews/cycles/:id — 更新周期

**路径参数:** `id` (integer)

**请求体:** 同创建接口，所有字段可选，额外支持 `status` 字段

**响应:** 200 成功 / 404 不存在

---

#### DELETE /api/peer-reviews/cycles/:id — 删除周期

**路径参数:** `id` (integer)

**响应:** 200 成功 / 404 不存在

---

### 1.2 评价关系管理

#### POST /api/peer-reviews/relationships — 批量创建评价关系

**权限:** HR

**请求体:**
```json
{
  "cycle_id": 1,
  "relationships": [
    {
      "reviewer_id": 2,
      "reviewee_id": 3,
      "relationship_type": "peer",
      "department_id": 1,
      "weight": 1.0
    }
  ]
}
```

**响应 201:**
```json
{
  "success": true,
  "message": "成功创建 2 条评价关系",
  "count": 2
}
```

---

#### GET /api/peer-reviews/relationships/:cycleId — 获取评价关系

**路径参数:** `cycleId` (integer)

**查询参数:**
| 参数 | 类型 | 说明 |
|------|------|------|
| reviewer_id | integer | 按评价人筛选 |
| reviewee_id | integer | 按被评价人筛选 |

---

### 1.3 互评记录

#### POST /api/peer-reviews/reviews — 提交互评

**请求体:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| relationship_id | integer | ✅ | 评价关系ID |
| cycle_id | integer | ✅ | 周期ID |
| reviewer_id | integer | ✅ | 评价人ID |
| reviewee_id | integer | ✅ | 被评价人ID |
| teamwork_score | number | | 团队协作分(1-5) |
| communication_score | number | | 沟通能力分(1-5) |
| professional_score | number | | 专业能力分(1-5) |
| responsibility_score | number | | 责任心分(1-5) |
| innovation_score | number | | 创新能力分(1-5) |
| strengths | string | | 优点 |
| improvements | string | | 改进建议 |
| overall_comment | string | | 总体评语 |
| is_anonymous | boolean | | 是否匿名 |

**请求示例:**
```json
{
  "relationship_id": 1,
  "cycle_id": 1,
  "reviewer_id": 2,
  "reviewee_id": 3,
  "teamwork_score": 4.5,
  "communication_score": 4.0,
  "professional_score": 4.5,
  "responsibility_score": 5.0,
  "innovation_score": 3.5,
  "strengths": "团队协作能力强",
  "improvements": "可以加强创新思维",
  "overall_comment": "整体表现优秀"
}
```

---

#### GET /api/peer-reviews/reviews/:cycleId — 获取互评记录

**路径参数:** `cycleId` (integer)

**查询参数:** `reviewer_id`, `reviewee_id` (可选)

---

#### GET /api/peer-reviews/statistics/:cycleId — 获取互评统计

**路径参数:** `cycleId` (integer)

**查询参数:** `reviewee_id` (可选)

**响应包含:** 各维度平均分、评价数量等统计数据

---

## 二、绩效面谈模块

### 2.1 面谈计划

#### POST /api/interview-records/plans — 创建面谈计划

**权限:** 经理/HR

**请求体:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| title | string | ✅ | 计划标题 |
| description | string | | 描述 |
| interview_type | string | ✅ | quarterly/annual/probation/improvement/special |
| scheduled_date | date | ✅ | 计划日期 |
| scheduled_time | string | | 计划时间 |
| duration_minutes | integer | | 时长(分钟)，默认60 |
| manager_id | integer | ✅ | 经理ID |
| employee_id | integer | ✅ | 员工ID |
| department_id | integer | | 部门ID |
| template_id | integer | | 模板ID |

**请求示例:**
```json
{
  "title": "Q1绩效面谈",
  "interview_type": "quarterly",
  "scheduled_date": "2026-04-01",
  "scheduled_time": "14:00",
  "manager_id": 1,
  "employee_id": 5
}
```

---

#### GET /api/interview-records/plans — 获取面谈计划列表

**查询参数:** `manager_id`, `employee_id`, `status`

---

#### PUT /api/interview-records/plans/:id — 更新面谈计划

**路径参数:** `id` (integer)

---

### 2.2 面谈记录

#### POST /api/interview-records/records — 创建面谈记录

**权限:** 经理

**请求体:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| plan_id | integer | | 关联计划ID |
| employee_id | integer | ✅ | 员工ID |
| manager_id | integer | ✅ | 经理ID |
| interview_date | date | ✅ | 面谈日期 |
| interview_time | string | | 面谈时间 |
| duration_minutes | integer | | 实际时长 |
| employee_summary | string | | 员工自述 |
| manager_feedback | string | | 经理反馈 |
| achievements | string | | 成就 |
| challenges | string | | 挑战 |
| strengths | string | | 优势 |
| improvements | string | | 改进点 |
| overall_rating | string | | excellent/good/average/below_average/poor |
| performance_score | number | | 绩效分数 |
| potential_score | number | | 潜力分数 |
| notes | string | | 备注 |

---

#### GET /api/interview-records/records — 获取面谈记录列表

**查询参数:** `employee_id`, `manager_id`

---

#### GET /api/interview-records/records/:id — 获取面谈记录详情

包含关联的改进计划列表。

---

### 2.3 改进计划

#### POST /api/interview-records/improvement-plans — 创建改进计划

**请求体:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| interview_record_id | integer | ✅ | 面谈记录ID |
| employee_id | integer | ✅ | 员工ID |
| manager_id | integer | ✅ | 经理ID |
| goal | string | ✅ | 改进目标 |
| description | string | | 详细描述 |
| category | string | | performance/skill/behavior/knowledge |
| priority | string | | high/medium/low |
| start_date | date | | 开始日期 |
| target_date | date | | 目标日期 |
| resources_needed | string | | 所需资源 |
| support_from_manager | string | | 需要的管理支持 |

**请求示例:**
```json
{
  "interview_record_id": 1,
  "employee_id": 5,
  "manager_id": 1,
  "goal": "提升项目管理能力",
  "category": "skill",
  "priority": "high",
  "start_date": "2026-04-01",
  "target_date": "2026-06-30"
}
```

---

#### PUT /api/interview-records/improvement-plans/:id/progress — 更新进度

**请求体:**
```json
{
  "progress": 50,
  "notes": "已完成PMP课程学习"
}
```

`progress` 必须在 0-100 之间。

---

#### GET /api/interview-records/improvement-plans/employee/:employeeId — 获取员工改进计划

**查询参数:** `status` (not_started/in_progress/completed/cancelled)
