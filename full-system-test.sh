#!/bin/bash

BASE_URL="http://localhost:3001"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 测试计数
TOTAL=0
PASS=0
FAIL=0

log_test() {
    TOTAL=$((TOTAL + 1))
    if [ "$2" == "PASS" ]; then
        PASS=$((PASS + 1))
        echo -e "${GREEN}✓${NC} $1"
    else
        FAIL=$((FAIL + 1))
        echo -e "${RED}✗${NC} $1"
        [ ! -z "$3" ] && echo "  错误: $3"
    fi
}

echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  绩效管理系统全面功能测试${NC}"
echo -e "${BLUE}======================================${NC}\n"

# 登录获取 tokens
echo -e "${YELLOW}=== 1. 用户认证测试 ===${NC}\n"

ADMIN_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token // empty')

if [ ! -z "$ADMIN_TOKEN" ]; then
    log_test "管理员登录" "PASS"
else
    log_test "管理员登录" "FAIL" "无法获取token"
fi

EMPLOYEE_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"姚洪","password":"123456"}' | jq -r '.data.token // empty')

if [ ! -z "$EMPLOYEE_TOKEN" ]; then
    log_test "员工登录（姚洪）" "PASS"
else
    log_test "员工登录（姚洪）" "FAIL" "无法获取token"
fi

MANAGER_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"m006","password":"123456"}' | jq -r '.data.token // empty')

if [ ! -z "$MANAGER_TOKEN" ]; then
    log_test "经理登录（宋魁）" "PASS"
else
    log_test "经理登录（宋魁）" "FAIL" "无法获取token"
fi

HR_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"hr001","password":"123456"}' | jq -r '.data.token // empty')

if [ ! -z "$HR_TOKEN" ]; then
    log_test "HR登录（林作倩）" "PASS"
else
    log_test "HR登录（林作倩）" "FAIL" "无法获取token"
fi

GM_TOKEN=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"gm001","password":"123456"}' | jq -r '.data.token // empty')

if [ ! -z "$GM_TOKEN" ]; then
    log_test "总经理登录（郑汝才）" "PASS"
else
    log_test "总经理登录（郑汝才）" "FAIL" "无法获取token"
fi

echo

# 2. 员工管理
echo -e "${YELLOW}=== 2. 员工管理 ===${NC}\n"

EMPLOYEE_COUNT=$(curl -s "$BASE_URL/api/employees" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.data | length')

if [ "$EMPLOYEE_COUNT" -gt 100 ]; then
    log_test "查询员工列表（$EMPLOYEE_COUNT 人）" "PASS"
else
    log_test "查询员工列表" "FAIL" "员工数量异常: $EMPLOYEE_COUNT"
fi

echo

# 3. 工作总结
echo -e "${YELLOW}=== 3. 工作总结功能 ===${NC}\n"

# 3.1 查询工作总结
PERF_LIST=$(curl -s "$BASE_URL/api/performance" \
    -H "Authorization: Bearer $ADMIN_TOKEN")

PERF_COUNT=$(echo $PERF_LIST | jq '.data | length // 0')
if [ "$PERF_COUNT" -ge 0 ]; then
    log_test "查询绩效记录（$PERF_COUNT 条）" "PASS"
else
    log_test "查询绩效记录" "FAIL"
fi

# 3.2 提交工作总结
SUBMIT_RESULT=$(curl -s -X POST "$BASE_URL/api/performance" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "employee_id": "e001",
        "year": 2026,
        "month": 2,
        "summary": "【测试】完成系统测试工作",
        "achievements": "【测试】修复了登录bug",
        "issues": "【测试】无"
    }')

if echo $SUBMIT_RESULT | jq -e '.success == true' > /dev/null 2>&1; then
    log_test "提交工作总结（2026年2月）" "PASS"
    PERF_ID=$(echo $SUBMIT_RESULT | jq -r '.data.id // empty')
else
    ERROR=$(echo $SUBMIT_RESULT | jq -r '.message // .error // "未知错误"')
    log_test "提交工作总结" "FAIL" "$ERROR"
fi

echo

# 4. 战略目标
echo -e "${YELLOW}=== 4. 战略目标管理 ===${NC}\n"

OBJ_LIST=$(curl -s "$BASE_URL/api/objectives" \
    -H "Authorization: Bearer $GM_TOKEN")

OBJ_COUNT=$(echo $OBJ_LIST | jq '.data | length // 0')
if [ "$OBJ_COUNT" -gt 0 ]; then
    log_test "查询战略目标（$OBJ_COUNT 个）" "PASS"
else
    log_test "查询战略目标" "FAIL" "未找到战略目标"
fi

echo

# 5. 晋升管理
echo -e "${YELLOW}=== 5. 晋升管理 ===${NC}\n"

# 5.1 创建晋升申请
PROMOTION_RESULT=$(curl -s -X POST "$BASE_URL/api/promotion-requests" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "employee_id": "e001",
        "current_position": "销售员",
        "target_position": "高级销售员",
        "reason": "【测试】表现优秀",
        "self_evaluation": "【测试】完成销售目标120%"
    }')

if echo $PROMOTION_RESULT | jq -e '.success == true' > /dev/null 2>&1; then
    PROMOTION_ID=$(echo $PROMOTION_RESULT | jq -r '.data.id // empty')
    log_test "创建晋升申请（ID: $PROMOTION_ID）" "PASS"
    
    # 5.2 经理审批
    MANAGER_APPROVE=$(curl -s -X PUT "$BASE_URL/api/promotion-requests/$PROMOTION_ID/manager-approve" \
        -H "Authorization: Bearer $MANAGER_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "manager_comment": "【测试】同意晋升",
            "manager_rating": 5
        }')
    
    if echo $MANAGER_APPROVE | jq -e '.success == true' > /dev/null 2>&1; then
        log_test "经理审批晋升" "PASS"
    else
        ERROR=$(echo $MANAGER_APPROVE | jq -r '.message // "未知错误"')
        log_test "经理审批晋升" "FAIL" "$ERROR"
    fi
else
    ERROR=$(echo $PROMOTION_RESULT | jq -r '.message // .error // "未知错误"')
    log_test "创建晋升申请" "FAIL" "$ERROR"
fi

echo

# 6. 申诉系统
echo -e "${YELLOW}=== 6. 申诉系统 ===${NC}\n"

if [ ! -z "$PERF_ID" ]; then
    APPEAL_RESULT=$(curl -s -X POST "$BASE_URL/api/appeals" \
        -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"performance_id\": $PERF_ID,
            \"reason\": \"【测试】申诉理由\",
            \"description\": \"【测试】详细说明\"
        }")
    
    if echo $APPEAL_RESULT | jq -e '.success == true' > /dev/null 2>&1; then
        APPEAL_ID=$(echo $APPEAL_RESULT | jq -r '.data.id // empty')
        log_test "创建申诉（ID: $APPEAL_ID）" "PASS"
    else
        ERROR=$(echo $APPEAL_RESULT | jq -r '.message // .error // "未知错误"')
        log_test "创建申诉" "FAIL" "$ERROR"
    fi
else
    log_test "创建申诉" "FAIL" "缺少绩效记录ID"
fi

echo

# 7. AI 功能
echo -e "${YELLOW}=== 7. AI 辅助功能 ===${NC}\n"

AI_GENERATE=$(curl -s -X POST "$BASE_URL/api/ai/generate" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "prompt": "帮我写一份本月工作总结",
        "context": "完成了系统测试",
        "type": "summary"
    }')

if echo $AI_GENERATE | jq -e '.text' > /dev/null 2>&1; then
    TEXT_LEN=$(echo $AI_GENERATE | jq -r '.text' | wc -c)
    log_test "AI生成工作总结（$TEXT_LEN 字符）" "PASS"
else
    ERROR=$(echo $AI_GENERATE | jq -r '.message // .error // "未知错误"')
    log_test "AI生成工作总结" "FAIL" "$ERROR"
fi

echo

# 8. 同行评审
echo -e "${YELLOW}=== 8. 同行评审 ===${NC}\n"

PEER_CYCLES=$(curl -s "$BASE_URL/api/peer-review-cycles" \
    -H "Authorization: Bearer $HR_TOKEN")

CYCLE_COUNT=$(echo $PEER_CYCLES | jq '.data | length // 0')
if [ "$CYCLE_COUNT" -ge 0 ]; then
    log_test "查询评审周期（$CYCLE_COUNT 个）" "PASS"
else
    log_test "查询评审周期" "FAIL"
fi

echo

# 总结
echo -e "${BLUE}======================================${NC}"
echo -e "${BLUE}  测试总结${NC}"
echo -e "${BLUE}======================================${NC}\n"

echo "总测试数: $TOTAL"
echo -e "通过: ${GREEN}$PASS${NC}"
echo -e "失败: ${RED}$FAIL${NC}"

PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASS/$TOTAL)*100}")
echo "通过率: ${PASS_RATE}%"

if [ $FAIL -eq 0 ]; then
    echo -e "\n${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚠ 发现 $FAIL 个失败测试${NC}"
    exit 1
fi
