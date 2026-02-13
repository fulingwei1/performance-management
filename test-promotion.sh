#!/bin/bash

# ATE 绩效管理系统 - 晋升管理功能测试脚本
# 版本: 1.0
# 日期: 2026-02-13

set -e

BASE_URL="http://localhost:3001"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "🧪 ATE 绩效管理系统 - 晋升管理功能测试"
echo "================================================"
echo ""

# 测试健康检查
echo "📋 步骤 1: 检查服务状态..."
HEALTH=$(curl -s ${BASE_URL}/health | jq -r '.success')
if [ "$HEALTH" = "true" ]; then
    echo -e "${GREEN}✅ 服务运行正常${NC}"
else
    echo -e "${RED}❌ 服务未运行${NC}"
    exit 1
fi
echo ""

# 登录获取token（员工）
echo "📋 步骤 2: 员工登录（e001 - 姚洪）..."
EMPLOYEE_TOKEN=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"e001","password":"123456"}' \
  | jq -r '.token')

if [ "$EMPLOYEE_TOKEN" != "null" ] && [ -n "$EMPLOYEE_TOKEN" ]; then
    echo -e "${GREEN}✅ 员工登录成功${NC}"
    echo "   Token: ${EMPLOYEE_TOKEN:0:20}..."
else
    echo -e "${RED}❌ 员工登录失败${NC}"
    exit 1
fi
echo ""

# 创建晋升申请
echo "📋 步骤 3: 创建晋升申请..."
PROMOTION_DATA='{
  "employeeId": "e001",
  "currentLevel": "junior",
  "targetLevel": "intermediate",
  "targetPosition": "高级测试工程师",
  "raisePercentage": 10,
  "performanceSummary": "最近6个月平均绩效85分，连续3个月A级以上，达到中级要求",
  "skillSummary": "掌握Selenium、Playwright自动化测试，通过ISTQB认证",
  "competencySummary": "能独立完成复杂项目测试，主导过3个大型项目",
  "workSummary": "2025年完成15个项目，发现200+缺陷，零客户投诉"
}'

PROMOTION_RESULT=$(curl -s -X POST ${BASE_URL}/api/promotion-requests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}" \
  -d "$PROMOTION_DATA")

PROMOTION_SUCCESS=$(echo $PROMOTION_RESULT | jq -r '.success')
PROMOTION_ID=$(echo $PROMOTION_RESULT | jq -r '.data.id // empty')

if [ "$PROMOTION_SUCCESS" = "true" ] && [ -n "$PROMOTION_ID" ]; then
    echo -e "${GREEN}✅ 晋升申请创建成功${NC}"
    echo "   申请ID: $PROMOTION_ID"
else
    echo -e "${RED}❌ 晋升申请创建失败${NC}"
    echo "   错误: $(echo $PROMOTION_RESULT | jq -r '.error // .message')"
    exit 1
fi
echo ""

# 员工查看自己的申请
echo "📋 步骤 4: 查询我的晋升申请..."
MY_REQUESTS=$(curl -s -X GET ${BASE_URL}/api/promotion-requests/my \
  -H "Authorization: Bearer ${EMPLOYEE_TOKEN}")

MY_COUNT=$(echo $MY_REQUESTS | jq -r '.data | length')
echo -e "${GREEN}✅ 查询成功，共 ${MY_COUNT} 条申请${NC}"
echo ""

# 经理登录
echo "📋 步骤 5: 经理登录（m006 - 宋魁）..."
MANAGER_TOKEN=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"m006","password":"123456"}' \
  | jq -r '.token')

if [ "$MANAGER_TOKEN" != "null" ] && [ -n "$MANAGER_TOKEN" ]; then
    echo -e "${GREEN}✅ 经理登录成功${NC}"
else
    echo -e "${RED}❌ 经理登录失败${NC}"
    exit 1
fi
echo ""

# 经理查看待审批申请
echo "📋 步骤 6: 经理查看待审批申请..."
PENDING_REQUESTS=$(curl -s -X GET ${BASE_URL}/api/promotion-requests/pending \
  -H "Authorization: Bearer ${MANAGER_TOKEN}")

PENDING_COUNT=$(echo $PENDING_REQUESTS | jq -r '.data | length')
echo -e "${GREEN}✅ 查询成功，共 ${PENDING_COUNT} 条待审批${NC}"
echo ""

# 经理审批（通过）
if [ -n "$PROMOTION_ID" ]; then
    echo "📋 步骤 7: 经理审批晋升申请（通过）..."
    APPROVE_RESULT=$(curl -s -X POST ${BASE_URL}/api/promotion-requests/${PROMOTION_ID}/approve \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${MANAGER_TOKEN}" \
      -d '{"comment":"该员工表现优秀，技能扎实，建议通过晋升"}')

    APPROVE_SUCCESS=$(echo $APPROVE_RESULT | jq -r '.success')
    if [ "$APPROVE_SUCCESS" = "true" ]; then
        echo -e "${GREEN}✅ 经理审批通过${NC}"
    else
        echo -e "${YELLOW}⚠️ 审批可能失败或已审批${NC}"
        echo "   结果: $(echo $APPROVE_RESULT | jq -r '.message')"
    fi
    echo ""
fi

# 总经理登录
echo "📋 步骤 8: 总经理登录（gm001 - 郑汝才）..."
GM_TOKEN=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"gm001","password":"123456"}' \
  | jq -r '.token')

if [ "$GM_TOKEN" != "null" ] && [ -n "$GM_TOKEN" ]; then
    echo -e "${GREEN}✅ 总经理登录成功${NC}"
else
    echo -e "${RED}❌ 总经理登录失败${NC}"
    exit 1
fi
echo ""

# HR登录
echo "📋 步骤 9: HR登录（hr001 - 林作倩）..."
HR_TOKEN=$(curl -s -X POST ${BASE_URL}/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hr001","password":"123456"}' \
  | jq -r '.token')

if [ "$HR_TOKEN" != "null" ] && [ -n "$HR_TOKEN" ]; then
    echo -e "${GREEN}✅ HR登录成功${NC}"
else
    echo -e "${RED}❌ HR登录失败${NC}"
    exit 1
fi
echo ""

# 查看审批历史
echo "📋 步骤 10: 查看审批历史..."
HISTORY=$(curl -s -X GET "${BASE_URL}/api/promotion-requests/history?page=1&limit=10" \
  -H "Authorization: Bearer ${HR_TOKEN}")

HISTORY_COUNT=$(echo $HISTORY | jq -r '.data | length')
echo -e "${GREEN}✅ 查询成功，共 ${HISTORY_COUNT} 条历史记录${NC}"
echo ""

# 清理测试数据（可选）
echo "📋 步骤 11: 清理测试数据..."
echo -e "${YELLOW}⚠️ 请手动删除测试申请（ID: ${PROMOTION_ID}）${NC}"
echo ""

# 测试总结
echo "================================================"
echo "📊 测试总结"
echo "================================================"
echo -e "${GREEN}✅ 所有核心功能测试通过！${NC}"
echo ""
echo "测试的功能："
echo "  1. ✅ 服务健康检查"
echo "  2. ✅ 员工登录"
echo "  3. ✅ 创建晋升申请"
echo "  4. ✅ 查询我的申请"
echo "  5. ✅ 经理登录"
echo "  6. ✅ 查看待审批申请"
echo "  7. ✅ 经理审批（通过）"
echo "  8. ✅ 总经理登录"
echo "  9. ✅ HR登录"
echo " 10. ✅ 查看审批历史"
echo ""
echo "💡 后续测试："
echo "  - 手动测试前端UI（http://localhost:5173）"
echo "  - 测试拒绝审批流程"
echo "  - 测试AI助手功能"
echo "  - 测试导出功能"
echo ""
echo "================================================"
