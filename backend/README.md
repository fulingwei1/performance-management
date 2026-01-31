# ATE绩效管理系统后端 API

基于 Node.js + Express + TypeScript + MySQL 开发的 RESTful API 服务。

## 技术栈

- **框架**: Express.js
- **语言**: TypeScript
- **数据库**: MySQL
- **ORM**: 原生 SQL (mysql2)
- **认证**: JWT
- **密码加密**: bcryptjs

## 项目结构

```
src/
├── config/          # 配置文件
│   ├── database.ts  # 数据库连接
│   └── init-db.sql  # 数据库初始化脚本
├── controllers/     # 控制器
│   ├── auth.controller.ts
│   ├── employee.controller.ts
│   └── performance.controller.ts
├── middleware/      # 中间件
│   ├── auth.ts      # JWT认证
│   └── errorHandler.ts
├── models/          # 数据模型
│   ├── employee.model.ts
│   └── performance.model.ts
├── routes/          # 路由
│   ├── auth.routes.ts
│   ├── employee.routes.ts
│   └── performance.routes.ts
├── types/           # TypeScript类型
│   └── index.ts
├── utils/           # 工具函数
│   └── helpers.ts
└── index.ts         # 入口文件
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`，并修改配置：

```bash
cp .env.example .env
```

```env
# 服务器配置
PORT=3001
NODE_ENV=development

# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=performance_db
DB_USER=root
DB_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=7d
```

### 3. 初始化数据库

```bash
# 登录MySQL
mysql -u root -p

# 执行初始化脚本
source src/config/init-db.sql
```

### 4. 启动服务器

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## API 接口文档

### 认证接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| POST | /api/auth/login | 用户登录 | 公开 |
| GET | /api/auth/me | 获取当前用户 | 需登录 |
| POST | /api/auth/change-password | 修改密码 | 需登录 |

### 员工接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /api/employees | 获取所有员工 | 需登录 |
| GET | /api/employees/managers | 获取所有经理 | 需登录 |
| GET | /api/employees/subordinates | 获取下属 | 经理 |
| GET | /api/employees/role/:role | 按角色获取 | 需登录 |
| GET | /api/employees/:id | 获取员工详情 | 需登录 |
| POST | /api/employees | 创建员工 | HR |
| PUT | /api/employees/:id | 更新员工 | HR |
| DELETE | /api/employees/:id | 删除员工 | HR |

### 绩效接口

| 方法 | 路径 | 描述 | 权限 |
|------|------|------|------|
| GET | /api/performance/my-records | 我的绩效记录 | 员工 |
| GET | /api/performance/team-records | 团队绩效记录 | 经理 |
| GET | /api/performance/month/:month | 按月查询 | 需登录 |
| GET | /api/performance/:id | 记录详情 | 需登录 |
| POST | /api/performance/summary | 提交工作总结 | 员工 |
| POST | /api/performance/score | 经理评分 | 经理 |
| DELETE | /api/performance/:id | 删除记录 | HR |

## 登录方式

使用**员工姓名**作为用户名，密码默认为 `123456`。

示例登录请求：

```bash
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "于振华",
    "password": "123456",
    "role": "manager"
  }'
```

## 默认账号

| 角色 | 姓名 | 账号类型 |
|------|------|----------|
| 经理 | 于振华 | 测试部经理 |
| 经理 | 张丙波 | 机械部经理 |
| 经理 | 王俊 | PLC经理 |
| 总经理 | 李总 | 总经理 |
| HR | 王HR | 人力资源 |

## 开发计划

- [x] 基础架构搭建
- [x] 数据库设计
- [x] 用户认证系统
- [x] 员工管理API
- [x] 绩效记录API
- [ ] 360度评分API
- [ ] 任务管理API
- [ ] 数据导出API
- [ ] 分数标准化算法
- [ ] 前端对接
