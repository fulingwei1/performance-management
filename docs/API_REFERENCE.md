# 差异化考核系统 - API 参考文档

## 📋 目录
1. [基础信息](#基础信息)
2. [认证](#认证)
3. [考核模板 API](#考核模板-api)
4. [月度评分 API](#月度评分-api)
5. [导出 API](#导出-api)
6. [统计 API](#统计-api)
7. [错误码](#错误码)

---

## 基础信息

### Base URL

```
开发环境: http://localhost:3001
生产环境: https://api.your-domain.com
```

### 版本

```
API Version: v1
Documentation Version: 1.0
Last Updated: 2026-03-01
```

### 请求格式

```http
Content-Type: application/json
Authorization: Bearer <JWT_TOKEN>
```

### 响应格式

**成功响应**:
```json
{
  "success": true,
  "data": {...}
}
```

**错误响应**:
```json
{
  "success": false,
  "message": "错误描述",
  "error": "ERROR_CODE"
}
```

---

## 认证

### 登录

```http
POST /api/auth/login
```

**请求**:
```json
{
  "username": "hr001",
  "password": "123456"
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "hr001",
      "name": "HR管理员",
      "role": "hr"
    }
  }
}
```

**状态码**:
- `200`: 登录成功
- `401`: 用户名或密码错误
- `400`: 缺少必要字段

---

## 考核模板 API

### 1. 获取所有模板

```http
GET /api/assessment-templates
```

**Query 参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| includeMetrics | boolean | 否 | 是否包含指标详情（默认false） |
| status | string | 否 | 筛选状态（active/inactive） |
| departmentType | string | 否 | 筛选部门类型 |

**请求示例**:
```http
GET /api/assessment-templates?includeMetrics=true&status=active
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "销售部门标准模板",
      "departmentType": "sales",
      "description": "适用于销售、市场等业绩导向部门",
      "status": "active",
      "createdAt": "2026-03-01T10:00:00.000Z",
      "updatedAt": "2026-03-01T10:00:00.000Z",
      "metrics": [
        {
          "id": "metric-001",
          "metricName": "销售额完成率",
          "metricCode": "SALES_COMPLETION",
          "weight": 30,
          "category": "performance",
          "evaluationType": "quantitative",
          "description": "实际销售额 / 目标销售额 × 100%",
          "sortOrder": 1
        }
      ]
    }
  ]
}
```

---

### 2. 获取单个模板

```http
GET /api/assessment-templates/:id
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| id | UUID | 模板ID |

**响应**: 同上，返回单个模板对象

---

### 3. 获取默认模板

```http
GET /api/assessment-templates/default/:departmentType
```

**路径参数**:
| 参数 | 类型 | 说明 | 可选值 |
|------|------|------|--------|
| departmentType | string | 部门类型 | sales, engineering, manufacturing, support, management |

**请求示例**:
```http
GET /api/assessment-templates/default/sales
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "销售部门标准模板",
    "departmentType": "sales",
    "metrics": [...]
  }
}
```

**状态码**:
- `200`: 成功
- `404`: 未找到默认模板
- `401`: 未授权

---

### 4. 创建模板

```http
POST /api/assessment-templates
```

**请求体**:
```json
{
  "name": "销售部Q2模板",
  "departmentType": "sales",
  "description": "2026年Q2销售部考核模板",
  "status": "active"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | 是 | 模板名称（最长100字符） |
| departmentType | string | 是 | 部门类型 |
| description | string | 否 | 描述 |
| status | string | 否 | 状态（默认active） |

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "new-template-uuid",
    "name": "销售部Q2模板",
    "departmentType": "sales",
    "status": "active",
    "createdAt": "2026-03-01T12:00:00.000Z"
  }
}
```

**状态码**:
- `201`: 创建成功
- `400`: 请求参数错误
- `401`: 未授权
- `403`: 无权限（非HR角色）

---

### 5. 更新模板

```http
PUT /api/assessment-templates/:id
```

**请求体**:
```json
{
  "name": "销售部Q2模板（修订版）",
  "description": "更新后的描述",
  "status": "inactive"
}
```

**响应**: 返回更新后的模板对象

---

### 6. 删除模板

```http
DELETE /api/assessment-templates/:id
```

**响应**:
```json
{
  "success": true,
  "message": "模板已删除"
}
```

**状态码**:
- `200`: 删除成功
- `404`: 模板不存在
- `400`: 模板正在使用中，无法删除

---

### 7. 添加指标

```http
POST /api/assessment-templates/:id/metrics
```

**请求体**:
```json
{
  "metricName": "客户满意度",
  "metricCode": "CUSTOMER_SATISFACTION",
  "weight": 15,
  "category": "quality",
  "evaluationType": "qualitative",
  "description": "客户反馈评分平均值",
  "sortOrder": 4
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| metricName | string | 是 | 指标名称 |
| metricCode | string | 是 | 指标编码（唯一） |
| weight | integer | 是 | 权重（0-100） |
| category | string | 是 | 类别（performance/quality/behavior/learning） |
| evaluationType | string | 是 | 类型（quantitative/qualitative） |
| description | string | 否 | 描述 |
| sortOrder | integer | 否 | 排序（默认999） |

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "metric-uuid",
    "templateId": "template-uuid",
    "metricName": "客户满意度",
    ...
  }
}
```

**验证规则**:
- 权重总和不能超过100%
- 同一模板内metricCode唯一

---

### 8. 获取模板指标

```http
GET /api/assessment-templates/:id/metrics
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "metric-001",
      "metricName": "销售额完成率",
      ...
    }
  ]
}
```

---

## 月度评分 API

### 1. 创建或更新评分

```http
POST /api/performance/monthly
```

**请求体**:
```json
{
  "employeeId": "emp001",
  "month": "2026-03",
  "templateId": "template-uuid",
  "templateName": "销售部门标准模板",
  "departmentType": "sales",
  "scores": [
    {
      "metricName": "销售额完成率",
      "metricCode": "SALES_COMPLETION",
      "weight": 30,
      "level": "L4",
      "score": 1.2,
      "comment": "超额完成目标20%，表现优秀"
    },
    {
      "metricName": "回款率",
      "metricCode": "PAYMENT_RATE",
      "weight": 20,
      "level": "L3",
      "score": 1.0,
      "comment": "达到预期"
    }
  ],
  "totalScore": 1.15,
  "evaluatorId": "m001",
  "evaluatorName": "张经理"
}
```

**字段说明**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| employeeId | string | 是 | 员工ID |
| month | string | 是 | 月份（YYYY-MM格式） |
| templateId | UUID | 是 | 使用的模板ID |
| templateName | string | 是 | 模板名称 |
| departmentType | string | 是 | 部门类型 |
| scores | array | 是 | 评分数组（不能为空） |
| totalScore | number | 是 | 总分（0-2） |
| evaluatorId | string | 是 | 评分人ID |
| evaluatorName | string | 是 | 评分人姓名 |

**scores 数组元素**:
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| metricName | string | 是 | 指标名称 |
| metricCode | string | 是 | 指标编码 |
| weight | integer | 是 | 权重 |
| level | string | 是 | 评级（L1-L5） |
| score | number | 是 | 得分（0.5/0.8/1.0/1.2/1.5） |
| comment | string | 否 | 评价说明 |

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "assessment-uuid",
    "employeeId": "emp001",
    "month": "2026-03",
    "totalScore": 1.15,
    "createdAt": "2026-03-01T14:00:00.000Z"
  },
  "message": "评分已创建"
}
```

**状态码**:
- `201`: 创建成功
- `200`: 更新成功（同员工同月份）
- `400`: 请求参数错误
- `401`: 未授权

**验证规则**:
- 月份格式必须为 YYYY-MM
- totalScore 必须在 0-2 范围内
- scores 数组不能为空
- level 必须为 L1/L2/L3/L4/L5 之一

---

### 2. 获取员工评分历史

```http
GET /api/performance/employee/:employeeId
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| employeeId | string | 员工ID |

**请求示例**:
```http
GET /api/performance/employee/emp001
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "id": "assessment-1",
      "employeeId": "emp001",
      "employeeName": "张三",
      "month": "2026-03",
      "templateName": "销售部门标准模板",
      "totalScore": 1.15,
      "evaluatorName": "李经理",
      "createdAt": "2026-03-01T14:00:00.000Z"
    },
    {
      "id": "assessment-2",
      "month": "2026-02",
      "totalScore": 1.10,
      ...
    }
  ]
}
```

---

### 3. 获取特定月份评分

```http
GET /api/performance/employee/:employeeId/month/:month
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| employeeId | string | 员工ID |
| month | string | 月份（YYYY-MM） |

**请求示例**:
```http
GET /api/performance/employee/emp001/month/2026-03
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "assessment-uuid",
    "employeeId": "emp001",
    "month": "2026-03",
    "scores": [
      {
        "metricName": "销售额完成率",
        "level": "L4",
        "score": 1.2,
        "comment": "超额完成目标"
      }
    ],
    "totalScore": 1.15
  }
}
```

**状态码**:
- `200`: 成功
- `404`: 未找到评分记录

---

## 导出 API

### 1. 导出月度评分记录

```http
GET /api/export/monthly-assessments
```

**Query 参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| month | string | 否 | 月份（YYYY-MM） |
| departmentType | string | 否 | 部门类型 |
| employeeIds | string | 否 | 员工ID列表（逗号分隔） |

**请求示例**:
```http
GET /api/export/monthly-assessments?month=2026-03&departmentType=sales
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**响应**:
```
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="月度评分记录_2026-03_1709286400.xlsx"

<Binary Excel Data>
```

**Excel 包含**:
- Sheet 1: 评分明细
- Sheet 2: 指标评分详情
- Sheet 3: 统计汇总

---

### 2. 导出部门类型统计

```http
GET /api/export/department-stats
```

**请求示例**:
```http
GET /api/export/department-stats
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**响应**: Excel文件（包含部门类型统计数据）

---

### 3. 导出员工评分趋势

```http
GET /api/export/score-trend/:employeeId
```

**路径参数**:
| 参数 | 类型 | 说明 |
|------|------|------|
| employeeId | string | 员工ID |

**响应**: Excel文件（包含员工历史评分趋势和统计）

---

## 统计 API

### 1. 部门类型统计

```http
GET /api/stats/department-types
```

**响应**:
```json
{
  "success": true,
  "data": [
    {
      "departmentType": "sales",
      "templateCount": 2,
      "metricCount": 14,
      "avgMetricsPerTemplate": 7.0,
      "activeCount": 2
    },
    {
      "departmentType": "engineering",
      "templateCount": 1,
      "metricCount": 8,
      "avgMetricsPerTemplate": 8.0,
      "activeCount": 1
    }
  ]
}
```

---

### 2. 员工绩效趋势

```http
GET /api/stats/employee-trend/:employeeId
```

**响应**:
```json
{
  "success": true,
  "data": {
    "employeeId": "emp001",
    "employeeName": "张三",
    "avgScore": 1.15,
    "trend": "up",
    "recentScores": [1.10, 1.12, 1.15, 1.18, 1.20, 1.22],
    "assessmentCount": 12
  }
}
```

**trend 说明**:
- `up`: 上升趋势
- `down`: 下降趋势
- `stable`: 稳定

---

### 3. 评分分布

```http
GET /api/stats/score-distribution
```

**Query 参数**:
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| month | string | 否 | 月份（YYYY-MM） |

**响应**:
```json
{
  "success": true,
  "data": {
    "l5": 15,
    "l4": 45,
    "l3": 120,
    "l2": 18,
    "l1": 2
  }
}
```

---

## 错误码

### HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 201 | 创建成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（未登录或token过期） |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

### 业务错误码

| 错误码 | 说明 |
|--------|------|
| INVALID_MONTH_FORMAT | 月份格式错误 |
| SCORE_OUT_OF_RANGE | 分数超出范围 |
| WEIGHT_SUM_INVALID | 权重总和不等于100% |
| TEMPLATE_NOT_FOUND | 模板不存在 |
| TEMPLATE_IN_USE | 模板正在使用中 |
| DUPLICATE_METRIC_CODE | 指标编码重复 |
| EMPLOYEE_NOT_FOUND | 员工不存在 |
| ASSESSMENT_NOT_FOUND | 评分记录不存在 |

### 错误响应示例

```json
{
  "success": false,
  "message": "月份格式错误，应为 YYYY-MM",
  "error": "INVALID_MONTH_FORMAT"
}
```

---

## 速率限制

| 端点 | 限制 | 时间窗口 |
|------|------|----------|
| 所有 API | 100 请求 | 15 分钟 |
| 登录 API | 10 请求 | 15 分钟 |
| 导出 API | 20 请求 | 15 分钟 |

超过限制返回 `429 Too Many Requests`。

---

## 变更日志

### v1.0 (2026-03-01)
- 初始版本发布
- 考核模板 CRUD API
- 月度评分 API
- 数据导出 API
- 统计分析 API

---

*API 文档版本: 1.0*  
*最后更新: 2026-03-01*  
*维护: OpenClaw Performance Team*
