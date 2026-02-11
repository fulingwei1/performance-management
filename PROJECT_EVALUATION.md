# ATE 绩效管理系统 — 系统评估报告

> 评估日期：2026-02-06

## 一、系统概览

员工绩效管理系统，支持四种角色（员工 / 经理 / 总经理 / HR），核心功能包括：工作总结提交、经理评分、360 度互评、绩效排名、晋升申请审批、考核周期管理、数据导出。

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + Zustand + Tailwind CSS + shadcn/ui + Recharts |
| 后端 | Express 5 + TypeScript + PostgreSQL (Supabase) + JWT |
| 部署 | Vercel（前后端分离部署） |

### 项目结构

```
├── app/  # 前端 (React + Vite)
│ └── src/
│  ├── components/ # UI 组件 (shadcn/ui, 图表, 布局等)
│  ├── pages/   # 页面 (Employee, Manager, GM, HR)
│ ├── stores/  # Zustand 状态管理
│  ├── services/ # API 调用层
│   ├── lib/  # 工具函数
│ └── types/  # TypeScript 类型定义
├── backend/  # 后端 (Express)
│ └── src/
│  ├── controllers/  # 业务控制器
│ ├── models/  # 数据模型
│ ├── routes/ # API 路由
│  ├── middleware/  # 认证 & 错误处理中间件
│  ├── config/  # 数据库 & 初始化配置
│  └── __tests__/ # 测试
└── supabase/  # 数据库迁移脚本
```

---

## 二、问题清单

### CRITICAL（必须立即修复）

#### 1. JWT Token 通过 URL 查询参数传输

- **位置**：`app/src/services/api.ts:252,267,278,292,332,539`
- **描述**：导出功能将 JWT Token 拼接在 URL 查询参数上：
 ```typescript
 window.location.href = `${API_BASE_URL}/export/...?token=${token}`;
 ```
- **风险**：Token 会出��在浏览器历史记录、服务器访问日志、代理日志、Referer 头中，属于凭据泄露
- **建议**：改为 POST 请求 + Blob 下载，或使用一次性 download token

#### 2. 无速率限制（Rate Limiting）

- **位置**：`backend/src/index.ts`（全局中间件层）
- **描述**：后端未安装 `helmet`、`express-rate-limit` 或任何防暴力破解中间件
- **风险**：登录接口完全暴露，攻击者可无限次尝试密码
- **建议**：安装 `express-rate-limit`，登录接口限制为 5次/分钟，全局限制 100次/分钟

#### 3. 明文密码存储在初始化数据中

- **位置**：`backend/src/config/init-data.ts`（所有用户密码均为 `'123456'`）
- **描述**：内存数据库模式下直接明文比对密码 (`auth.controller.ts:48`)
- **风险**：降低安全底线，源码中明文密码可被泄露
- **建议**：init-data 中存储 bcrypt hash 值；移除内存数据库的明文比对逻辑

#### 4. CORS 配置过于宽松

- **位置**：`backend/src/index.ts:43`
- **描述**：允许所有 `*.vercel.app` 域名
 ```javascript
 origin.endsWith('.vercel.app')
 ```
- **风险**：任何人部署在 Vercel 上的应用都能请求 API
- **建议**：改为精确匹配项目的 Vercel 域名

---

### HIGH（应尽快修复）

#### 5. 前端默认密码硬编码

- **位置**：`app/src/services/api.ts:91`
- **描述**：创建员工时前端硬编码默认密码 `'123456'`
- **建议**：默认密码应由后端生成，或要求管理员设置

#### 6. 缺少 HTTP 安全头

- **位置**：`backend/src/index.ts`
- **描述**：未使用 `helmet` 中间件，缺少 `X-Content-Type-Options`、`X-Frame-Options`、`Strict-Transport-Security` 等
- **建议**：安装并启用 `helmet`

#### 7. `any` 类型滥用 — 102 处

- **位置**：后端全局，集中在 `database.ts`、`controllers/`、`models/`
- **描述**：`config: any`、`query` 返回 `Promise<any[]>` 等，类型安全形同虚设
- **建议**：从数据库层开始，逐步用具体类型替代 `any`

#### 8. 测试覆盖率严重不足

| 类型 | 现状 |
|------|------|
| 前端单元测试 | 2 个文件（`calculateScore.test.ts`、`scoreNormalization.test.ts`） |
| 前端组件测试 | 0 |
| 后端集成测试 | 4 个文件 |
| 后端单元测试 | 1 个文件 |
| E2E 测试 | 0 |

- **目标**：80% 覆盖率
- **建议**：优先为登录、评分、晋升审批等核心流程补充测试

#### 9. `submitPeerReview` 是假实现

- **位置**：`app/src/stores/performanceStore.ts:182-189`
- **描述**：
 ```typescript
 submitPeerReview: async (_data) => {
 await new Promise(resolve => setTimeout(resolve, 600));
 return true;
 }
 ```
 仅用 `setTimeout` 模拟，没有实际 API 调用
- **建议**：接入 `peerReviewApi.submitReview`

---

### MEDIUM（建议修复）

#### 10. console.log 泛滥

| 位置 | 数量 |
|------|------|
| 后端 `src/` | 74 处 |
| 前端 `src/` | 6 处 |

- **描述**：请求日志中间件用 `console.log`，生产环境应使用结构化日志库
- **建议**：后端使用 pino 或 winston；前端移除 console.log

#### 11. 大文件问题

| 文件 | 行数 | 建议 |
|------|------|------|
| `pages/HR/Dashboard.tsx` | **1076** | 拆分为 5-6 个子组件 |
| `pages/Manager/Scoring.tsx` | **887** | 拆分评分表单、列表、筛选器 |
| `pages/HR/EmployeeManagement.tsx` | **814** | 拆分表格、表单、搜索 |
| `pages/HR/HRDataImportCenter.tsx` | **776** | 拆分上传、预览、映射 |
| `stores/hrStore.ts` | **651** | 按功能域拆分为多个 store |

#### 12. 错误处理器仍引用 MySQL 错误码

- **位置**：`backend/src/middleware/errorHandler.ts:22-44`
- **描述**：检查 `ER_DUP_ENTRY`、`ER_NO_REFERENCED_ROW` 等 MySQL 错误码，但数据库已迁移到 PostgreSQL，这些分支永远不会触发
- **建议**：替换为 PostgreSQL 错误码（如 `23505` 唯一约束冲突）

#### 13. SQL 兼容层脆弱

- **位置**：`backend/src/config/database.ts:79-92`
- **描述**：`convertSql` 用简单正则将 MySQL `?` 占位符转为 PostgreSQL `$n`，并删除反引号。复杂 SQL 可能失败
- **建议**：统一使用 PostgreSQL 原生参数化查询（`$1, $2`），移除兼容层

#### 14. 数据库模式缺少索引

| 表 | 缺少索引的列 |
|----|------------|
| `performance_records` | `employee_id`, `assessor_id`, `month` |
| `employees` | `manager_id`, `department`, `name` |
| `peer_reviews` | `reviewer_id`, `reviewee_id`, `month` |

- **风险**：查询量增长后性能显著下降
- **建议**：为高频查询字段添加索引和复合索引

#### 15. 前端路由重复度高

- **位置**：`app/src/App.tsx`（300+ 行样板代码）
- **描述**：每条路由重复 `ProtectedRoute > Layout > Page` 嵌套
- **建议**：使用 React Router 嵌套路由 + layout routes 重构

---

### LOW（可优化）

#### 16. 构建产物被 Git 跟踪

- **描述**：`dist/` 和 `node_modules/.vite/` 中的文件出现在 git 变更中
- **建议**：确认 `.gitignore` 生效，清理已跟踪的构建产物

#### 17. 缺少 `(employee_id, month)` 唯一约束

- **位置**：`supabase/migrations/20250131120000_init_schema.sql` — `performance_records` 表
- **描述**：代码中手动检查 `findByEmployeeIdAndMonth`，但数据库无唯一约束保护
- **风险**：并发场景下可能产生重复记录
- **建议**：添加 `UNIQUE(employee_id, month)` 约束

#### 18. 缺少环境变量启动验证

- **描述**：启动时没有系统性验证必需的环境变量（如 `DATABASE_URL`），仅在运行时零散检查
- **建议**：使用 zod 做启动时 schema 验证，缺少必要变量时立即 fail-fast

---

## 三、架构评分

| 维度 | 评分 | 说明 |
|------|------|------|
| 功能完整度 | 7/10 | 核心绩效流程完整，有互评、晋升、导出等，但部分功能（互评提交）是 mock |
| 代码组织 | 5/10 | 前后端分离清晰，但单文件过大，路由重复，缺少抽象层 |
| 类型安全 | 4/10 | 有 TypeScript 但 `any` 泛滥，数据库层无类型保障 |
| 安全性 | 3/10 | JWT 认证基本正确，但 token 泄露风险、无速率限制、CORS 过宽 |
| 测试覆盖 | 2/10 | 几乎无有效测试覆盖，离 80% 目标差距巨大 |
| 可维护性 | 5/10 | 模块划分合理（controller/model/routes），但大文件影响可读性 |
| 部署就绪 | 6/10 | Vercel 部署配置到位，支持内存/PostgreSQL 双模式 |

---

## 四、优先行动建议

### P0 — 安全加固（立即）

1. 安装 `helmet` + `express-rate-limit`
2. 修复 token-in-URL 问题（改为 Blob 下载）
3. 收紧 CORS 为精确域名匹配
4. 移除内存数据库明文密码比对

### P1 — 代码质量（本迭代）

5. 消灭 `any` 类型（从 `database.ts` 和 `models/` 开始）
6. 拆分超大组件（Dashboard 1076 行 → 多个子组件）
7. 替换 MySQL 错误码为 PostgreSQL 错误码
8. 接入真实的互评提交 API

### P2 — 测试补全（下一迭代）

9. 为核心流程补充集成测试（登录、评分、晋升审批）
10. 为前端关键组件添加组件测试
11. 添加至少一条 E2E 测试覆盖主流程

### P3 — 优化（持续）

12. 添加数据库索引
13. 重构 App.tsx ��由为嵌套路由
14. 引入结构化日志替代 console.log
15. 添加环境变量启动验证
