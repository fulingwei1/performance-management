#!/bin/bash

# 绩效管理平台 Vercel 部署脚本

echo "🚀 开始部署绩效管理平台到 Vercel..."

# 检查 Vercel CLI 是否安装
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安装，正在安装..."
    npm install -g vercel
fi

# 检查是否已登录 Vercel
echo "📋 检查 Vercel 登录状态..."
vercel whoami

if [ $? -ne 0 ]; then
    echo "🔐 请先登录 Vercel:"
    vercel login
fi

# 部署后端
echo "🔧 部署后端服务..."
cd backend
vercel --prod --name performance-management-api

# 部署前端
echo "🎨 部署前端应用..."
cd ../app
vercel --prod --name performance-management

echo "✅ 部署完成！"
echo ""
echo "📝 请记住以下信息:"
echo "1. 后端 API URL: https://performance-management-api.vercel.app/api"
echo "2. 前端应用 URL: https://performance-management.vercel.app"
echo ""
echo "⚙️  配置说明:"
echo "- 在 Vercel Dashboard 中为前端项目设置环境变量 VITE_API_URL"
echo "- 建议设置为: https://performance-management-api.vercel.app/api"
echo "- 内存数据库已启用 (USE_MEMORY_DB=true)"