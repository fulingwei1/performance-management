#!/bin/bash

# 从 .env 文件读取并推送到 Vercel 的简化脚本
# 用法: ./scripts/push-env-to-vercel.sh <env_file> [environment]

set -e

ENV_FILE=${1:-"backend/.env"}
ENVIRONMENT=${2:-"production"}

# 颜色
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

if [ ! -f "$ENV_FILE" ]; then
    error "文件不存在: $ENV_FILE"
fi

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    error "请先安装 Vercel CLI: npm i -g vercel"
fi

# 获取项目目录
PROJECT_DIR=$(dirname "$ENV_FILE")
cd "$PROJECT_DIR"

info "从 $ENV_FILE 读取环境变量..."
info "目标环境: $ENVIRONMENT"
echo ""

# 需要推送的变量列表（可自定义）
VARS_TO_PUSH=(
    "DATABASE_URL"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "SUPABASE_SERVICE_ROLE_KEY"
    "JWT_SECRET"
    "JWT_EXPIRES_IN"
    "NODE_ENV"
    "USE_MEMORY_DB"
    "ADMIN_DEFAULT_PASSWORD"
)

# 读取 .env 文件并推送
while IFS='=' read -r key value || [ -n "$key" ]; do
    # 跳过注释和空行
    [[ "$key" =~ ^#.*$ ]] && continue
    [[ -z "$key" ]] && continue

    # 去除空格
    key=$(echo "$key" | xargs)
    value=$(echo "$value" | xargs)

    # 检查是否在推送列表中
    if [[ " ${VARS_TO_PUSH[*]} " =~ " ${key} " ]]; then
        info "设置 $key..."

        # 先删除已存在的（忽略错误）
        vercel env rm "$key" "$ENVIRONMENT" -y 2>/dev/null || true

        # 添加新值
        echo "$value" | vercel env add "$key" "$ENVIRONMENT"

        success "$key 已设置"
    fi
done < "$ENV_FILE"

echo ""
success "环境变量推送完成!"
echo ""
info "运行以下命令部署:"
info "  cd $PROJECT_DIR && vercel --prod"
