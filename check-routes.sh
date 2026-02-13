#!/bin/bash

echo "=== 检查后端路由配置 ==="
echo

echo "1. 检查 performance 路由"
docker exec ate_backend ls -la /app/dist/routes/ | grep -i performance
echo

echo "2. 检查 AI 路由"
docker exec ate_backend ls -la /app/dist/routes/ | grep -i ai
echo

echo "3. 检查所有可用路由"
docker exec ate_backend ls -la /app/dist/routes/
echo

echo "4. 检查主入口文件"
docker exec ate_backend cat /app/dist/index.js | grep -A 3 "app.use.*api"

