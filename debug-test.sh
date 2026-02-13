#!/bin/bash

BASE_URL="http://localhost:3001"

echo "=== 详细调试各项功能 ===" && echo

# 获取各角色 token
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

EMPLOYEE_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"姚洪","password":"123456"}' | jq -r '.data.token')

GM_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"gm001","password":"123456"}' | jq -r '.data.token')

echo "1️⃣ 工作总结提交（检查返回详情）"
curl -s -X POST "$BASE_URL/api/performance" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "employee_id": "e001",
        "year": 2026,
        "month": 2,
        "summary": "测试",
        "achievements": "测试",
        "issues": "无"
    }' | jq '.'
echo

echo "2️⃣ 战略目标查询（检查详细响应）"
curl -s "$BASE_URL/api/objectives" \
    -H "Authorization: Bearer $GM_TOKEN" | jq '.'
echo

echo "3️⃣ 数据库中战略目标数量"
docker exec ate_postgres psql -U performance_user -d performance_db -c "SELECT COUNT(*) FROM strategic_objectives;"
echo

echo "4️⃣ AI 功能（检查详细响应）"
curl -s -X POST "$BASE_URL/api/ai/generate" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "prompt": "帮我写工作总结",
        "context": "测试",
        "type": "summary"
    }' | jq '.'

