# 部署指南

## 环境要求

| 组件 | 最低版本 | 推荐版本 |
|------|---------|---------|
| Node.js | 18.x | 20.x LTS |
| PostgreSQL | 14.x | 16.x |
| MySQL（可选） | 8.0 | 8.0+ |
| Docker | 20.x | 24.x |
| Docker Compose | 2.x | 2.20+ |
| 内存 | 2GB | 4GB+ |
| 磁盘 | 10GB | 20GB+ |

---

## 方式一：Docker 部署（推荐）

### 1. 准备配置文件

```bash
cd performance-management
cp backend/.env.example backend/.env
```

编辑 `backend/.env`：

```env
# 数据库
DB_TYPE=postgres
DB_HOST=db
DB_PORT=5432
DB_NAME=performance
DB_USER=postgres
DB_PASSWORD=your_secure_password

# JWT
JWT_SECRET=your_jwt_secret_key_change_this
JWT_EXPIRES_IN=7d

# AI（可选）
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxx
# 或使用 Moonshot
# AI_PROVIDER=moonshot
# MOONSHOT_API_KEY=sk-xxx

# 服务
PORT=3000
NODE_ENV=production
```

### 2. 启动服务

```bash
docker-compose up -d
```

### 3. docker-compose.yml 参考

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: performance
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_secure_password
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./postgres-init:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    env_file: ./backend/.env
    ports:
      - "3000:3000"
    depends_on:
      - db
    restart: unless-stopped

  frontend:
    build: ./app
    ports:
      - "5173:80"
    depends_on:
      - backend
    restart: unless-stopped

volumes:
  pgdata:
```

### 4. 验证部署

```bash
# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f backend

# 测试 API
curl http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

---

## 方式二：手动部署

### 1. 安装依赖

```bash
# 后端
cd backend
npm install
npm run build

# 前端
cd ../app
npm install
npm run build
```

### 2. 初始化数据库

**PostgreSQL：**

```bash
psql -U postgres -c "CREATE DATABASE performance;"
psql -U postgres -d performance -f postgres-init/init.sql
```

**MySQL：**

```bash
mysql -u root -p -e "CREATE DATABASE performance;"
mysql -u root -p performance < mysql-init/init.sql
```

### 3. 启动后端

```bash
cd backend
NODE_ENV=production npm start
```

### 4. 部署前端

将 `app/dist/` 目录部署到 Nginx / Apache：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    root /path/to/app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## 方式三：Vercel 部署

### 前端

```bash
cd app
npx vercel --prod
```

### 后端

```bash
cd backend
npx vercel --prod
```

详细步骤参见项目根目录 `VERCEL_SETUP.md`。

---

## 环境变量完整列表

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| DB_TYPE | ✅ | postgres | 数据库类型（postgres/mysql） |
| DB_HOST | ✅ | localhost | 数据库地址 |
| DB_PORT | ✅ | 5432 | 数据库端口 |
| DB_NAME | ✅ | performance | 数据库名 |
| DB_USER | ✅ | postgres | 数据库用户 |
| DB_PASSWORD | ✅ | - | 数据库密码 |
| JWT_SECRET | ✅ | - | JWT 签名密钥 |
| JWT_EXPIRES_IN | ❌ | 7d | Token 有效期 |
| PORT | ❌ | 3000 | 服务端口 |
| NODE_ENV | ❌ | development | 运行环境 |
| AI_PROVIDER | ❌ | openai | AI 服务商 |
| OPENAI_API_KEY | ❌ | - | OpenAI Key |
| MOONSHOT_API_KEY | ❌ | - | Moonshot Key |
| CORS_ORIGIN | ❌ | * | 跨域白名单 |
| LOG_LEVEL | ❌ | info | 日志级别 |

---

## 数据库初始化

初始化脚本位于 `postgres-init/` 和 `mysql-init/` 目录，包含：

- 表结构创建
- 默认角色和用户
- 初始部门数据
- 评价关键词库（144 条）
- 指标库模板

Docker 启动时自动执行。手动部署需运行对应的 init.sql。

---

## 常见问题排查

### 数据库连接失败

```bash
# 检查数据库是否运行
docker-compose ps db

# 检查连接
psql -h localhost -U postgres -d performance -c "SELECT 1;"

# 查看后端日志
docker-compose logs backend | grep -i error
```

### 前端无法访问 API

1. 检查后端是否启动：`curl http://localhost:3000/api/auth/me`
2. 检查 CORS 配置
3. 检查 Nginx 反向代理配置

### Docker 构建失败

```bash
# 清理重建
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

### 端口被占用

```bash
# 查找占用端口的进程
lsof -i :3000
lsof -i :5432

# 修改 docker-compose.yml 中的端口映射
```

### AI 功能不可用

1. 检查 `AI_PROVIDER` 和对应 API Key 是否配置
2. 检查网络是否能访问 AI 服务
3. 查看后端日志中的 AI 相关错误

### 内存不足

```bash
# 查看容器资源占用
docker stats

# 限制容器内存
# 在 docker-compose.yml 中添加：
# deploy:
#   resources:
#     limits:
#       memory: 512M
```
