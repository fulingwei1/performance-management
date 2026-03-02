#!/bin/bash
set -e

echo "初始化PostgreSQL数据库..."
psql -d performance_management -f src/config/init-db-postgres.sql

echo ""
echo "执行Phase 2迁移..."
for f in src/migrations/012_peer_review_system.sql \
         src/migrations/013_performance_interview_enhanced.sql \
         src/migrations/014_optimize_phase2_indexes.sql; do
  if [ -f "$f" ]; then
    echo "  执行: $f"
    psql -d performance_management -f "$f"
  else
    echo "  跳过(不存在): $f"
  fi
done

echo ""
echo "✅ 数据库初始化完成！"
