#!/bin/bash

BASE_URL="http://localhost:3001"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}==================================${NC}"
echo -e "${BLUE}  绩效管理系统 - 正确接口测试${NC}"
echo -e "${BLUE}==================================${NC}\n"

# 登录获取 tokens
ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

EMPLOYEE_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"姚洪","password":"123456"}' | jq -r '.data.token')

MANAGER_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"m006","password":"123456"}' | jq -r '.data.token')

HR_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"hr001","password":"123456"}' | jq -r '.data.token')

GM_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"gm001","password":"123456"}' | jq -r '.data.token')

echo -e "${YELLOW}=== 1. 工作总结（正确接口）===${NC}\n"

echo "1.1 查询我的记录（GET /api/performance/my-records）"
curl -s "$BASE_URL/api/performance/my-records" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" | jq '{success, count: (.data | length)}'

echo -e "\n1.2 提交工作总结（POST /api/performance/summary）"
SUMMARY_RESULT=$(curl -s -X POST "$BASE_URL/api/performance/summary" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "year": 2026,
        "month": 2,
        "summary": "本月完成系统功能测试",
        "achievements": "修复了登录bug，优化了登录限流",
        "issues": "无"
    }')

echo $SUMMARY_RESULT | jq '{success, message, id: .data.id}'
PERF_ID=$(echo $SUMMARY_RESULT | jq -r '.data.id // empty')

echo -e "\n${YELLOW}=== 2. 战略目标 ===${NC}\n"

echo "2.1 查询战略目标（GET /api/objectives）"
OBJ_RESULT=$(curl -s "$BASE_URL/api/objectives" \
    -H "Authorization: Bearer $GM_TOKEN")
echo $OBJ_RESULT | jq '{success, count: (.data | length), sample: (.data[0] | {id, title, category} // null)}'

echo -e "\n2.2 查询所有战略目标（GET /api/strategic-objectives）"
STRATEGIC_RESULT=$(curl -s "$BASE_URL/api/strategic-objectives" \
    -H "Authorization: Bearer $GM_TOKEN")
echo $STRATEGIC_RESULT | jq '{success, count: (.data | length), sample: (.data[0] | {id, title} // null)}'

echo -e "\n${YELLOW}=== 3. 晋升管理 ===${NC}\n"

echo "3.1 创建晋升申请（带必填字段）"
PROMOTION_RESULT=$(curl -s -X POST "$BASE_URL/api/promotion-requests" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "employee_id": "e001",
        "current_position": "销售员",
        "target_position": "高级销售员",
        "current_level": "junior",
        "target_level": "intermediate",
        "reason": "完成销售目标120%，客户满意度高",
        "self_evaluation": "具备高级销售员的专业能力和业绩表现"
    }')
echo $PROMOTION_RESULT | jq '{success, message, id: .data.id}'
PROMOTION_ID=$(echo $PROMOTION_RESULT | jq -r '.data.id // empty')

if [ ! -z "$PROMOTION_ID" ]; then
    echo -e "\n3.2 经理审批晋升"
    curl -s -X PUT "$BASE_URL/api/promotion-requests/$PROMOTION_ID/manager-approve" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "manager_comment": "表现优秀，同意晋升",
            "manager_rating": 5
        }' | jq '{success, message}'
fi

echo -e "\n${YELLOW}=== 4. 申诉系统 ===${NC}\n"

if [ ! -z "$PERF_ID" ]; then
    echo "4.1 创建申诉"
    APPEAL_RESULT=$(curl -s -X POST "$BASE_URL/api/appeals" \
        -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"performance_id\": $PERF_ID,
            \"reason\": \"认为评分不合理\",
            \"description\": \"本月工作量大，应该得到更高评分\"
        }")
    echo $APPEAL_RESULT | jq '{success, message, id: .data.id}'
else
    echo "⚠️  无法测试申诉（缺少绩效记录ID）"
fi

echo -e "\n${YELLOW}=== 5. AI 辅助功能 ===${NC}\n"

echo "5.1 AI生成工作总结"
AI_RESULT=$(curl -s -X POST "$BASE_URL/api/ai/generate" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "prompt": "帮我写一份本月工作总结",
        "context": "完成了绩效管理系统的功能测试和登录bug修复",
        "type": "summary"
    }')

AI_SUCCESS=$(echo $AI_RESULT | jq -r '.success // false')
if [ "$AI_SUCCESS" == "true" ]; then
    TEXT_LEN=$(echo $AI_RESULT | jq -r '.text | length')
    echo -e "${GREEN}✓${NC} AI生成成功（$TEXT_LEN 字符）"
    echo $AI_RESULT | jq -r '.text' | head -c 200
    echo "..."
else
    echo -e "${RED}✗${NC} AI生成失败"
    echo $AI_RESULT | jq '{success, error, message}'
fi

echo -e "\n${YELLOW}=== 6. 同行评审 ===${NC}\n"

echo "6.1 查询评审周期"
curl -s "$BASE_URL/api/peer-review-cycles" \
    -H "Authorization: Bearer $HR_TOKEN" | jq '{success, count: (.data | length)}'

echo -e "\n${YELLOW}=== 7. 仪表板数据 ===${NC}\n"

echo "7.1 查询仪表板数据"
curl -s "$BASE_URL/api/dashboard/overview" \
    -H "Authorization: Bearer $GM_TOKEN" | jq '{success, data: .data | {employeeCount, departmentCount}}'

echo -e "\n${BLUE}==================================${NC}"
echo -e "${BLUE}  测试完成${NC}"
echo -e "${BLUE}==================================${NC}"
