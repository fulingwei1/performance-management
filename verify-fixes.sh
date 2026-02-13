#!/bin/bash

BASE_URL="http://localhost:3001"

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== 验证修复效果 ===${NC}\n"

# 登录
TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"姚洪","password":"123456"}' | jq -r '.data.token')

echo "1️⃣ 工作总结提交（使用新月份 2026-03）"
SUMMARY_RESULT=$(curl -s -X POST "$BASE_URL/api/performance/summary" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "month": "2026-03",
        "summary": "【验证修复】本月完成功能测试",
        "achievements": "【验证修复】所有agent完成任务",
        "issues": "【验证修复】无"
    }')

if echo $SUMMARY_RESULT | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 工作总结提交成功${NC}"
    echo $SUMMARY_RESULT | jq '{id: .data.id, month: .data.month}'
else
    echo -e "${RED}❌ 工作总结提交失败${NC}"
    echo $SUMMARY_RESULT | jq '{success, message}'
fi

echo -e "\n2️⃣ 晋升申请（添加调薪比例字段）"
PROMOTION_RESULT=$(curl -s -X POST "$BASE_URL/api/promotion-requests" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "employee_id": "e001",
        "current_position": "销售员",
        "target_position": "高级销售员",
        "current_level": "junior",
        "target_level": "intermediate",
        "salary_increase_ratio": 15.0,
        "reason": "【验证修复】完成销售目标120%",
        "self_evaluation": "【验证修复】具备晋升条件"
    }')

if echo $PROMOTION_RESULT | jq -e '.success == true' > /dev/null 2>&1; then
    echo -e "${GREEN}✅ 晋升申请创建成功${NC}"
    echo $PROMOTION_RESULT | jq '{id: .data.id, status: .data.status}'
else
    echo -e "${RED}❌ 晋升申请失败${NC}"
    echo $PROMOTION_RESULT | jq '{success, message}'
fi

echo -e "\n3️⃣ AI功能（验证接口可访问）"
AI_RESULT=$(curl -s -X POST "$BASE_URL/api/ai/generate" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "prompt": "测试",
        "context": "测试",
        "type": "summary"
    }')

if echo $AI_RESULT | jq -e '.message' | grep -q "Kimi API Key"; then
    echo -e "${GREEN}✅ AI接口正常（缺少API Key配置属于预期）${NC}"
    echo $AI_RESULT | jq '{success, message}'
else
    echo -e "${RED}❌ AI接口异常${NC}"
    echo $AI_RESULT | jq '.'
fi

echo -e "\n${BLUE}=== 验证完成 ===${NC}"
