# ATE 绩效管理系统

> 基于战略目标分解的全流程绩效管理平台，支持目标设定、月度考核、同事互评、晋升管理、绩效分析等完整业务闭环。

## 📋 项目简介

ATE 绩效管理系统是为非标自动化测试企业量身打造的绩效管理平台。系统实现从公司战略目标到部门目标、再到个人 KPI 的逐级分解，支持月度绩效打分、季度总结、年度互评、晋升申请等全流程管理，并集成 AI 辅助评价功能。

### 核心价值

- **战略对齐**：GM 设定战略目标 → 部门分解 → 个人 KPI，确保上下一致
- **过程管理**：月度打分 + 季度总结 + 年度评估，持续跟踪绩效
- **AI 赋能**：AI 生成评价意见、目标建议、晋升总结，提升效率
- **数据驱动**：绩效分析仪表板、趋势图表、数据导入导出

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 18 + TypeScript + Vite |
| UI 组件 | Radix UI + Tailwind CSS + Shadcn/UI |
| 图表 | Recharts + Victory |
| 组织架构 | ReactFlow + Dagre |
| 后端 | Node.js + Express + TypeScript |
| 数据库 | PostgreSQL / MySQL |
| 认证 | JWT (bcryptjs) |
| AI | OpenAI / Moonshot API |
| 文件处理 | ExcelJS + Multer |
| 导出 | html2canvas |
| 部署 | Docker / Vercel |

## ✨ 功能清单

### 核心模块

1. **用户认证** — 登录、角色权限（员工/经理/HR/GM/Admin）
2. **战略目标** — GM 设定公司级战略目标
3. **目标管理** — 个人目标设定、AI 生成、审批确认
4. **KPI 分配** — 经理分配 KPI 指标
5. **月度绩效** — 月度打分 + AI/关键词辅助评价
6. **季度总结** — 经理季度工作总结
7. **同事互评** — 匿名/实名互评
8. **晋升管理** — 申请 → 审批流程
9. **绩效合约** — 年度绩效合约签订
10. **绩效面谈** — 面谈记录管理
11. **绩效申诉** — 员工申诉流程
12. **考核发布** — 考核结果发布与通知

### 增强模块 (Phase 2-3)

13. **审计日志** — 全操作审计追踪
14. **通知系统** — 站内通知
15. **数据导入** — Excel 批量导入员工/绩效数据
16. **数据导出** — Excel/PDF 导出
17. **绩效分析** — 多维度分析仪表板
18. **组织架构** — 可视化组织树
19. **AI 统计** — AI 使用量统计
20. **自动化任务** — 定时任务管理

## 🚀 快速开始

### 前置条件

- Node.js >= 18
- PostgreSQL >= 14 或 MySQL >= 8
- npm 或 yarn

### 启动步骤

```bash
# 1. 克隆项目
git clone <repo-url>
cd performance-management

# 2. 后端
cd backend
cp .env.example .env  # 配置数据库连接
npm install
npm run dev

# 3. 前端
cd ../app
npm install
npm run dev
```

### Docker 一键启动

```bash
docker-compose up -d
```

访问 http://localhost:5173（前端）和 http://localhost:3000（API）

### 默认账号

| 角色 | 用户名 | 密码 |
|------|--------|------|
| Admin/GM | admin | 123456 |
| 经理 | manager1 | 123456 |
| 员工 | employee1 | 123456 |
| HR | hr1 | 123456 |

## 📚 文档导航

| 文档 | 说明 |
|------|------|
| [API.md](./API.md) | 完整 API 接口文档（42 个端点） |
| [USER_GUIDE.md](./USER_GUIDE.md) | 用户操作手册（分角色） |
| [DEPLOY.md](./DEPLOY.md) | 部署指南（Docker / Vercel） |
| [DEVELOPER.md](./DEVELOPER.md) | 开发者文档（架构 / 规范） |
| [FEATURES.md](./FEATURES.md) | 功能清单（Phase 1/2/3） |
| [CHANGELOG.md](./CHANGELOG.md) | 版本更新日志 |

## 📄 License

MIT
