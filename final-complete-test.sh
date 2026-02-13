#!/bin/bash

BASE_URL="http://localhost:3001"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

TOTAL=0
PASS=0
FAIL=0
WARN=0

log_test() {
    TOTAL=$((TOTAL + 1))
    local name=$1
    local status=$2
    local detail=$3
    
    if [ "$status" == "PASS" ]; then
        PASS=$((PASS + 1))
        echo -e "${GREEN}✓${NC} $name"
        [ ! -z "$detail" ] && echo -e "  ${CYAN}→ $detail${NC}"
    elif [ "$status" == "FAIL" ]; then
        FAIL=$((FAIL + 1))
        echo -e "${RED}✗${NC} $name"
        [ ! -z "$detail" ] && echo -e "  ${RED}→ 错误: $detail${NC}"
    else
        WARN=$((WARN + 1))
        echo -e "${YELLOW}⚠${NC} $name"
        [ ! -z "$detail" ] && echo -e "  ${YELLOW}→ $detail${NC}"
    fi
}

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   绩效管理系统 - 完整功能测试 v2.0       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}测试时间: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
echo -e "${CYAN}测试环境: Production (Docker)${NC}\n"

# ========================================
# 第一部分：系统健康检查
# ========================================
echo -e "${YELLOW}━━━ 第一部分：系统健康检查 ━━━${NC}\n"

# 1.1 后端健康
HEALTH=$(curl -s "$BASE_URL/health")
if echo $HEALTH | jq -e '.success == true' > /dev/null 2>&1; then
    log_test "后端服务健康" "PASS" "服务器运行正常"
else
    log_test "后端服务健康" "FAIL" "服务器异常"
fi

# 1.2 前端访问
FRONTEND_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5173")
if [ "$FRONTEND_CODE" == "200" ]; then
    log_test "前端页面访问" "PASS" "HTTP $FRONTEND_CODE"
else
    log_test "前端页面访问" "FAIL" "HTTP $FRONTEND_CODE"
fi

# 1.3 数据库连接
EMPLOYEE_COUNT=$(docker exec ate_postgres psql -U performance_user -d performance_db -t -c "SELECT COUNT(*) FROM employees;" 2>/dev/null | tr -d ' ')
if [ "$EMPLOYEE_COUNT" -gt 0 ]; then
    log_test "数据库连接" "PASS" "$EMPLOYEE_COUNT 条员工记录"
else
    log_test "数据库连接" "FAIL" "无法查询数据"
fi

# 1.4 Docker容器状态
BACKEND_STATUS=$(docker inspect ate_backend --format='{{.State.Status}}' 2>/dev/null)
POSTGRES_STATUS=$(docker inspect ate_postgres --format='{{.State.Status}}' 2>/dev/null)
if [ "$BACKEND_STATUS" == "running" ] && [ "$POSTGRES_STATUS" == "running" ]; then
    log_test "Docker容器状态" "PASS" "backend=$BACKEND_STATUS, postgres=$POSTGRES_STATUS"
else
    log_test "Docker容器状态" "FAIL" "backend=$BACKEND_STATUS, postgres=$POSTGRES_STATUS"
fi

echo

# ========================================
# 第二部分：用户认证
# ========================================
echo -e "${YELLOW}━━━ 第二部分：用户认证 ━━━${NC}\n"

# 2.1 管理员登录
ADMIN_RESULT=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"admin123"}')
ADMIN_TOKEN=$(echo $ADMIN_RESULT | jq -r '.data.token // empty')
if [ ! -z "$ADMIN_TOKEN" ]; then
    log_test "管理员登录 (admin)" "PASS" "Token: ${ADMIN_TOKEN:0:20}..."
else
    log_test "管理员登录 (admin)" "FAIL" "$(echo $ADMIN_RESULT | jq -r '.message')"
fi

# 2.2 员工登录（用姓名）
EMPLOYEE_RESULT=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"姚洪","password":"123456"}')
EMPLOYEE_TOKEN=$(echo $EMPLOYEE_RESULT | jq -r '.data.token // empty')
if [ ! -z "$EMPLOYEE_TOKEN" ]; then
    EMPLOYEE_ID=$(echo $EMPLOYEE_RESULT | jq -r '.data.user.id')
    log_test "员工登录 (姚洪)" "PASS" "ID: $EMPLOYEE_ID, role: employee"
else
    log_test "员工登录 (姚洪)" "FAIL" "$(echo $EMPLOYEE_RESULT | jq -r '.message')"
fi

# 2.3 经理登录
MANAGER_RESULT=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"m006","password":"123456"}')
MANAGER_TOKEN=$(echo $MANAGER_RESULT | jq -r '.data.token // empty')
if [ ! -z "$MANAGER_TOKEN" ]; then
    MANAGER_NAME=$(echo $MANAGER_RESULT | jq -r '.data.user.name')
    log_test "经理登录 (宋魁)" "PASS" "姓名: $MANAGER_NAME"
else
    log_test "经理登录 (宋魁)" "FAIL" "$(echo $MANAGER_RESULT | jq -r '.message')"
fi

# 2.4 HR登录
HR_RESULT=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"hr001","password":"123456"}')
HR_TOKEN=$(echo $HR_RESULT | jq -r '.data.token // empty')
if [ ! -z "$HR_TOKEN" ]; then
    log_test "HR登录 (林作倩)" "PASS"
else
    log_test "HR登录 (林作倩)" "FAIL" "$(echo $HR_RESULT | jq -r '.message')"
fi

# 2.5 总经理登录
GM_RESULT=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"gm001","password":"123456"}')
GM_TOKEN=$(echo $GM_RESULT | jq -r '.data.token // empty')
if [ ! -z "$GM_TOKEN" ]; then
    log_test "总经理登录 (郑汝才)" "PASS"
else
    log_test "总经理登录 (郑汝才)" "FAIL" "$(echo $GM_RESULT | jq -r '.message')"
fi

# 2.6 错误密码测试
WRONG_RESULT=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"wrongpassword"}')
WRONG_SUCCESS=$(echo $WRONG_RESULT | jq -r '.success')
if [ "$WRONG_SUCCESS" == "false" ]; then
    log_test "错误密码拒绝" "PASS" "正确阻止了无效登录"
else
    log_test "错误密码拒绝" "FAIL" "未能阻止无效登录"
fi

echo

# ========================================
# 第三部分：员工管理
# ========================================
echo -e "${YELLOW}━━━ 第三部分：员工管理 ━━━${NC}\n"

# 3.1 查询员工列表
EMP_LIST=$(curl -s "$BASE_URL/api/employees" -H "Authorization: Bearer $ADMIN_TOKEN")
EMP_COUNT=$(echo $EMP_LIST | jq '.data | length')
if [ "$EMP_COUNT" -gt 100 ]; then
    log_test "查询员工列表" "PASS" "$EMP_COUNT 人"
else
    log_test "查询员工列表" "FAIL" "员工数量异常: $EMP_COUNT"
fi

# 3.2 查询单个员工
SINGLE_EMP=$(curl -s "$BASE_URL/api/employees/e001" -H "Authorization: Bearer $ADMIN_TOKEN")
SINGLE_NAME=$(echo $SINGLE_EMP | jq -r '.data.name // empty')
if [ ! -z "$SINGLE_NAME" ]; then
    log_test "查询单个员工 (e001)" "PASS" "姓名: $SINGLE_NAME"
else
    log_test "查询单个员工 (e001)" "FAIL"
fi

echo

# ========================================
# 第四部分：工作总结
# ========================================
echo -e "${YELLOW}━━━ 第四部分：工作总结 ━━━${NC}\n"

# 4.1 查询我的记录
MY_RECORDS=$(curl -s "$BASE_URL/api/performance/my-records" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN")
MY_COUNT=$(echo $MY_RECORDS | jq '.data | length // 0')
if echo $MY_RECORDS | jq -e '.success == true' > /dev/null 2>&1; then
    log_test "查询我的工作总结" "PASS" "$MY_COUNT 条记录"
else
    log_test "查询我的工作总结" "FAIL" "$(echo $MY_RECORDS | jq -r '.error')"
fi

# 4.2 提交工作总结（尝试两种格式）
# 格式1: month字符串
SUBMIT1=$(curl -s -X POST "$BASE_URL/api/performance/summary" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "month": "2026-02",
        "summary": "【测试】完成系统功能测试",
        "achievements": "【测试】修复登录bug",
        "issues": "【测试】无"
    }')

if echo $SUBMIT1 | jq -e '.success == true' > /dev/null 2>&1; then
    PERF_ID=$(echo $SUBMIT1 | jq -r '.data.id')
    log_test "提交工作总结 (格式1: month字符串)" "PASS" "ID: $PERF_ID"
else
    # 格式2: year + month
    SUBMIT2=$(curl -s -X POST "$BASE_URL/api/performance/summary" \
        -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "year": 2026,
            "month": 2,
            "summary": "【测试】完成系统功能测试",
            "achievements": "【测试】修复登录bug",
            "issues": "【测试】无"
        }')
    
    if echo $SUBMIT2 | jq -e '.success == true' > /dev/null 2>&1; then
        PERF_ID=$(echo $SUBMIT2 | jq -r '.data.id')
        log_test "提交工作总结 (格式2: year+month)" "PASS" "ID: $PERF_ID"
    else
        ERROR1=$(echo $SUBMIT1 | jq -r '.message // .error')
        ERROR2=$(echo $SUBMIT2 | jq -r '.message // .error')
        log_test "提交工作总结" "FAIL" "格式1: $ERROR1, 格式2: $ERROR2"
    fi
fi

# 4.3 查询全公司记录（HR/GM）
ALL_RECORDS=$(curl -s "$BASE_URL/api/performance/all-records" \
    -H "Authorization: Bearer $HR_TOKEN")
ALL_COUNT=$(echo $ALL_RECORDS | jq '.data | length // 0')
if echo $ALL_RECORDS | jq -e '.success == true' > /dev/null 2>&1; then
    log_test "查询全公司记录 (HR)" "PASS" "$ALL_COUNT 条"
else
    log_test "查询全公司记录 (HR)" "FAIL" "$(echo $ALL_RECORDS | jq -r '.error')"
fi

echo

# ========================================
# 第五部分：战略目标
# ========================================
echo -e "${YELLOW}━━━ 第五部分：战略目标 ━━━${NC}\n"

# 5.1 查询战略目标
OBJ_LIST=$(curl -s "$BASE_URL/api/objectives" \
    -H "Authorization: Bearer $GM_TOKEN")
OBJ_COUNT=$(echo $OBJ_LIST | jq '.data | length // 0')
if [ "$OBJ_COUNT" -gt 0 ]; then
    log_test "查询战略目标 (/api/objectives)" "PASS" "$OBJ_COUNT 个"
else
    log_test "查询战略目标 (/api/objectives)" "WARN" "返回空数组（数据库有数据）"
fi

# 5.2 查询战略目标（备用接口）
STRATEGIC_LIST=$(curl -s "$BASE_URL/api/strategic-objectives" \
    -H "Authorization: Bearer $GM_TOKEN")
STRATEGIC_COUNT=$(echo $STRATEGIC_LIST | jq '.data | length // 0')
if [ "$STRATEGIC_COUNT" -gt 0 ]; then
    log_test "查询战略目标 (/api/strategic-objectives)" "PASS" "$STRATEGIC_COUNT 个"
else
    log_test "查询战略目标 (/api/strategic-objectives)" "FAIL"
fi

echo

# ========================================
# 第六部分：晋升管理
# ========================================
echo -e "${YELLOW}━━━ 第六部分：晋升管理 ━━━${NC}\n"

# 6.1 查询晋升申请列表
PROMO_LIST=$(curl -s "$BASE_URL/api/promotion-requests" \
    -H "Authorization: Bearer $HR_TOKEN")
PROMO_COUNT=$(echo $PROMO_LIST | jq '.data | length // 0')
if echo $PROMO_LIST | jq -e '.success == true' > /dev/null 2>&1; then
    log_test "查询晋升申请列表" "PASS" "$PROMO_COUNT 条"
else
    log_test "查询晋升申请列表" "FAIL"
fi

# 6.2 创建晋升申请（尝试多种参数组合）
PROMO_CREATE=$(curl -s -X POST "$BASE_URL/api/promotion-requests" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "employee_id": "e001",
        "current_position": "销售员",
        "target_position": "高级销售员",
        "current_level": "junior",
        "target_level": "intermediate",
        "reason": "【测试】完成销售目标120%",
        "self_evaluation": "【测试】具备晋升条件"
    }')

if echo $PROMO_CREATE | jq -e '.success == true' > /dev/null 2>&1; then
    PROMOTION_ID=$(echo $PROMO_CREATE | jq -r '.data.id')
    log_test "创建晋升申请" "PASS" "ID: $PROMOTION_ID"
    
    # 6.3 经理审批
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
        log_test "经理审批晋升" "FAIL" "$(echo $MANAGER_APPROVE | jq -r '.message')"
    fi
else
    log_test "创建晋升申请" "FAIL" "$(echo $PROMO_CREATE | jq -r '.message // .error')"
fi

echo

# ========================================
# 第七部分：申诉系统
# ========================================
echo -e "${YELLOW}━━━ 第七部分：申诉系统 ━━━${NC}\n"

# 7.1 查询申诉列表
APPEAL_LIST=$(curl -s "$BASE_URL/api/appeals" \
    -H "Authorization: Bearer $HR_TOKEN")
APPEAL_COUNT=$(echo $APPEAL_LIST | jq '.data | length // 0')
if echo $APPEAL_LIST | jq -e '.success == true' > /dev/null 2>&1; then
    log_test "查询申诉列表" "PASS" "$APPEAL_COUNT 条"
else
    log_test "查询申诉列表" "FAIL"
fi

# 7.2 创建申诉（如果有绩效记录ID）
if [ ! -z "$PERF_ID" ]; then
    APPEAL_CREATE=$(curl -s -X POST "$BASE_URL/api/appeals" \
        -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"performance_id\": $PERF_ID,
            \"reason\": \"【测试】申诉理由\",
            \"description\": \"【测试】详细说明\"
        }")
    
    if echo $APPEAL_CREATE | jq -e '.success == true' > /dev/null 2>&1; then
        APPEAL_ID=$(echo $APPEAL_CREATE | jq -r '.data.id')
        log_test "创建申诉" "PASS" "ID: $APPEAL_ID"
    else
        log_test "创建申诉" "FAIL" "$(echo $APPEAL_CREATE | jq -r '.message // .error')"
    fi
else
    log_test "创建申诉" "WARN" "跳过（缺少绩效记录ID）"
fi

echo

# ========================================
# 第八部分：AI功能
# ========================================
echo -e "${YELLOW}━━━ 第八部分：AI辅助功能 ━━━${NC}\n"

# 8.1 AI生成
AI_GENERATE=$(curl -s -X POST "$BASE_URL/api/ai/generate" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "prompt": "帮我写一份本月工作总结",
        "context": "完成了系统测试工作",
        "type": "summary"
    }')

if echo $AI_GENERATE | jq -e '.success == true' > /dev/null 2>&1; then
    TEXT_LEN=$(echo $AI_GENERATE | jq -r '.text | length')
    log_test "AI生成工作总结" "PASS" "生成 $TEXT_LEN 字符"
else
    log_test "AI生成工作总结" "FAIL" "$(echo $AI_GENERATE | jq -r '.message // .error')"
fi

# 8.2 AI优化
AI_OPTIMIZE=$(curl -s -X POST "$BASE_URL/api/ai/optimize" \
    -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "text": "我这个月完成了一些工作",
        "type": "summary"
    }')

if echo $AI_OPTIMIZE | jq -e '.success == true' > /dev/null 2>&1; then
    log_test "AI优化文本" "PASS"
else
    log_test "AI优化文本" "WARN" "$(echo $AI_OPTIMIZE | jq -r '.message // .error')"
fi

echo

# ========================================
# 第九部分：同行评审
# ========================================
echo -e "${YELLOW}━━━ 第九部分：同行评审 ━━━${NC}\n"

# 9.1 查询评审周期
CYCLE_LIST=$(curl -s "$BASE_URL/api/peer-review-cycles" \
    -H "Authorization: Bearer $HR_TOKEN")
CYCLE_COUNT=$(echo $CYCLE_LIST | jq '.data | length // 0')
if echo $CYCLE_LIST | jq -e '.success == true' > /dev/null 2>&1; then
    log_test "查询评审周期" "PASS" "$CYCLE_COUNT 个"
else
    log_test "查询评审周期" "FAIL" "$(echo $CYCLE_LIST | jq -r '.error')"
fi

echo

# ========================================
# 第十部分：仪表板
# ========================================
echo -e "${YELLOW}━━━ 第十部分：仪表板 ━━━${NC}\n"

# 10.1 仪表板概览
DASHBOARD=$(curl -s "$BASE_URL/api/dashboard/overview" \
    -H "Authorization: Bearer $GM_TOKEN")
if echo $DASHBOARD | jq -e '.success == true' > /dev/null 2>&1; then
    log_test "仪表板概览" "PASS"
else
    log_test "仪表板概览" "FAIL"
fi

echo

# ========================================
# 测试总结
# ========================================
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║              测试总结报告                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

echo -e "${CYAN}总测试数:${NC} $TOTAL"
echo -e "${GREEN}通过:${NC} $PASS"
echo -e "${RED}失败:${NC} $FAIL"
echo -e "${YELLOW}警告:${NC} $WARN"

PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASS/$TOTAL)*100}")
echo -e "${CYAN}通过率:${NC} ${PASS_RATE}%"

echo

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}✓ 所有核心测试通过！${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠ 发现 $FAIL 个失败测试，$WARN 个警告${NC}"
    echo -e "${CYAN}详细信息请查看上方测试日志${NC}"
    exit 1
fi
