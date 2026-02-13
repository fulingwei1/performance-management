#!/bin/bash

BASE_URL="http://localhost:3001"

# 获取员工 token
EMPLOYEE_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"姚洪","password":"123456"}' | jq -r '.data.token')

echo "=== 详细检查失败的功能 ==="
echo

echo "1. 工作总结提交（检查接口和参数）"
echo "Request:"
echo '{
  "employee_id": "e001",
  "year": 2026,
  "month": 2,
  "summary": "测试",
  "achievements": "测试",
  "issues": "无"
}'
echo
echo "Response:"
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

echo "2. 战略目标查询"
GM_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"gm001","password":"123456"}' | jq -r '.data.token')

curl -s "$BASE_URL/api/objectives" \
    -H "Authorization: Bearer $GM_TOKEN" | jq '.'
echo

echo "3. 晋升申请（检查必填字段）"
echo "Request:"
echo '{
  "employee_id": "e001",
  "current_position": "销售员",
  "target_position": "高级销售员",
  "current_level": "junior",
  "target_level": "intermediate",
  "reason": "测试",
  "self_evaluation": "测试"
}'
echo
echo "Response:"
curl -s -X POST "$BASE_URL/api/promotion-requests" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "employee_id": "e001",
        "current_position": "销售员",
        "target_position": "高级销售员",
        "current_level": "junior",
        "target_level": "intermediate",
        "reason": "测试",
        "self_evaluation": "测试"
    }' | jq '.'
echo

echo "4. AI 生成功能"
curl -s -X POST "$BASE_URL/api/ai/generate" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "prompt": "帮我写一份工作总结",
        "context": "完成测试",
        "type": "summary"
    }' | jq '.'

