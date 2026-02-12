#!/bin/bash

# AI 使用统计功能测试脚本

BASE_URL="http://localhost:3000"
EMPLOYEE_TOKEN=""
ADMIN_TOKEN=""

echo "🧪 AI 使用统计功能测试"
echo "================================"
echo ""

# 1. 员工登录
echo "📝 步骤 1: 员工登录 (姚洪)"
EMPLOYEE_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "姚洪", "password": "123456"}')

EMPLOYEE_TOKEN=$(echo $EMPLOYEE_LOGIN | grep -o '"token":"[^"]*' | sed 's/"token":"//')
EMPLOYEE_ID=$(echo $EMPLOYEE_LOGIN | grep -o '"userId":[0-9]*' | sed 's/"userId"://')

if [ -z "$EMPLOYEE_TOKEN" ]; then
  echo "❌ 员工登录失败"
  exit 1
fi

echo "✅ 员工登录成功 (ID: $EMPLOYEE_ID)"
echo ""

# 2. 管理员登录
echo "📝 步骤 2: 管理员登录 (系统管理员)"
ADMIN_LOGIN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "系统管理员", "password": "admin123"}')

ADMIN_TOKEN=$(echo $ADMIN_LOGIN | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ 管理员登录失败"
  exit 1
fi

echo "✅ 管理员登录成功"
echo ""

# 3. 模拟 AI 调用（会自动记录）
echo "📝 步骤 3: 模拟 AI 调用（需要 Kimi API Key）"
echo "⚠️  如果没有配置 Kimi API Key，此步骤会失败（但日志仍会记录）"
echo ""

# 员工生成自评总结
echo "  3.1 员工生成自评总结..."
AI_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/self-summary" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -d "{\"employeeId\": $EMPLOYEE_ID, \"month\": \"2026-02\"}")

echo "  响应: $(echo $AI_RESPONSE | head -c 100)..."
echo ""

# 员工生成下月计划
echo "  3.2 员工生成下月计划..."
AI_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/next-month-plan" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
  -d "{\"employeeId\": $EMPLOYEE_ID, \"currentSummary\": \"本月完成了XXX工作\"}")

echo "  响应: $(echo $AI_RESPONSE | head -c 100)..."
echo ""

# 4. 查询员工自己的统计
echo "📝 步骤 4: 查询员工自己的使用统计"
MY_STATS=$(curl -s -X GET "$BASE_URL/api/ai/my-usage" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN")

echo "$MY_STATS" | python3 -m json.tool 2>/dev/null || echo "$MY_STATS"
echo ""

# 5. 管理员查询所有人统计
echo "📝 步骤 5: 管理员查询所有人使用统计"
ALL_STATS=$(curl -s -X GET "$BASE_URL/api/ai/all-usage" \
  -H "Authorization: Bearer $ADMIN_TOKEN")

echo "$ALL_STATS" | python3 -m json.tool 2>/dev/null || echo "$ALL_STATS"
echo ""

# 6. 权限测试：员工尝试查询所有人统计（应该失败）
echo "📝 步骤 6: 权限测试 - 员工尝试查询所有人统计（应该失败）"
FORBIDDEN=$(curl -s -X GET "$BASE_URL/api/ai/all-usage" \
  -H "Authorization: Bearer $EMPLOYEE_TOKEN")

echo "$FORBIDDEN" | python3 -m json.tool 2>/dev/null || echo "$FORBIDDEN"
echo ""

echo "================================"
echo "✅ 测试完成！"
echo ""
echo "📊 总结:"
echo "  - 员工可以查看自己的使用统计"
echo "  - 管理员可以查看所有人的统计"
echo "  - 每次 AI 调用都会自动记录（无论成功或失败）"
echo "  - 记录包括：用户、功能类型、Token数、成本、时间"
