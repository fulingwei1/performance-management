#!/bin/bash

API_URL="http://localhost:3001/api"

# 先登录获取token
echo "=== 1. 登录获取Token ==="
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "姚洪", "password": "123456"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "✅ 登录成功，Token: ${TOKEN:0:20}..."
echo ""

# 测试员工自评AI生成
echo "=== 2. 测试AI生成：员工自评总结 ==="
SUMMARY_RESPONSE=$(curl -s -X POST "$API_URL/ai/self-summary" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "employeeId": "emp-yaohong",
    "month": "2026-02"
  }')

echo $SUMMARY_RESPONSE | jq -r '.data.versions[0]' 2>/dev/null || echo $SUMMARY_RESPONSE
echo ""

# 测试晋升申请AI生成
echo "=== 3. 测试AI生成：晋升申请-绩效总结 ==="
PROMOTION_RESPONSE=$(curl -s -X POST "$API_URL/ai/promotion-performance" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "employeeName": "姚洪",
    "currentLevel": "中级工程师",
    "targetLevel": "高级工程师"
  }')

echo $PROMOTION_RESPONSE | jq -r '.data.versions[0]' 2>/dev/null || echo $PROMOTION_RESPONSE
echo ""

# 测试同事互评AI生成
echo "=== 4. 测试AI生成：同事互评意见 ==="
PEER_RESPONSE=$(curl -s -X POST "$API_URL/ai/peer-review-comment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "reviewerName": "姚洪",
    "revieweeName": "罗伟军",
    "scores": {
      "collaboration": 4,
      "professionalism": 5,
      "communication": 4
    }
  }')

echo $PEER_RESPONSE | jq -r '.data.versions[0]' 2>/dev/null || echo $PEER_RESPONSE
echo ""

# 测试AI使用统计
echo "=== 5. 查询AI使用统计 ==="
STATS_RESPONSE=$(curl -s -X GET "$API_URL/ai/my-usage" \
  -H "Authorization: Bearer $TOKEN")

echo $STATS_RESPONSE | jq '.' 2>/dev/null || echo $STATS_RESPONSE

