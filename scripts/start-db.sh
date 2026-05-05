#!/bin/bash

# ATE绩效管理系统 - 数据库启动脚本

set -e

echo "🚀 ATE绩效管理系统 - PostgreSQL 数据库启动"
echo "=========================================="

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ 错误: Docker 未安装"
    echo "请先安装 Docker: https://www.docker.com/get-started"
    exit 1
fi

# 检查 Docker Compose 是否可用
if ! docker compose version &> /dev/null; then
    echo "❌ 错误: Docker Compose 不可用"
    exit 1
fi

# 启动 PostgreSQL 容器
echo "📦 启动 PostgreSQL 容器..."
docker compose up -d postgres

# 等待 PostgreSQL 准备就绪
echo "⏳ 等待 PostgreSQL 启动..."
sleep 5

# 检查容器状态
for i in {1..30}; do
    if docker compose exec postgres pg_isready -U performance_user -d performance_db >/dev/null 2>&1; then
        echo "✅ PostgreSQL 已就绪!"
        break
    fi
    echo "   等待中... ($i/30)"
    sleep 2
done

# 显示连接信息
echo ""
echo "=========================================="
echo "📊 数据库连接信息:"
echo "   主机: localhost"
echo "   端口: 5432"
echo "   数据库: performance_db"
echo "   用户名: performance_user"
echo "   密码: performance123"
echo ""
echo "📝 初始账号："
echo "   - 总经理: 郑汝才 (gm001)"
echo "   - HR: 林作倩 (hr001), 符凌维 (hr002)"
echo "   - 经理: 于振华 (m001) 等6位"
echo "   - 员工: 周欢欢 (e001) 等26位"
echo "   初始临时密码请通过 INITIAL_EMPLOYEE_TEMP_PASSWORD 设置，首次登录后必须修改。"
echo "=========================================="
echo ""
echo "🎯 下一步:"
echo "   1. 启动后端: cd backend && npm run dev"
echo "   2. 启动前端: cd app && npm run dev"
echo ""
