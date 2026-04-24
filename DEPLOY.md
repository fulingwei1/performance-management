# ATE绩效管理系统 - Docker部署指南

## 📋 前置要求

- Docker 20.10+ 
- Docker Compose 2.0+
- 8GB+ 内存
- 10GB+ 磁盘空间

## 🚀 快速部署

### 1. 克隆代码（如果还没有）

```bash
git clone https://github.com/fulingwei1/performance-management.git
cd performance-management
```

### 2. 配置环境变量（可选）

如果需要配置Kimi API Key:

```bash
# 创建.env文件
echo "KIMI_API_KEY=your_kimi_api_key_here" > .env
```

### 3. 启动服务

```bash
# 一键启动所有服务（MySQL + Backend + Frontend）
docker-compose up -d

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 4. 等待服务就绪

首次启动需要：
- MySQL初始化：~30秒
- Backend构建：~2分钟
- Frontend构建：~3分钟

**查看启动状态**:
```bash
docker-compose ps
```

所有服务应显示为`Up (healthy)`或`Up`

### 5. 访问系统

- **前端**: http://localhost:5173
- **后端API**: http://localhost:3001/api
- **MySQL**: localhost:3306

### 6. 登录测试

默认管理员账号:
- 用户名: `admin`
- 密码: `123456`
- 角色: `admin`

测试账号:
- **员工**: 姚洪 / 123456 / employee
- **经理**: 宋魁 / 123456 / manager  
- **总经理**: 郑汝才 / 123456 / gm

## 📊 数据库初始化

### 自动初始化

首次启动时，MySQL会自动执行`mysql-init/01-init.sql`创建表结构。

### 手动导入数据（可选）

如果需要导入员工数据:

```bash
# 方式1: 通过API导入（推荐）
# 访问后端会自动从backend/src/config/employees.csv读取并初始化

# 方式2: 手动SQL导入
docker cp ./employees.sql ate_mysql:/tmp/
docker exec -it ate_mysql mysql -uroot -pperformance123 performance_db < /tmp/employees.sql
```

## 🔧 常用命令

### 服务管理

```bash
# 启动所有服务
docker-compose up -d

# 停止所有服务
docker-compose down

# 重启所有服务
docker-compose restart

# 重启单个服务
docker-compose restart backend

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f [service_name]
```

### 数据库管理

```bash
# 进入MySQL容器
docker exec -it ate_mysql bash

# 连接MySQL
docker exec -it ate_mysql mysql -uroot -pperformance123 performance_db

# 备份数据库
docker exec ate_mysql mysqldump -uroot -pperformance123 performance_db > backup.sql

# 恢复数据库
docker exec -i ate_mysql mysql -uroot -pperformance123 performance_db < backup.sql
```

### 清理数据

```bash
# 停止并删除所有容器
docker-compose down

# 删除数据卷（会清空数据库）
docker-compose down -v

# 重新构建镜像
docker-compose build --no-cache

# 完全重置
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## 📁 目录结构

```
performance-management/
├── docker-compose.yml          # Docker编排配置
├── .env                         # 环境变量（可选）
├── mysql-init/                  # MySQL初始化脚本
│   └── 01-init.sql             # 表结构
├── backend/
│   ├── Dockerfile              # 后端镜像
│   ├── src/                    # 源代码
│   └── logs/                   # 日志（挂载）
└── app/
    ├── Dockerfile              # 前端镜像
    └── nginx.conf              # Nginx配置
```

## 🐛 故障排查

### 问题1: 端口被占用

```bash
# 修改docker-compose.yml中的端口映射
# 例如: "8080:80" 而不是 "5173:80"
```

### 问题2: Backend连接MySQL失败

```bash
# 查看MySQL是否就绪
docker-compose logs mysql

# 检查backend环境变量
docker-compose config | grep DB_

# 手动测试连接
docker exec -it ate_backend ping mysql
```

### 问题3: Frontend无法访问Backend

```bash
# 检查VITE_API_URL配置
# 确保前端能访问后端API地址

# 如果使用localhost，确保从浏览器可访问
curl http://localhost:3001/api/health
```

### 问题4: 数据库初始化失败

```bash
# 删除数据卷重新初始化
docker-compose down -v
docker-compose up -d

# 查看初始化日志
docker-compose logs mysql | grep init
```

## 🔐 安全建议（生产环境）

1. **修改默认密码**:
   ```bash
   # 修改docker-compose.yml中的:
   - MYSQL_ROOT_PASSWORD
   - MYSQL_PASSWORD
   - JWT_SECRET
   - ADMIN_DEFAULT_PASSWORD
   ```

2. **使用独立网络**:
   ```yaml
   # docker-compose.yml
   networks:
     ate_network:
       driver: bridge
       ipam:
         config:
           - subnet: 172.28.0.0/16
   ```

3. **限制MySQL暴露**:
   ```yaml
   # 注释掉MySQL的ports配置（仅容器内访问）
   # ports:
   #   - "3306:3306"
   ```

4. **启用SSL**:
   - 配置Nginx HTTPS
   - 使用Let's Encrypt证书

## 📈 性能优化

### MySQL调优

编辑`docker-compose.yml`，添加:

```yaml
mysql:
  command:
    - --max_connections=200
    - --innodb_buffer_pool_size=1G
    - --query_cache_size=64M
```

### Backend调优

```yaml
backend:
  environment:
    - NODE_OPTIONS=--max-old-space-size=2048
```

## 🔄 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose down
docker-compose build
docker-compose up -d

# 查看更新日志
docker-compose logs -f
```

## 📦 数据持久化

数据卷`mysql_data`会持久化数据库内容，即使容器删除数据也不会丢失。

**备份数据卷**:
```bash
docker run --rm -v performance-management_mysql_data:/data -v $(pwd):/backup alpine tar czf /backup/mysql_data_backup.tar.gz /data
```

**恢复数据卷**:
```bash
docker run --rm -v performance-management_mysql_data:/data -v $(pwd):/backup alpine tar xzf /backup/mysql_data_backup.tar.gz -C /
```

## 💡 开发模式

如果需要开发时热更新:

```bash
# 停止Docker服务
docker-compose down

# 本地运行（开发模式）
cd backend && npm run dev
cd app && npm run dev

# 连接Docker中的MySQL
# backend/.env设置:
DB_HOST=localhost
DB_PORT=3306
```

## 📞 联系支持

- 项目地址: https://github.com/fulingwei1/performance-management
- 开发者: 乖乖 AI助手 🐾
- 文档更新: 2026-02-12

---

**祝您部署顺利！🚀**
