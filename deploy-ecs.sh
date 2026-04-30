#!/bin/bash
# 绩效管理系统 ECS 部署脚本
# 用法: ./deploy-ecs.sh [密码]

set -e

PASSWORD="${1:-}"
SSH_HOST="8.138.230.46"
SSH_USER="root"
REMOTE_DIR="/opt/performance-management"

if [ -z "$PASSWORD" ]; then
    echo "请提供 ECS 密码作为参数: ./deploy-ecs.sh <password>"
    exit 1
fi

export SSHPASS="$PASSWORD"
SSH_CMD="sshpass -e ssh -o StrictHostKeyChecking=no"
SCP_CMD="sshpass -e scp -o StrictHostKeyChecking=no"

echo "🚀 开始部署绩效管理系统到 ECS..."

# 1. 构建前端
echo "📦 构建前端..."
cd "$(dirname "$0")/app"
npm install
npm run build
cd ..

# 2. 构建后端
echo "📦 构建后端..."
cd backend
npm install --production
npm run build
cd ..

# 3. 创建部署包
echo "📦 创建部署包..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
TAR_FILE="deploy-${TIMESTAMP}.tar.gz"
tar czf "$TAR_FILE" \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='deploy-*.sh' \
    --exclude='*.tar.gz' \
    backend/src/ \
    backend/dist/ \
    backend/package.json \
    backend/package-lock.json \
    app/dist/ \
    app/package.json \
    app/package-lock.json \
    docker-compose.yml \
    postgres-init/ \
    scripts/

# 4. 上传到 ECS
echo "📤 上传到 ECS..."
$SCP_CMD "$TAR_FILE" "$SSH_USER@$SSH_HOST:/tmp/"

# 5. 部署到 ECS
echo "🔧 部署到 ECS..."
$SSH_CMD "$SSH_USER@$SSH_HOST" << EOF
set -e
cd "$REMOTE_DIR"

# 备份当前版本
if [ -d "backend/dist" ]; then
    cp -r backend/dist backend/dist.bak.$TIMESTAMP 2>/dev/null || true
    cp -r app/dist app/dist.bak.$TIMESTAMP 2>/dev/null || true
fi

# 解压新代码
tar xzf /tmp/deploy-${TIMESTAMP}.tar.gz

# 重启服务
docker compose down
docker compose up -d --build

# 清理
rm -f /tmp/deploy-${TIMESTAMP}.tar.gz

echo "✅ 部署完成"
EOF

echo "🎉 部署成功！"
rm -f "$TAR_FILE"
