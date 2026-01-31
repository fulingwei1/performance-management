#!/bin/bash

# ATE绩效管理系统 - 数据库停止脚本

echo "🛑 停止 MySQL 容器..."

cd "$(dirname "$0")/.."

docker compose down

echo "✅ MySQL 容器已停止"
echo ""
echo "💡 提示: 数据保存在 Docker volume 中，下次启动时数据仍在"
echo "   如需清除数据，请运行: docker compose down -v"
