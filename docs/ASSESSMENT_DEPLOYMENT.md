# 差异化考核系统 - 部署指南

## 📋 目录
1. [系统要求](#系统要求)
2. [数据库部署](#数据库部署)
3. [后端部署](#后端部署)
4. [前端部署](#前端部署)
5. [生产环境配置](#生产环境配置)
6. [健康检查](#健康检查)

---

## 系统要求

### 最低配置
- **CPU**: 2 核
- **内存**: 4 GB
- **磁盘**: 20 GB
- **Node.js**: v18.0.0+
- **数据库**: PostgreSQL 13+ 或 MySQL 8.0+

### 推荐配置
- **CPU**: 4 核
- **内存**: 8 GB
- **磁盘**: 50 GB SSD
- **Node.js**: v20.0.0+
- **数据库**: PostgreSQL 15+

---

## 数据库部署

### PostgreSQL 部署

#### 1. 创建数据库

```sql
CREATE DATABASE performance_db
  WITH ENCODING 'UTF8'
  LC_COLLATE='zh_CN.UTF-8'
  LC_CTYPE='zh_CN.UTF-8'
  TEMPLATE=template0;
```

#### 2. 创建用户

```sql
CREATE USER performance_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE performance_db TO performance_user;
```

#### 3. 运行迁移

```bash
# 进入 migrations 目录
cd backend/migrations

# 按顺序运行迁移脚本
psql -U performance_user -d performance_db -f 010_department_classification.sql
psql -U performance_user -d performance_db -f 011_monthly_assessments.sql
```

#### 4. 验证

```sql
\c performance_db
\dt

-- 应显示以下表
-- assessment_templates
-- template_metrics
-- metric_scoring_criteria
-- department_templates
-- monthly_assessments
```

### MySQL 部署

#### 1. 创建数据库

```sql
CREATE DATABASE performance_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

#### 2. 创建用户

```sql
CREATE USER 'performance_user'@'%' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON performance_db.* TO 'performance_user'@'%';
FLUSH PRIVILEGES;
```

#### 3. 运行迁移

```bash
# 使用迁移文件中的 MySQL 版本（注释部分）
mysql -u performance_user -p performance_db < 010_department_classification_mysql.sql
mysql -u performance_user -p performance_db < 011_monthly_assessments_mysql.sql
```

---

## 后端部署

### 开发环境

```bash
cd backend

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
vim .env

# 启动开发服务器
npm run dev
```

### 生产环境

```bash
# 1. 构建
npm run build

# 2. 配置生产环境变量
cat > .env.production << EOF
NODE_ENV=production
PORT=3001
USE_MEMORY_DB=false

# 数据库配置
DB_HOST=your_db_host
DB_PORT=5432
DB_NAME=performance_db
DB_USER=performance_user
DB_PASSWORD=your_secure_password

# JWT 配置
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d

# 其他配置
LOG_LEVEL=info
CORS_ORIGIN=https://your-frontend-domain.com
EOF

# 3. 启动生产服务
npm run start

# 或使用 PM2 管理
npm install -g pm2
pm2 start dist/index.js --name performance-backend
pm2 save
pm2 startup
```

### Docker 部署

```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY migrations ./migrations

EXPOSE 3001

CMD ["node", "dist/index.js"]
```

```bash
# 构建镜像
docker build -t performance-backend:latest .

# 运行容器
docker run -d \
  --name performance-backend \
  -p 3001:3001 \
  --env-file .env.production \
  performance-backend:latest
```

---

## 前端部署

### 构建生产版本

```bash
cd app

# 安装依赖
npm install

# 配置环境变量
cat > .env.production << EOF
VITE_API_URL=https://api.your-domain.com
EOF

# 构建
npm run build

# dist 目录包含生产文件
ls -lh dist/
```

### Nginx 部署

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    # SSL 证书配置
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # 前端静态文件
    root /var/www/performance-management/dist;
    index index.html;
    
    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API 代理
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml text/javascript;
}
```

### Vercel/Netlify 部署

```json
// vercel.json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "dist"
      }
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "https://your-backend-api.com/api/$1"
    },
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ]
}
```

---

## 生产环境配置

### 性能优化

#### 1. 数据库连接池

```typescript
// backend/src/config/database.ts
const pool = new Pool({
  max: 20,              // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### 2. Redis 缓存（可选）

```typescript
// backend/src/config/redis.ts
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: 0,
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// 缓存模板数据
export async function cacheTemplate(id: string, data: any) {
  await redis.setex(`template:${id}`, 3600, JSON.stringify(data));
}
```

#### 3. 日志配置

```typescript
// backend/src/config/logger.ts
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

### 安全配置

#### 1. CORS 配置

```typescript
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

#### 2. Rate Limiting

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 最多 100 次请求
  message: '请求过于频繁，请稍后再试',
});

app.use('/api', limiter);
```

#### 3. Helmet 安全头

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));
```

---

## 健康检查

### 监控端点

```typescript
// backend/src/routes/health.routes.ts
router.get('/health', async (req, res) => {
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'ok',
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      disk: await checkDisk(),
    },
  };
  
  res.json(health);
});
```

### 监控脚本

```bash
#!/bin/bash
# monitor.sh

API_URL="https://api.your-domain.com"

while true; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
    
    if [ "$response" != "200" ]; then
        echo "[$(date)] ❌ Health check failed: HTTP $response"
        # 发送告警（邮件/Slack/钉钉）
    else
        echo "[$(date)] ✅ System healthy"
    fi
    
    sleep 60
done
```

### PM2 Ecosystem

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'performance-backend',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G',
    watch: false,
  }],
};
```

---

## 备份策略

### 数据库备份

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/backups/performance"
DATE=$(date +%Y%m%d_%H%M%S)

# PostgreSQL 备份
pg_dump -U performance_user performance_db | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# 删除 7 天前的备份
find "$BACKUP_DIR" -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: db_$DATE.sql.gz"
```

### 自动备份（Cron）

```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /path/to/backup.sh >> /var/log/backup.log 2>&1
```

---

## 故障排查

### 常见问题

#### 1. 数据库连接失败

```bash
# 检查数据库是否运行
systemctl status postgresql

# 检查端口
netstat -tuln | grep 5432

# 测试连接
psql -U performance_user -d performance_db -h localhost
```

#### 2. 前端资源404

```bash
# 检查 Nginx 配置
nginx -t

# 检查静态文件
ls -la /var/www/performance-management/dist/

# 查看 Nginx 日志
tail -f /var/log/nginx/error.log
```

#### 3. API 响应慢

```bash
# 检查数据库查询
EXPLAIN ANALYZE SELECT * FROM monthly_assessments WHERE employee_id = 'emp001';

# 检查索引
\d monthly_assessments

# 查看慢查询日志
tail -f /var/log/postgresql/postgresql-slow.log
```

---

## 更新流程

### 滚动更新

```bash
# 1. 拉取最新代码
git pull origin main

# 2. 安装依赖
cd backend && npm install
cd ../app && npm install

# 3. 运行数据库迁移
psql -U performance_user -d performance_db -f migrations/012_xxx.sql

# 4. 构建前端
cd app && npm run build

# 5. 重启后端（零停机）
pm2 reload performance-backend

# 6. 更新前端
rsync -av dist/ /var/www/performance-management/dist/

# 7. 验证
curl https://api.your-domain.com/health
```

---

*部署指南版本: 1.0*  
*最后更新: 2026-03-01*
