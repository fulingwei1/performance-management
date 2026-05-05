# Deprecated

这里是历史 MySQL 迁移目录。当前主线迁移入口是：

```bash
cd backend
npm run db:migrate:local
```

该命令会执行 PostgreSQL 迁移。历史 MySQL 迁移入口 `/backend/run-migrations.js` 默认拒绝执行，避免误操作旧数据库脚本。
