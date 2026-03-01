#!/bin/bash

# Phase 2 - 360度互评 API 测试脚本
# 创建时间: 2026-03-01
# 用途: 快速验证互评功能API是否正常

BASE_URL="http://localhost:3001/api"
CONTENT_TYPE="Content-Type: application/json"

echo "=========================================="
echo "360度互评系统 API 测试"
echo "=========================================="
echo ""

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 测试计数器
TESTS_PASSED=0
TESTS_FAILED=0

# 测试函数
test_api() {
    local test_name=$1
    local method=$2
    local endpoint=$3
    local data=$4
    
    echo -e "${YELLOW}测试: $test_name${NC}"
    echo "请求: $method $endpoint"
    
    if [ -z "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "$CONTENT_TYPE")
    else
        response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
            -H "$CONTENT_TYPE" \
            -d "$data")
    fi
    
    # 分离响应体和状态码
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n-1)
    
    # 检查状态码
    if [[ $http_code =~ ^(200|201)$ ]]; then
        echo -e "${GREEN}✓ 通过${NC} (HTTP $http_code)"
        echo "响应: $body" | jq '.' 2>/dev/null || echo "$body"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ 失败${NC} (HTTP $http_code)"
        echo "响应: $body"
        ((TESTS_FAILED++))
    fi
    
    echo ""
}

# ========================================
# Test 1: 健康检查
# ========================================
test_api "健康检查" "GET" "/health" ""

# ========================================
# Test 2: 创建互评周期
# ========================================
CYCLE_DATA='{
  "name": "2026-Q1同事互评",
  "description": "第一季度360度互评测试",
  "start_date": "2026-03-03",
  "end_date": "2026-03-15",
  "review_type": "peer",
  "is_anonymous": false
}'

test_api "创建互评周期" "POST" "/peer-reviews/cycles" "$CYCLE_DATA"

# ========================================
# Test 3: 获取互评周期列表
# ========================================
test_api "获取互评周期列表" "GET" "/peer-reviews/cycles" ""

# ========================================
# Test 4: 创建评价关系
# ========================================
RELATIONSHIPS_DATA='{
  "cycle_id": 1,
  "relationships": [
    {
      "reviewer_id": 1,
      "reviewee_id": 2,
      "relationship_type": "peer",
      "weight": 1.0
    },
    {
      "reviewer_id": 2,
      "reviewee_id": 1,
      "relationship_type": "peer",
      "weight": 1.0
    },
    {
      "reviewer_id": 3,
      "reviewee_id": 1,
      "relationship_type": "peer",
      "weight": 1.0
    }
  ]
}'

test_api "批量创建评价关系" "POST" "/peer-reviews/relationships" "$RELATIONSHIPS_DATA"

# ========================================
# Test 5: 获取评价关系
# ========================================
test_api "获取评价关系" "GET" "/peer-reviews/relationships/1" ""

# ========================================
# Test 6: 提交互评
# ========================================
REVIEW_DATA='{
  "relationship_id": 1,
  "cycle_id": 1,
  "reviewer_id": 1,
  "reviewee_id": 2,
  "teamwork_score": 4.5,
  "communication_score": 4.0,
  "professional_score": 4.8,
  "responsibility_score": 4.2,
  "innovation_score": 4.5,
  "strengths": "技术能力强，团队协作好",
  "improvements": "可以提高沟通频率",
  "overall_comment": "优秀的团队成员",
  "is_anonymous": false
}'

test_api "提交互评" "POST" "/peer-reviews/reviews" "$REVIEW_DATA"

# ========================================
# Test 7: 获取互评记录
# ========================================
test_api "获取互评记录" "GET" "/peer-reviews/reviews/1" ""

# ========================================
# Test 8: 获取互评统计
# ========================================
test_api "获取互评统计" "GET" "/peer-reviews/statistics/1" ""

# ========================================
# 测试总结
# ========================================
echo "=========================================="
echo "测试总结"
echo "=========================================="
echo -e "通过: ${GREEN}$TESTS_PASSED${NC}"
echo -e "失败: ${RED}$TESTS_FAILED${NC}"
echo -e "总计: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ 所有测试通过！${NC}"
    exit 0
else
    echo -e "\n${RED}✗ 有 $TESTS_FAILED 个测试失败${NC}"
    exit 1
fi
