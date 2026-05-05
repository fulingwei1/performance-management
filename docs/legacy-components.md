# 遗留组件清理说明

当前主线运行方式：

- 后端：`/backend`
- 前端：`/app`
- 数据库：PostgreSQL，初始化脚本在 `/postgres-init`
- 本地迁移：`cd backend && npm run db:migrate:local`
- Docker 部署：项目根目录 `docker-compose.yml`

以下目录/脚本属于历史遗留或兼容入口，默认不再作为主线维护：

| 路径 | 状态 | 处理建议 |
| --- | --- | --- |
| `/backend-deploy` | 历史精简后端包 | 不再新增功能；确认线上无引用后删除 |
| `/standalone-backend` | 历史单文件后端 | 不再新增功能；确认线上无引用后删除 |
| `/mysql-init` | 历史 MySQL 初始化脚本 | PostgreSQL 主线不再使用；确认无历史环境后删除 |
| `/backend/migrations-mysql` | 历史 MySQL 迁移 | 仅保留给历史环境；默认迁移入口已禁止直接运行 |
| `/backend/run-migrations.js` | 历史 MySQL 迁移入口 | 默认拒绝执行；如确需历史环境，设置 `ALLOW_LEGACY_MYSQL_MIGRATIONS=true` |

清理原则：

1. 先确认部署平台、服务器脚本、文档中没有引用。
2. 先归档/标记废弃，再删除。
3. 删除后运行后端测试、前端构建、Docker compose 配置校验。
