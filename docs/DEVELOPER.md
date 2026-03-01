# 开发者文档

## 项目架构

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   前端 App   │────▶│  后端 API   │────▶│   数据库     │
│ React+Vite  │     │  Express+TS │     │  PostgreSQL  │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │  AI 服务     │
                    │ OpenAI/Moon │
                    └─────────────┘
```

### 架构特点

- **前后端分离**：前端 SPA + 后端 RESTful API
- **角色权限控制**：JWT + 中间件级别的角色校验
- **模块化路由**：每个业务模块独立路由文件
- **AI 集成**：可插拔的 AI 服务层，支持多 Provider

---

## 目录结构

```
performance-management/
├── app/                          # 前端项目
│   ├── src/
│   │   ├── components/           # 通用组件
│   │   │   └── ui/               # Shadcn/UI 组件
│   │   ├── pages/                # 页面组件
│   │   ├── hooks/                # 自定义 Hooks
│   │   ├── lib/                  # 工具函数
│   │   ├── services/             # API 调用层
│   │   ├── types/                # TypeScript 类型定义
│   │   ├── App.tsx               # 主应用 + 路由
│   │   └── main.tsx              # 入口
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── backend/                      # 后端项目
│   ├── src/
│   │   ├── routes/               # 路由定义（37 个路由文件）
│   │   ├── middleware/           # 中间件
│   │   │   ├── auth.ts           # JWT 认证
│   │   │   └── roleCheck.ts     # 角色校验
│   │   ├── services/             # 业务逻辑层
│   │   ├── models/               # 数据模型
│   │   ├── utils/                # 工具函数
│   │   ├── db.ts                 # 数据库连接
│   │   └── index.ts              # 入口
│   ├── package.json
│   └── tsconfig.json
│
├── postgres-init/                # PostgreSQL 初始化脚本
├── mysql-init/                   # MySQL 初始化脚本
├── docker-compose.yml
├── scripts/                      # 部署/测试脚本
├── templates/                    # 导入模板
└── docs/                         # 文档
```

---

## 技术选型

### 前端

| 技术 | 用途 | 选型理由 |
|------|------|---------|
| React 18 | UI 框架 | 生态成熟、组件化 |
| TypeScript | 类型安全 | 减少运行时错误 |
| Vite | 构建工具 | 快速 HMR、开箱即用 |
| Tailwind CSS | 样式 | 原子化、高效开发 |
| Shadcn/UI | 组件库 | 可定制、无依赖锁定 |
| Radix UI | 无头组件 | 可访问性、灵活 |
| Recharts | 图表 | React 友好、简洁 API |
| ReactFlow | 流程图 | 组织架构可视化 |
| Dagre | 布局算法 | 自动布局组织树 |
| html2canvas | 截图导出 | 页面内容导出为图片 |
| React Hook Form | 表单 | 高性能、少渲染 |
| Zod | 校验 | TypeScript 优先 |

### 后端

| 技术 | 用途 | 选型理由 |
|------|------|---------|
| Node.js | 运行时 | JavaScript 全栈统一 |
| Express | Web 框架 | 简洁、灵活 |
| TypeScript | 类型安全 | 与前端统一 |
| PostgreSQL | 主数据库 | 功能强大、可靠 |
| JWT | 认证 | 无状态、可扩展 |
| bcryptjs | 密码加密 | 安全哈希 |
| ExcelJS | Excel 处理 | 导入导出 |
| Multer | 文件上传 | Express 标准方案 |
| dayjs | 日期处理 | 轻量替代 moment |
| Axios | HTTP 客户端 | AI API 调用 |

---

## 开发规范

### 代码风格

- 使用 ESLint + Prettier
- 组件使用函数式 + Hooks
- TypeScript strict 模式
- 文件命名：`camelCase.ts`（工具），`PascalCase.tsx`（组件），`kebab-case.routes.ts`（路由）

### Git 规范

```bash
# Commit 格式
<type>(<scope>): <description>

# 类型
feat:     新功能
fix:      修复
docs:     文档
style:    格式调整
refactor: 重构
test:     测试
chore:    构建/工具

# 示例
feat(monthly-report): 添加 AI 评价生成功能
fix(auth): 修复 Token 过期后未正确重定向
docs(api): 更新导入导出接口文档
```

### 分支管理

```
main        → 生产环境
develop     → 开发环境
feature/*   → 功能分支
hotfix/*    → 紧急修复
```

### API 设计规范

- RESTful 风格
- 统一响应格式：`{ data, error, message }`
- 分页参数：`page` + `limit`
- 日期格式：ISO 8601
- 错误返回 HTTP 标准状态码

### 新增路由步骤

1. 在 `backend/src/routes/` 创建路由文件：

```typescript
// example.routes.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  try {
    // 业务逻辑
    res.json({ data: result });
  } catch (error) {
    res.status(500).json({ error: '服务器错误' });
  }
});

export default router;
```

2. 在 `index.ts` 中注册路由：

```typescript
import exampleRoutes from './routes/example.routes';
app.use('/api/example', exampleRoutes);
```

### 新增前端页面步骤

1. 在 `app/src/pages/` 创建页面组件
2. 在 `app/src/services/` 添加 API 调用
3. 在 `App.tsx` 添加路由

---

## 测试

### 后端测试

```bash
cd backend
npm test              # 运行测试
npm run test:watch    # 监听模式
npm run test:coverage # 覆盖率报告
```

### 前端测试

```bash
cd app
npm test
npm run test:coverage
```

### 手动 API 测试

项目包含多个测试脚本（`test-*.sh`），例如：

```bash
./test-login.sh        # 测试登录
./test-full-flow.sh    # 完整流程测试
./test-ai.sh           # AI 功能测试
```

---

## 贡献指南

1. Fork 项目
2. 创建功能分支：`git checkout -b feature/your-feature`
3. 编写代码和测试
4. 提交：`git commit -m "feat: your feature description"`
5. Push：`git push origin feature/your-feature`
6. 创建 Pull Request

### PR 要求

- [ ] 代码通过 ESLint 检查
- [ ] TypeScript 无编译错误
- [ ] 新 API 有对应文档
- [ ] 关键功能有测试覆盖
- [ ] PR 描述说明变更内容

### 本地开发环境

```bash
# 推荐 VS Code 插件
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (Volar)
- REST Client（API 测试）
```
