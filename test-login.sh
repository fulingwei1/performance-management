#!/bin/bash

echo "=== 绩效考核系统 - 登录测试脚本 ==="
echo ""

# 测试后端服务
echo "1. 检查后端服务..."
if curl -s http://localhost:3001/health > /dev/null; then
    echo "   ✅ 后端服务正常 (端口3001)"
else
    echo "   ❌ 后端服务未启动"
    exit 1
fi

# 测试前端服务
echo "2. 检查前端服务..."
if curl -s http://localhost:5173/ | grep -q "ATE绩效管理平台"; then
    echo "   ✅ 前端服务正常 (端口5173)"
else
    echo "   ❌ 前端服务异常"
    exit 1
fi

# 测试登录API
echo "3. 测试登录API..."
RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"王HR","password":"123456","role":"hr"}')

echo "   响应: $RESPONSE"

if echo "$RESPONSE" | grep -q '"success":true'; then
    echo "   ✅ 登录API正常"
    echo ""
    echo "=== 所有测试通过！系统运行正常 ==="
    echo ""
    echo "请访问: http://localhost:5173"
    echo "使用账号: 王HR / 123456 / 人力资源"
else
    echo "   ❌ 登录API异常"
    echo ""
    echo "=== 问题诊断 ==="
    echo "可能原因:"
    echo "1. 数据未正确初始化"
    echo "2. 密码验证失败"
    echo "3. 角色不匹配"
    echo ""
    echo "建议: 重启后端服务"
    echo "  cd backend && npm run dev"
fi
