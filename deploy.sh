#!/bin/bash

set -e

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ATE绩效管理系统 - Docker部署脚本  "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查Docker
echo -e "\n${YELLOW}[1/6]${NC} 检查Docker环境..."
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker未安装，请先安装Docker${NC}"
    exit 1
fi

if ! docker compose version &> /dev/null; then
    echo -e "${RED}❌ Docker Compose 不可用${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker环境正常${NC}"

# 检查端口占用
echo -e "\n${YELLOW}[2/6]${NC} 检查端口占用..."
for port in 5432 3001 5173; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  端口 $port 已被占用，将尝试使用其他端口${NC}"
    fi
done

# 停止旧服务
echo -e "\n${YELLOW}[3/6]${NC} 停止旧服务（如果存在）..."
docker compose down 2>/dev/null || true

# 构建镜像
echo -e "\n${YELLOW}[4/6]${NC} 构建Docker镜像..."
echo -e "${GREEN}正在构建后端镜像...${NC}"
docker compose build backend

echo -e "${GREEN}正在构建前端镜像...${NC}"
docker compose build frontend

echo -e "${GREEN}✓ 镜像构建完成${NC}"

# 启动服务
echo -e "\n${YELLOW}[5/6]${NC} 启动服务..."
docker compose up -d

# 等待服务就绪
echo -e "\n${YELLOW}[6/6]${NC} 等待服务启动..."
echo -e "${GREEN}等待PostgreSQL初始化（约30秒）...${NC}"
sleep 10

# 检查PostgreSQL
for i in {1..30}; do
    if docker exec ate_postgres pg_isready -U performance_user -d performance_db &> /dev/null; then
        echo -e "${GREEN}✓ PostgreSQL已就绪${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo -e "\n${GREEN}等待Backend启动（约20秒）...${NC}"
for i in {1..20}; do
    if curl -s http://localhost:3001/health > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Backend已就绪${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo -e "\n${GREEN}等待Frontend就绪（约10秒）...${NC}"
for i in {1..10}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Frontend已就绪${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# 显示状态
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ 部署完成！${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo -e "\n📊 服务状态:"
docker compose ps

echo -e "\n🌐 访问地址:"
echo -e "  前端:  ${GREEN}http://localhost:5173${NC}"
echo -e "  后端:  ${GREEN}http://localhost:3001/api${NC}"
echo -e "  PostgreSQL: ${GREEN}localhost:5432${NC}"

echo -e "\n🔑 测试账号:"
echo -e "  账号使用姓名或工号登录；初始临时密码请通过 INITIAL_EMPLOYEE_TEMP_PASSWORD 设置。"
echo -e "  首次登录后系统会要求修改密码；未设置自定义密码时可用身份证后六位。"

echo -e "\n📝 常用命令:"
echo -e "  查看日志: ${YELLOW}docker compose logs -f${NC}"
echo -e "  停止服务: ${YELLOW}docker compose down${NC}"
echo -e "  重启服务: ${YELLOW}docker compose restart${NC}"

echo -e "\n💡 详细文档: ${YELLOW}查看 DEPLOY.md${NC}"
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
