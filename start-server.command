#!/bin/bash
# ATE绩效管理系统 - Mac启动脚本
# 双击此文件即可启动当前本地开发环境

set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

cd "$ROOT_DIR"
echo "正在启动 PostgreSQL..."
docker compose up -d postgres

echo "正在执行数据库迁移..."
(cd backend && npm run db:migrate:local)

echo "正在启动后端和前端..."
echo "后端: http://localhost:3001"
echo "前端: http://localhost:5173"

(cd backend && npm run dev) &
BACKEND_PID=$!

(cd app && npm run dev -- --host 0.0.0.0) &
FRONTEND_PID=$!

trap 'kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true' EXIT
wait
