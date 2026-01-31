#!/bin/bash

echo "🚀 开始Vercel部署流程..."

# 检查登录状态
echo "📋 检查Vercel登录状态..."
if ! vercel whoami > /dev/null 2>&1; then
    echo "❌ 未登录Vercel，请先运行: vercel login"
    exit 1
fi

echo "✅ Vercel登录成功"

# 部署后端
echo ""
echo "🔧 部署后端服务..."
cd backend

echo "📦 安装依赖..."
npm install

echo "🏗️ 构建后端..."
npm run build

echo "🚀 部署到Vercel..."
BACKEND_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^[:space:]]*\.vercel\.app')

if [ -z "$BACKEND_URL" ]; then
    echo "❌ 后端部署失败"
    exit 1
fi

echo "✅ 后端部署成功: $BACKEND_URL"

# 部署前端
echo ""
echo "🎨 部署前端应用..."
cd ../app

echo "📦 安装依赖..."
npm install

echo "🏗️ 构建前端..."
npm run build

echo "🚀 部署到Vercel..."
FRONTEND_URL=$(vercel --prod --yes 2>&1 | grep -o 'https://[^[:space:]]*\.vercel\.app')

if [ -z "$FRONTEND_URL" ]; then
    echo "❌ 前端部署失败"
    exit 1
fi

echo "✅ 前端部署成功: $FRONTEND_URL"

# 输出结果
echo ""
echo "🎉 部署完成！"
echo ""
echo "📍 应用地址:"
echo "后端API: $BACKEND_URL/api"
echo "前端应用: $FRONTEND_URL"
echo ""
echo "⚙️ 接下来需要配置:"
echo "1. 在Vercel Dashboard为后端设置环境变量:"
echo "   - NODE_ENV=production"
echo "   - USE_MEMORY_DB=true"
echo "   - JWT_SECRET=your-jwt-secret-key"
echo ""
echo "2. 在Vercel Dashboard为前端设置环境变量:"
echo "   - VITE_API_URL=$BACKEND_URL/api"
echo ""
echo "🧪 测试命令:"
echo "后端健康检查: curl $BACKEND_URL/health"
echo "前端访问: $FRONTEND_URL"