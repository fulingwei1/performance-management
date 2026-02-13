#!/bin/bash

BASE_URL="http://localhost:3001"

echo "=== 逐项功能测试（每次重新登录）===" && echo

# 1. 工作总结
echo "1️⃣ 工作总结功能"
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"姚洪","password":"123456"}' | jq -r '.data.token')

echo "查询绩效记录："
curl -s "$BASE_URL/api/performance" \
    -H "Authorization: Bearer $TOKEN" | jq '.success, .data | length'

echo "提交工作总结："
curl -s -X POST "$BASE_URL/api/performance" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "employee_id": "e001",
        "year": 2026,
        "month": 2,
        "summary": "本月完成系统测试",
        "achievements": "修复登录bug",
        "issues": "无"
    }' | jq '.success, .message, .data.id // empty'

echo && echo "2️⃣ 战略目标"
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"gm001","password":"123456"}' | jq -r '.data.token')

curl -s "$BASE_URL/api/objectives" \
    -H "Authorization: Bearer $TOKEN" | jq '.success, (.data | length) // 0'

echo && echo "3️⃣ 晋升申请"
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"姚洪","password":"123456"}' | jq -r '.data.token')

curl -s -X POST "$BASE_URL/api/promotion-requests" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "employee_id": "e001",
        "current_position": "销售员",
        "target_position": "高级销售员",
        "current_level": "junior",
        "target_level": "intermediate",
        "reason": "完成销售目标120%",
        "self_evaluation": "表现优秀"
    }' | jq '.success, .message, .data.id // empty'

echo && echo "4️⃣ AI 生成功能"
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"姚洪","password":"123456"}' | jq -r '.data.token')

curl -s -X POST "$BASE_URL/api/ai/generate" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "prompt": "帮我写一份本月工作总结",
        "context": "完成了系统测试工作",
        "type": "summary"
    }' | jq '.success, (.text | length) // 0'

echo && echo "5️⃣ 同行评审"
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"hr001","password":"123456"}' | jq -r '.data.token')

echo "查询评审周期："
curl -s "$BASE_URL/api/peer-review-cycles" \
    -H "Authorization: Bearer $TOKEN" | jq '.success, (.data | length) // 0'

