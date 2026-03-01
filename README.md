# 差异化考核系统 (Differentiated Assessment System)

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-5.0.0-blue.svg)](https://www.typescriptlang.org/)

> 🎯 基于部门类型的智能化绩效考核系统 - 让评价更科学、更公平、更高效

---

## 📖 目录

- [简介](#简介)
- [核心特性](#核心特性)
- [技术栈](#技术栈)
- [快速开始](#快速开始)
- [项目结构](#项目结构)
- [文档](#文档)
- [开发指南](#开发指南)
- [部署](#部署)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 简介

**差异化考核系统**是一套现代化的绩效管理解决方案，通过**智能识别员工部门类型**，自动匹配相应的考核模板和指标，实现真正的**因岗制宜**、**公平公正**的绩效评估。

### 为什么需要差异化考核？

传统绩效考核的痛点：
- ❌ **一刀切**：所有岗位用同一套指标，不合理
- ❌ **不公平**：销售和工程师用相同标准评价，怎么比？
- ❌ **低效率**：手工评分、Excel统计，费时费力
- ❌ **数据孤岛**：历史数据难查询，趋势分析困难

我们的解决方案：
- ✅ **智能匹配**：根据部门类型自动加载对应模板
- ✅ **科学评分**：五级评分体系（L1-L5），量化绩效
- ✅ **操作简便**：3分钟完成一次评分，实时计算总分
- ✅ **数据可视**：历史趋势、统计分析一目了然

---

## 核心特性

### 🎯 差异化设计

**5种部门类型，各有专属考核指标**：

| 部门类型 | 图标 | 考核重点 | 典型指标 |
|----------|------|----------|----------|
| **销售类** | 💰 | 业绩导向 | 销售额完成率、回款率、新客户开发 |
| **工程类** | 🔧 | 项目交付 | 按时交付率、代码质量、技术创新 |
| **生产类** | 🏭 | 质量安全 | 产量完成率、合格率、安全事故 |
| **支持类** | 📋 | 服务满意 | 工作准确率、及时响应率、满意度 |
| **管理类** | 👔 | 综合能力 | 战略执行、团队管理、跨部门协作 |

### ✨ 智能评分系统

**五级评分标准（L1-L5）**：
- **L5 (1.5)** - 卓越：远超预期，成为标杆
- **L4 (1.2)** - 优秀：超出预期，表现出色
- **L3 (1.0)** - 良好：达到预期，符合标准
- **L2 (0.8)** - 待改进：低于预期，需要提升
- **L1 (0.5)** - 不合格：严重不足，需要改进计划

**自动计算加权总分**：
```
总分 = Σ (指标得分 × 权重%)

示例：
销售额完成率 (30%) × L5 (1.5) = 0.45
回款率 (20%) × L4 (1.2) = 0.24
...
总分 = 1.23
```

### 📊 数据导出与分析

- **月度评分记录**：Excel导出（3个Sheet：明细+指标+汇总）
- **部门类型统计**：模板配置情况一览
- **员工绩效趋势**：历史评分、趋势分析、统计指标

### 🎨 优秀的用户体验

- ⚡ **快速操作**：3分钟完成一次评分
- 🎯 **实时反馈**：即时计算总分，显示完成度
- 📱 **响应式设计**：支持移动端和桌面端
- 🆘 **内置帮助**：详细的使用说明和最佳实践

---

## 技术栈

### 后端

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | v18+ | 运行时 |
| Express | ^4.18 | Web框架 |
| TypeScript | ^5.0 | 类型安全 |
| PostgreSQL | 13+ | 主数据库 |
| MySQL | 8.0+ | 备选数据库 |
| ExcelJS | ^4.4 | Excel导出 |
| Winston | ^3.11 | 日志系统 |
| JWT | ^9.0 | 身份认证 |

### 前端

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^19.0 | UI框架 |
| TypeScript | ^5.0 | 类型安全 |
| Vite | ^7.3 | 构建工具 |
| Zustand | ^4.5 | 状态管理 |
| TailwindCSS | ^4.0 | 样式框架 |
| Shadcn/ui | Latest | UI组件库 |
| Framer Motion | ^11.0 | 动画库 |
| Recharts | ^2.10 | 图表库 |

---

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- PostgreSQL >= 13 或 MySQL >= 8.0（可选，开发环境可用Memory DB）
- npm >= 8.0.0

### 安装

#### 1. 克隆仓库

```bash
git clone https://github.com/your-org/performance-management.git
cd performance-management
```

#### 2. 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd ../app
npm install
```

#### 3. 配置环境变量

```bash
# backend/.env
PORT=3001
USE_MEMORY_DB=true  # 开发环境使用Memory DB
NODE_ENV=development
LOG_LEVEL=debug
```

```bash
# app/.env
VITE_API_URL=http://localhost:3001
```

#### 4. 初始化数据

```bash
# 启动后端（会自动初始化Memory DB和默认模板）
cd backend
npm run dev
```

#### 5. 启动服务

```bash
# 终端1 - 后端
cd backend
npm run dev

# 终端2 - 前端
cd app
npm run dev
```

#### 6. 访问应用

- **前端**: http://localhost:5173
- **后端API**: http://localhost:3001
- **健康检查**: http://localhost:3001/health

### 快速测试

运行自动化测试脚本：

```bash
./test-assessment-system.sh
```

输出示例：
```
🧪 差异化考核系统 - 快速测试
================================

[1/7] 检查后端服务...
✓ 后端服务运行正常

[2/7] 登录测试账号...
✓ 登录成功

...

✅ 测试完成！
```

---

## 项目结构

```
performance-management/
├── backend/                    # 后端代码
│   ├── src/
│   │   ├── config/            # 配置（数据库、日志、初始化）
│   │   ├── models/            # 数据模型
│   │   ├── controllers/       # 控制器
│   │   ├── routes/            # 路由
│   │   ├── services/          # 业务逻辑
│   │   ├── middleware/        # 中间件
│   │   └── index.ts           # 入口文件
│   ├── migrations/            # 数据库迁移
│   ├── package.json
│   └── tsconfig.json
│
├── app/                       # 前端代码
│   ├── src/
│   │   ├── pages/            # 页面组件
│   │   ├── components/       # 通用组件
│   │   ├── stores/           # 状态管理
│   │   ├── lib/              # 工具函数
│   │   └── App.tsx           # 主应用
│   ├── package.json
│   └── vite.config.ts
│
├── docs/                      # 文档
│   ├── USER_MANUAL.md         # 用户手册
│   ├── DEVELOPER_GUIDE.md     # 开发者文档
│   ├── API_REFERENCE.md       # API文档
│   ├── ASSESSMENT_TESTING_GUIDE.md   # 测试指南
│   ├── ASSESSMENT_DEPLOYMENT.md      # 部署指南
│   └── PHASE1_SUMMARY.md      # Phase 1总结
│
├── test-assessment-system.sh  # 快速测试脚本
├── CHANGELOG.md               # 变更日志
└── README.md                  # 本文件
```

---

## 文档

### 完整文档体系（67页，~40,000字）

| 文档 | 描述 | 链接 |
|------|------|------|
| **用户手册** | HR/经理/员工操作指南 | [USER_MANUAL.md](docs/USER_MANUAL.md) |
| **开发者文档** | 技术架构、API设计、扩展开发 | [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) |
| **API参考** | 完整API文档（20+端点） | [API_REFERENCE.md](docs/API_REFERENCE.md) |
| **测试指南** | 测试流程、检查清单 | [ASSESSMENT_TESTING_GUIDE.md](docs/ASSESSMENT_TESTING_GUIDE.md) |
| **部署指南** | 生产环境部署、监控、备份 | [ASSESSMENT_DEPLOYMENT.md](docs/ASSESSMENT_DEPLOYMENT.md) |
| **Phase 1总结** | 项目总结报告 | [PHASE1_SUMMARY.md](docs/PHASE1_SUMMARY.md) |

### 快速链接

- 📘 [用户操作指南](docs/USER_MANUAL.md#hr-操作指南)
- 🔧 [开发环境搭建](docs/DEVELOPER_GUIDE.md#本地开发环境搭建)
- 📡 [API端点列表](docs/API_REFERENCE.md#api-设计)
- 🧪 [测试步骤](docs/ASSESSMENT_TESTING_GUIDE.md#功能测试流程)
- 🚀 [生产部署](docs/ASSESSMENT_DEPLOYMENT.md#后端部署)

---

## 开发指南

### 开发环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0
- PostgreSQL >= 13（可选）
- VS Code（推荐）

### 推荐的 VS Code 插件

- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense
- PostgreSQL

### 代码规范

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

### 运行测试

```bash
# 快速测试脚本
./test-assessment-system.sh

# 手动测试API
curl http://localhost:3001/health
```

### 构建生产版本

```bash
# 后端
cd backend
npm run build

# 前端
cd app
npm run build
```

---

## 部署

### 开发环境

```bash
# 使用 Memory DB（无需数据库）
cd backend
USE_MEMORY_DB=true npm run dev
```

### 生产环境

详细部署指南请参考：[ASSESSMENT_DEPLOYMENT.md](docs/ASSESSMENT_DEPLOYMENT.md)

#### 快速部署（Docker）

```bash
# 1. 构建镜像
docker build -t performance-backend:latest ./backend
docker build -t performance-frontend:latest ./app

# 2. 运行容器
docker-compose up -d
```

#### 传统部署

1. **数据库初始化**
   ```bash
   psql -U postgres -d performance_db -f backend/migrations/010_department_classification.sql
   psql -U postgres -d performance_db -f backend/migrations/011_monthly_assessments.sql
   ```

2. **后端部署**
   ```bash
   cd backend
   npm install --production
   npm run build
   pm2 start ecosystem.config.js
   ```

3. **前端部署**
   ```bash
   cd app
   npm run build
   # 将 dist/ 部署到 Nginx/Vercel
   ```

---

## 贡献指南

我们欢迎所有形式的贡献！无论是报告Bug、提出功能建议，还是提交代码。

### 提交Issue

在提交Issue前，请先搜索是否已存在相关Issue。

**Bug报告应包含**：
- 问题描述
- 复现步骤
- 预期行为 vs 实际行为
- 环境信息（OS、浏览器、Node版本等）
- 截图（如适用）

### 提交Pull Request

1. Fork本仓库
2. 创建feature分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'Add amazing feature'`
4. 推送到分支：`git push origin feature/amazing-feature`
5. 提交Pull Request

**PR应包含**：
- 清晰的描述（做了什么、为什么）
- 相关Issue编号（如有）
- 测试结果
- 文档更新（如需要）

---

## 路线图

### ✅ Phase 1 - 核心基础（已完成）
- 差异化考核系统
- 模板管理
- 数据导出
- 统计分析

### 🚧 Phase 2 - 高级功能（开发中）
- 360度互评
- 绩效面谈记录
- 个人发展计划（IDP）
- 晋升申请流程
- 单元测试（80%+覆盖率）
- CI/CD流程

### 🔜 Phase 3 - 智能化（计划中）
- AI评分建议
- 异常检测
- 绩效预测
- 自然语言评价生成
- 高级数据分析

详细规划请参考：[PHASE1_SUMMARY.md](docs/PHASE1_SUMMARY.md#下一步计划)

---

## 许可证

Copyright © 2026 Your Company. All rights reserved.

本项目采用 [MIT License](LICENSE) 开源协议。

---

## 致谢

- [OpenClaw](https://github.com/openclaw/openclaw) - 开发框架和工具
- [Anthropic](https://www.anthropic.com) - Claude AI 辅助开发
- [React](https://react.dev) - UI框架
- [TailwindCSS](https://tailwindcss.com) - 样式框架
- [ExcelJS](https://github.com/exceljs/exceljs) - Excel导出库

---

## 联系方式

- **技术支持**: support@company.com
- **文档**: https://docs.company.com/performance
- **GitHub**: https://github.com/company/performance-management
- **Issues**: https://github.com/company/performance-management/issues

---

## ⭐ Star History

如果这个项目对你有帮助，请给我们一个Star！⭐

[![Star History Chart](https://api.star-history.com/svg?repos=company/performance-management&type=Date)](https://star-history.com/#company/performance-management&Date)

---

*Made with ❤️ by OpenClaw Performance Team*
