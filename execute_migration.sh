#!/bin/bash
# 在 ECS 服务器上执行迁移脚本

echo "🔌 连接到 ECS 服务器..."
ssh root@8.138.230.46 << 'REMOTE'
cd /opt/performance-management

# 检查 PostgreSQL 容器
echo "📊 检查 PostgreSQL 容器..."
docker compose ps postgres

# 执行 SQL 迁移
echo "🚀 执行迁移脚本..."
docker compose exec -T postgres psql -U postgres -d performance_management << 'SQL'
\i /tmp/013_core_department_templates.sql
SQL

echo "✅ 迁移执行完成！"
REMOTE
