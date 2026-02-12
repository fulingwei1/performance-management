# AI 使用统计功能说明

## 📊 功能概述

系统会自动记录每次 AI 调用的详细信息，包括：
- 调用用户
- 功能类型
- Token 使用量
- 成本（人民币）
- 成功/失败状态
- 时间戳

## 📁 新增的文件

### 1. 数据库迁移
- `supabase/migrations/20260212_ai_usage_logs.sql`
  - 创建 `ai_usage_logs` 表（AI 使用日志）
  - 创建 `ai_usage_stats` 视图（用户统计汇总）
  - 添加索引优化查询

### 2. 后端模型
- `backend/src/models/aiUsageLog.model.ts`
  - `createAIUsageLog()` - 记录使用日志
  - `getAIUsageStatsByUser()` - 获取用户统计
  - `getAllAIUsageStats()` - 获取所有用户统计
  - `getAIUsageLogsByDateRange()` - 按时间范围查询
  - `getOverallAIUsageStats()` - 总体统计
  - `getAIUsageByFeatureType()` - 按功能类型统计

### 3. 修改的文件
- `backend/src/controllers/ai.controller.ts` - 添加日志记录逻辑
- `backend/src/routes/ai.routes.ts` - 添加统计查询接口
- `backend/src/config/memory-db.ts` - 添加内存数据库支持

## 🔌 API 接口

### 1. 查询我的使用统计
```http
GET /api/ai/my-usage
Authorization: Bearer <token>
```

**响应示例**:
```json
{
  "success": true,
  "data": {
    "user_id": 123,
    "user_name": "张三",
    "total_calls": 15,
    "successful_calls": 14,
    "total_tokens": 35000,
    "total_cost": 0.045,
    "last_used_at": "2026-02-12T08:30:00Z"
  }
}
```

### 2. 查询所有用户统计（管理员）
```http
GET /api/ai/all-usage
Authorization: Bearer <token>
```

**权限**: 仅 `admin` 角色

**响应示例**:
```json
{
  "success": true,
  "data": [
    {
      "user_id": 123,
      "user_name": "张三",
      "total_calls": 15,
      "successful_calls": 14,
      "total_tokens": 35000,
      "total_cost": 0.045,
      "last_used_at": "2026-02-12T08:30:00Z"
    },
    {
      "user_id": 456,
      "user_name": "李四",
      "total_calls": 8,
      "successful_calls": 8,
      "total_tokens": 18000,
      "total_cost": 0.022,
      "last_used_at": "2026-02-11T15:20:00Z"
    }
  ]
}
```

## 📈 数据库表结构

### ai_usage_logs 表
```sql
CREATE TABLE ai_usage_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,              -- 用户ID
  user_name VARCHAR(100),                -- 用户名（冗余）
  feature_type VARCHAR(50) NOT NULL,     -- 功能类型
  tokens_used INTEGER DEFAULT 0,         -- 使用的 token 数
  cost_yuan DECIMAL(10, 6) DEFAULT 0,    -- 成本（元）
  success BOOLEAN DEFAULT true,          -- 是否成功
  error_message TEXT,                    -- 错误信息
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### 功能类型（feature_type）
- `self-summary` - 员工自评总结
- `next-month-plan` - 下月工作计划
- `manager-comment` - 经理综合评价
- `work-arrangement` - 下月工作安排

## 💰 成本计算

**Kimi API 定价**（参考）:
- 输入 token: ¥0.001 / 1K tokens
- 输出 token: ¥0.001 / 1K tokens

**示例计算**:
```
输入 1000 tokens + 输出 500 tokens
= (1000/1000) * 0.001 + (500/1000) * 0.001
= 0.001 + 0.0005
= 0.0015 元
```

**年度成本估算**:
- 假设每天 5 次调用，每次约 1500 tokens
- 日成本: 5 × 0.0015 = ¥0.0075
- 年成本: 0.0075 × 365 = ¥2.74

（极低成本，可忽略不计）

## 🧪 测试步骤

### 1. 配置 Kimi API Key

编辑 `backend/.env`:
```bash
KIMI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxx
```

### 2. 启动服务

```bash
# 后端
cd backend
npm run dev

# 前端
cd app
npm run dev
```

### 3. 测试调用

1. 员工登录后，进入"月度工作总结"页面
2. 点击"AI 帮我写"按钮
3. 等待 AI 生成建议
4. 查看 API 响应中的 `usage` 字段

### 4. 查看统计

**员工查看自己的统计**:
```bash
curl -X GET http://localhost:3000/api/ai/my-usage \
  -H "Authorization: Bearer <token>"
```

**管理员查看所有人统计**:
```bash
curl -X GET http://localhost:3000/api/ai/all-usage \
  -H "Authorization: Bearer <admin_token>"
```

## 🎯 前端展示（待开发）

建议在以下位置展示统计信息：

### 1. 员工个人中心
```
我的 AI 使用统计
- 本月调用次数: 15 次
- 累计调用次数: 45 次
- 本月成本: ¥0.045
- 上次使用: 2小时前
```

### 2. 管理员面板
```
AI 使用总览
- 总用户数: 120 人
- 本月总调用: 1,200 次
- 本月总成本: ¥1.80
- 最活跃用户: 张三 (30次)

功能使用排行:
1. 员工自评 - 600 次
2. 下月计划 - 400 次
3. 经理评价 - 150 次
4. 工作安排 - 50 次
```

## 📝 数据示例

### 日志记录示例
```json
{
  "id": 1,
  "user_id": 123,
  "user_name": "张三",
  "feature_type": "self-summary",
  "tokens_used": 2500,
  "cost_yuan": 0.0025,
  "success": true,
  "error_message": null,
  "created_at": "2026-02-12T08:30:00Z"
}
```

### 失败记录示例
```json
{
  "id": 2,
  "user_id": 456,
  "user_name": "李四",
  "feature_type": "manager-comment",
  "tokens_used": 0,
  "cost_yuan": 0,
  "success": false,
  "error_message": "Kimi API failed: Rate limit exceeded",
  "created_at": "2026-02-12T09:15:00Z"
}
```

## 🛠️ 内存数据库支持

在开发模式下（`USE_MEMORY_DB=true`），所有日志数据存储在内存中：
- ✅ 无需配置 PostgreSQL
- ✅ 启动更快
- ⚠️ 服务重启后数据清空

生产环境建议使用真实数据库（PostgreSQL/MySQL）。

## 📊 未来优化方向

1. **前端可视化**
   - 添加使用统计图表（echarts / recharts）
   - 个人使用趋势曲线
   - 成本预警阈值设置

2. **成本控制**
   - 单用户每日调用次数限制
   - 部门/团队预算管理
   - 超限自动通知

3. **数据分析**
   - 最受欢迎的 AI 功能
   - 高频使用时段分析
   - 用户使用习惯洞察

4. **审计功能**
   - 导出使用日志（CSV/Excel）
   - 按部门/时间段统计
   - 异常调用监控

---

**当前状态**: ✅ 后端功能已完成，等待 Kimi API Key 测试
**下一步**: 前端展示界面开发（可选）
