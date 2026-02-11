#!/bin/bash

# Vercel 环境变量自动配置脚本
# 用法: ./scripts/setup-vercel-env.sh [backend|frontend|all]

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# 打印带颜色的消息
info() { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 检查 Vercel CLI 是否安装
check_vercel_cli() {
    if ! command -v vercel &> /dev/null; then
        error "Vercel CLI 未安装。请运行: npm i -g vercel"
    fi
    info "Vercel CLI 已安装 ✓"
}

# 检查是否已登录 Vercel
check_vercel_login() {
    if ! vercel whoami &> /dev/null; then
        warn "未登录 Vercel，正在启动登录流程..."
        vercel login
    fi
    info "Vercel 已登录: $(vercel whoami) ✓"
}

# 设置单个环境变量
set_env_var() {
    local project_dir=$1
    local var_name=$2
    local var_value=$3
    local environments=${4:-"production preview development"}

    cd "$project_dir"

    # 删除已存在的变量（忽略错误）
    for env in $environments; do
        vercel env rm "$var_name" "$env" -y 2>/dev/null || true
    done

    # 添加新变量
    echo "$var_value" | vercel env add "$var_name" production preview development

    info "  已设置: $var_name"
}

# 配置后端环境变量
setup_backend_env() {
    info "=========================================="
    info "配置后端 (Backend) 环境变量"
    info "=========================================="

    local backend_dir="$PROJECT_ROOT/backend"
    local env_file="$backend_dir/.env"

    if [ ! -f "$env_file" ]; then
        error "未找到 $env_file 文件"
    fi

    cd "$backend_dir"

    # 确保项目已链接到 Vercel
    if [ ! -d ".vercel" ]; then
        warn "后端项目未链接到 Vercel，正在链接..."
        vercel link
    fi

    info "正在设置环境变量..."

    # 读取并设置环境变量
    # 数据库配置
    set_env_var "$backend_dir" "DATABASE_URL" "postgresql://postgres:VSBI9rbbvjK7n64B@db.dehgzqgnoqyujsmxgjvn.supabase.co:5432/postgres"
    set_env_var "$backend_dir" "SUPABASE_URL" "https://dehgzqgnoqyujsmxgjvn.supabase.co"
    set_env_var "$backend_dir" "SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlaGd6cWdub3F5dWpzbXhnanZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NDAzMTAsImV4cCI6MjA4NTQxNjMxMH0.XLADPGt8mGX0YZocd5NbM9NK4iOjJ38LH4BmhTZ7oUs"
    set_env_var "$backend_dir" "SUPABASE_SERVICE_ROLE_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRlaGd6cWdub3F5dWpzbXhnanZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTg0MDMxMCwiZXhwIjoyMDg1NDE2MzEwfQ.xdz6w659ChxaiF_Dx5Cg6rnqdDFqb_2JAyd_B9XsPnY"

    # JWT 配置
    set_env_var "$backend_dir" "JWT_SECRET" "performance_system_secret_key_2024"
    set_env_var "$backend_dir" "JWT_EXPIRES_IN" "7d"

    # 服务器配置
    set_env_var "$backend_dir" "NODE_ENV" "production"
    set_env_var "$backend_dir" "USE_MEMORY_DB" "false"
    set_env_var "$backend_dir" "ADMIN_DEFAULT_PASSWORD" "admin123"

    success "后端环境变量配置完成!"
}

# 配置前端环境变量
setup_frontend_env() {
    info "=========================================="
    info "配置前端 (Frontend) 环境变量"
    info "=========================================="

    local frontend_dir="$PROJECT_ROOT/app"

    cd "$frontend_dir"

    # 确保项目已链接到 Vercel
    if [ ! -d ".vercel" ]; then
        warn "前端项目未链接到 Vercel，正在链接..."
        vercel link
    fi

    info "正在设置环境变量..."

    # 前端通过 vercel.json 的 rewrites 代理 API，不需要直接配置 API URL
    # 但如果需要，可以设置 VITE_API_URL
    # 生产环境留空，让代码自动使用 /api 代理
    set_env_var "$frontend_dir" "VITE_API_URL" ""

    success "前端环境变量配置完成!"
}

# 部署项目
deploy_projects() {
    local target=$1

    info "=========================================="
    info "开始部署到 Vercel"
    info "=========================================="

    if [ "$target" = "backend" ] || [ "$target" = "all" ]; then
        info "部署后端..."
        cd "$PROJECT_ROOT/backend"
        vercel --prod
        success "后端部署完成!"
    fi

    if [ "$target" = "frontend" ] || [ "$target" = "all" ]; then
        info "部署前端..."
        cd "$PROJECT_ROOT/app"
        vercel --prod
        success "前端部署完成!"
    fi
}

# 显示帮助信息
show_help() {
    echo "Vercel 环境变量配置脚本"
    echo ""
    echo "用法: $0 [命令] [选项]"
    echo ""
    echo "命令:"
    echo "  backend     仅配置后端环境变量"
    echo "  frontend    仅配置前端环境变量"
    echo "  all         配置所有环境变量 (默认)"
    echo "  deploy      配置环境变量并部署"
    echo "  help        显示此帮助信息"
    echo ""
    echo "选项:"
    echo "  --skip-deploy    仅配置环境变量，不部署"
    echo ""
    echo "示例:"
    echo "  $0 all                    # 配置所有环境变量"
    echo "  $0 backend                # 仅配置后端"
    echo "  $0 deploy                 # 配置并部署所有项目"
    echo "  $0 deploy backend         # 配置并部署后端"
}

# 主函数
main() {
    local command=${1:-"all"}
    local target=${2:-"all"}

    echo ""
    echo "╔════════════════════════════════════════╗"
    echo "║   Vercel 环境变量自动配置脚本          ║"
    echo "╚════════════════════════════════════════╝"
    echo ""

    case $command in
        help|--help|-h)
            show_help
            exit 0
            ;;
        backend)
            check_vercel_cli
            check_vercel_login
            setup_backend_env
            ;;
        frontend)
            check_vercel_cli
            check_vercel_login
            setup_frontend_env
            ;;
        all)
            check_vercel_cli
            check_vercel_login
            setup_backend_env
            setup_frontend_env
            ;;
        deploy)
            check_vercel_cli
            check_vercel_login
            if [ "$target" = "all" ]; then
                setup_backend_env
                setup_frontend_env
            elif [ "$target" = "backend" ]; then
                setup_backend_env
            elif [ "$target" = "frontend" ]; then
                setup_frontend_env
            fi
            deploy_projects "$target"
            ;;
        *)
            error "未知命令: $command。使用 '$0 help' 查看帮助。"
            ;;
    esac

    echo ""
    success "=========================================="
    success "所有操作完成!"
    success "=========================================="
    echo ""
    info "下一步:"
    info "  1. 如果尚未部署，运行: $0 deploy"
    info "  2. 或手动部署: cd backend && vercel --prod"
    info "  3. 检查 Supabase 项目是否处于活跃状态"
    echo ""
}

# 运行主函数
main "$@"
