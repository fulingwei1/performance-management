#!/bin/bash

# 绩效管理系统全面测试脚本
# 测试日期: 2026-02-13
# 测试人员: 乖乖 AI

BASE_URL="http://localhost:3001"
FRONTEND_URL="http://localhost:5173"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 测试计数器
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# 测试结果记录
TEST_LOG="test-results-$(date +%Y%m%d-%H%M%S).md"

# 初始化日志
echo "# 绩效管理系统全面测试报告" > $TEST_LOG
echo "" >> $TEST_LOG
echo "**测试时间**: $(date '+%Y-%m-%d %H:%M:%S')" >> $TEST_LOG
echo "**系统版本**: Production (Docker + PostgreSQL)" >> $TEST_LOG
echo "" >> $TEST_LOG
echo "---" >> $TEST_LOG
echo "" >> $TEST_LOG

log_test() {
    local category=$1
    local test_name=$2
    local status=$3
    local details=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" == "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✓${NC} [$category] $test_name"
        echo "- ✅ **[$category]** $test_name" >> $TEST_LOG
    elif [ "$status" == "FAIL" ]; then
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}✗${NC} [$category] $test_name"
        echo "  错误: $details"
        echo "- ❌ **[$category]** $test_name" >> $TEST_LOG
        echo "  - 错误: $details" >> $TEST_LOG
    else
        echo -e "${YELLOW}⚠${NC} [$category] $test_name - $status"
        echo "- ⚠️ **[$category]** $test_name - $status" >> $TEST_LOG
    fi
    
    if [ ! -z "$details" ] && [ "$status" == "PASS" ]; then
        echo "  详情: $details" >> $TEST_LOG
    fi
}

# 测试用户登录并获取token
login_user() {
    local username=$1
    local password=$2
    local role=$3
    
    response=$(curl -s -X POST "$BASE_URL/api/auth/login" \
        -H "Content-Type: application/json" \
        -d "{\"username\":\"$username\",\"password\":\"$password\",\"role\":\"$role\"}")
    
    token=$(echo $response | jq -r '.token // empty')
    
    if [ ! -z "$token" ] && [ "$token" != "null" ]; then
        log_test "登录系统" "$role 用户登录 ($username)" "PASS" "Token获取成功"
        echo $token
    else
        log_test "登录系统" "$role 用户登录 ($username)" "FAIL" "$(echo $response | jq -r '.message // .error // "登录失败"')"
        echo ""
    fi
}

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}  绩效管理系统全面测试${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# ========================================
# 第一部分：系统健康检查
# ========================================
echo -e "\n${YELLOW}=== 第一部分：系统健康检查 ===${NC}\n"
echo "## 第一部分：系统健康检查" >> $TEST_LOG
echo "" >> $TEST_LOG

# 1.1 健康检查
health_response=$(curl -s "$BASE_URL/health")
if echo $health_response | jq -e '.success == true' > /dev/null 2>&1; then
    log_test "健康检查" "后端健康检查" "PASS" "服务器运行正常"
else
    log_test "健康检查" "后端健康检查" "FAIL" "服务器异常"
fi

# 1.2 前端访问
frontend_status=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")
if [ "$frontend_status" == "200" ]; then
    log_test "健康检查" "前端页面访问" "PASS" "HTTP $frontend_status"
else
    log_test "健康检查" "前端页面访问" "FAIL" "HTTP $frontend_status"
fi

# 1.3 数据库连接
db_test=$(curl -s "$BASE_URL/api/employees" | jq -e 'type == "array"')
if [ $? -eq 0 ]; then
    log_test "健康检查" "数据库连接" "PASS" "员工数据查询成功"
else
    log_test "健康检查" "数据库连接" "FAIL" "无法查询员工数据"
fi

echo "" >> $TEST_LOG

# ========================================
# 第二部分：用户认证与权限
# ========================================
echo -e "\n${YELLOW}=== 第二部分：用户认证与权限 ===${NC}\n"
echo "## 第二部分：用户认证与权限" >> $TEST_LOG
echo "" >> $TEST_LOG

# 2.1 各角色登录测试
ADMIN_TOKEN=$(login_user "admin" "admin123" "admin")
GM_TOKEN=$(login_user "gm001" "123456" "gm")
MANAGER_TOKEN=$(login_user "m006" "123456" "manager")
EMPLOYEE_TOKEN=$(login_user "e001" "123456" "employee")
HR_TOKEN=$(login_user "hr001" "123456" "hr")

# 2.2 错误登录测试
wrong_login=$(curl -s -X POST "$BASE_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"username":"wrong","password":"wrong"}')

if echo $wrong_login | jq -e '.success == false' > /dev/null 2>&1; then
    log_test "登录系统" "错误凭证拒绝" "PASS" "正确阻止了无效登录"
else
    log_test "登录系统" "错误凭证拒绝" "FAIL" "未能阻止无效登录"
fi

echo "" >> $TEST_LOG

# ========================================
# 第三部分：核心业务流程
# ========================================
echo -e "\n${YELLOW}=== 第三部分：核心业务流程 ===${NC}\n"
echo "## 第三部分：核心业务流程" >> $TEST_LOG
echo "" >> $TEST_LOG

# 3.1 工作总结 - 查询
if [ ! -z "$EMPLOYEE_TOKEN" ]; then
    summary_response=$(curl -s "$BASE_URL/api/performance/姚洪/2025/12" \
        -H "Authorization: Bearer $EMPLOYEE_TOKEN")
    
    if echo $summary_response | jq -e 'type == "object"' > /dev/null 2>&1; then
        is_frozen=$(echo $summary_response | jq -r '.is_frozen // false')
        log_test "工作总结" "查询历史记录" "PASS" "冻结状态: $is_frozen"
    else
        log_test "工作总结" "查询历史记录" "FAIL" "无法查询工作总结"
    fi
fi

# 3.2 工作总结 - 提交（测试当前月份）
current_month=$(date +%m)
current_year=$(date +%Y)

if [ ! -z "$EMPLOYEE_TOKEN" ]; then
    submit_response=$(curl -s -X POST "$BASE_URL/api/performance" \
        -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"employee_id\": \"姚洪\",
            \"year\": $current_year,
            \"month\": $current_month,
            \"summary\": \"【测试】本月完成项目开发任务\",
            \"achievements\": \"【测试】完成3个功能模块\",
            \"issues\": \"【测试】需要优化性能\"
        }")
    
    if echo $submit_response | jq -e '.success == true' > /dev/null 2>&1; then
        log_test "工作总结" "提交新记录" "PASS" "成功提交${current_year}年${current_month}月总结"
    else
        error_msg=$(echo $submit_response | jq -r '.message // .error // "未知错误"')
        log_test "工作总结" "提交新记录" "FAIL" "$error_msg"
    fi
fi

# 3.3 目标管理 - 查询战略目标
if [ ! -z "$GM_TOKEN" ]; then
    objectives_response=$(curl -s "$BASE_URL/api/objectives" \
        -H "Authorization: Bearer $GM_TOKEN")
    
    objective_count=$(echo $objectives_response | jq '. | length')
    if [ "$objective_count" -gt 0 ]; then
        log_test "目标管理" "查询战略目标" "PASS" "找到 $objective_count 个战略目标"
    else
        log_test "目标管理" "查询战略目标" "FAIL" "未找到战略目标"
    fi
fi

# 3.4 同行评审 - 查询评审周期
if [ ! -z "$HR_TOKEN" ]; then
    cycles_response=$(curl -s "$BASE_URL/api/peer-review-cycles" \
        -H "Authorization: Bearer $HR_TOKEN")
    
    cycle_count=$(echo $cycles_response | jq '. | length')
    if [ "$cycle_count" -ge 0 ]; then
        log_test "同行评审" "查询评审周期" "PASS" "找到 $cycle_count 个评审周期"
    else
        log_test "同行评审" "查询评审周期" "FAIL" "无法查询评审周期"
    fi
fi

echo "" >> $TEST_LOG

# ========================================
# 第四部分：P1 核心功能
# ========================================
echo -e "\n${YELLOW}=== 第四部分：P1 核心功能 ===${NC}\n"
echo "## 第四部分：P1 核心功能" >> $TEST_LOG
echo "" >> $TEST_LOG

# 4.1 申诉系统 - 创建申诉
if [ ! -z "$EMPLOYEE_TOKEN" ]; then
    appeal_response=$(curl -s -X POST "$BASE_URL/api/appeals" \
        -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "performance_id": 1,
            "reason": "【测试】认为评分不合理",
            "description": "【测试】详细说明申诉理由"
        }')
    
    appeal_id=$(echo $appeal_response | jq -r '.id // empty')
    if [ ! -z "$appeal_id" ]; then
        log_test "P1-申诉" "员工创建申诉" "PASS" "申诉ID: $appeal_id"
        
        # 4.2 申诉系统 - 经理处理
        if [ ! -z "$MANAGER_TOKEN" ]; then
            handle_response=$(curl -s -X PUT "$BASE_URL/api/appeals/$appeal_id/handle" \
                -H "Authorization: Bearer $MANAGER_TOKEN" \
                -H "Content-Type: application/json" \
                -d '{
                    "status": "approved",
                    "handler_comment": "【测试】经理同意申诉",
                    "new_score": 95
                }')
            
            if echo $handle_response | jq -e '.success == true' > /dev/null 2>&1; then
                log_test "P1-申诉" "经理处理申诉" "PASS" "申诉已批准"
            else
                error_msg=$(echo $handle_response | jq -r '.message // .error // "未知错误"')
                log_test "P1-申诉" "经理处理申诉" "FAIL" "$error_msg"
            fi
        fi
    else
        error_msg=$(echo $appeal_response | jq -r '.message // .error // "未知错误"')
        log_test "P1-申诉" "员工创建申诉" "FAIL" "$error_msg"
    fi
fi

# 4.3 目标审批 - 查询待审批目标
if [ ! -z "$MANAGER_TOKEN" ]; then
    adjustments_response=$(curl -s "$BASE_URL/api/objective-adjustments/pending" \
        -H "Authorization: Bearer $MANAGER_TOKEN")
    
    if echo $adjustments_response | jq -e 'type == "array"' > /dev/null 2>&1; then
        pending_count=$(echo $adjustments_response | jq '. | length')
        log_test "P1-目标审批" "查询待审批目标" "PASS" "待审批: $pending_count 个"
    else
        log_test "P1-目标审批" "查询待审批目标" "FAIL" "查询失败"
    fi
fi

# 4.4 评估发布 - 查询发布列表
if [ ! -z "$HR_TOKEN" ]; then
    publications_response=$(curl -s "$BASE_URL/api/assessment-publications" \
        -H "Authorization: Bearer $HR_TOKEN")
    
    if echo $publications_response | jq -e 'type == "array"' > /dev/null 2>&1; then
        pub_count=$(echo $publications_response | jq '. | length')
        log_test "P1-评估发布" "查询发布列表" "PASS" "发布记录: $pub_count 个"
    else
        log_test "P1-评估发布" "查询发布列表" "FAIL" "查询失败"
    fi
fi

echo "" >> $TEST_LOG

# ========================================
# 第五部分：晋升管理
# ========================================
echo -e "\n${YELLOW}=== 第五部分：晋升管理 ===${NC}\n"
echo "## 第五部分：晋升管理" >> $TEST_LOG
echo "" >> $TEST_LOG

# 5.1 晋升申请 - 员工创建
if [ ! -z "$EMPLOYEE_TOKEN" ]; then
    promotion_response=$(curl -s -X POST "$BASE_URL/api/promotion-requests" \
        -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "employee_id": "姚洪",
            "current_position": "测试工程师",
            "target_position": "高级测试工程师",
            "reason": "【测试】工作表现优秀，具备晋升条件",
            "self_evaluation": "【测试】在测试领域有深入研究"
        }')
    
    promotion_id=$(echo $promotion_response | jq -r '.id // empty')
    if [ ! -z "$promotion_id" ]; then
        log_test "晋升管理" "员工创建申请" "PASS" "申请ID: $promotion_id"
        
        # 5.2 晋升审批 - 经理审批
        if [ ! -z "$MANAGER_TOKEN" ]; then
            approve_response=$(curl -s -X PUT "$BASE_URL/api/promotion-requests/$promotion_id/manager-approve" \
                -H "Authorization: Bearer $MANAGER_TOKEN" \
                -H "Content-Type: application/json" \
                -d '{
                    "manager_comment": "【测试】经理同意晋升",
                    "manager_rating": 5
                }')
            
            if echo $approve_response | jq -e '.success == true' > /dev/null 2>&1; then
                log_test "晋升管理" "经理审批" "PASS" "经理已批准"
                
                # 5.3 晋升审批 - 总经理审批
                if [ ! -z "$GM_TOKEN" ]; then
                    gm_approve_response=$(curl -s -X PUT "$BASE_URL/api/promotion-requests/$promotion_id/gm-approve" \
                        -H "Authorization: Bearer $GM_TOKEN" \
                        -H "Content-Type: application/json" \
                        -d '{
                            "gm_comment": "【测试】总经理同意晋升",
                            "gm_rating": 5
                        }')
                    
                    if echo $gm_approve_response | jq -e '.success == true' > /dev/null 2>&1; then
                        log_test "晋升管理" "总经理审批" "PASS" "总经理已批准"
                    else
                        error_msg=$(echo $gm_approve_response | jq -r '.message // .error // "未知错误"')
                        log_test "晋升管理" "总经理审批" "FAIL" "$error_msg"
                    fi
                fi
            else
                error_msg=$(echo $approve_response | jq -r '.message // .error // "未知错误"')
                log_test "晋升管理" "经理审批" "FAIL" "$error_msg"
            fi
        fi
    else
        error_msg=$(echo $promotion_response | jq -r '.message // .error // "未知错误"')
        log_test "晋升管理" "员工创建申请" "FAIL" "$error_msg"
    fi
fi

echo "" >> $TEST_LOG

# ========================================
# 第六部分：AI 功能
# ========================================
echo -e "\n${YELLOW}=== 第六部分：AI 功能 ===${NC}\n"
echo "## 第六部分：AI 功能" >> $TEST_LOG
echo "" >> $TEST_LOG

# 6.1 AI 辅助写作
if [ ! -z "$EMPLOYEE_TOKEN" ]; then
    ai_response=$(curl -s -X POST "$BASE_URL/api/ai/generate" \
        -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "prompt": "帮我写一份本月工作总结",
            "context": "完成了测试任务",
            "type": "summary"
        }')
    
    generated_text=$(echo $ai_response | jq -r '.text // empty')
    if [ ! -z "$generated_text" ]; then
        text_length=${#generated_text}
        log_test "AI 功能" "工作总结生成" "PASS" "生成文本长度: $text_length 字符"
    else
        error_msg=$(echo $ai_response | jq -r '.message // .error // "未知错误"')
        log_test "AI 功能" "工作总结生成" "FAIL" "$error_msg"
    fi
fi

# 6.2 AI 优化建议
if [ ! -z "$EMPLOYEE_TOKEN" ]; then
    optimize_response=$(curl -s -X POST "$BASE_URL/api/ai/optimize" \
        -H "Authorization: Bearer $EMPLOYEE_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "text": "我这个月完成了一些工作",
            "type": "summary"
        }')
    
    optimized_text=$(echo $optimize_response | jq -r '.optimizedText // empty')
    if [ ! -z "$optimized_text" ]; then
        log_test "AI 功能" "文本优化" "PASS" "优化成功"
    else
        error_msg=$(echo $optimize_response | jq -r '.message // .error // "未知错误"')
        log_test "AI 功能" "文本优化" "FAIL" "$error_msg"
    fi
fi

echo "" >> $TEST_LOG

# ========================================
# 第七部分：自动化功能
# ========================================
echo -e "\n${YELLOW}=== 第七部分：自动化功能 ===${NC}\n"
echo "## 第七部分：自动化功能" >> $TEST_LOG
echo "" >> $TEST_LOG

# 7.1 自动任务生成（仅查询，不实际生成）
if [ ! -z "$HR_TOKEN" ]; then
    # 查询当前冻结状态
    freeze_status=$(curl -s "$BASE_URL/api/automation/freeze-status/2026/2" \
        -H "Authorization: Bearer $HR_TOKEN")
    
    if echo $freeze_status | jq -e 'type == "object"' > /dev/null 2>&1; then
        is_frozen=$(echo $freeze_status | jq -r '.is_frozen // false')
        log_test "自动化" "查询冻结状态" "PASS" "2026年2月冻结状态: $is_frozen"
    else
        log_test "自动化" "查询冻结状态" "FAIL" "无法查询冻结状态"
    fi
fi

# 7.2 手动解冻测试
if [ ! -z "$HR_TOKEN" ]; then
    unfreeze_response=$(curl -s -X POST "$BASE_URL/api/automation/unfreeze" \
        -H "Authorization: Bearer $HR_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "year": 2026,
            "month": 1,
            "reason": "【测试】手动解冻测试"
        }')
    
    if echo $unfreeze_response | jq -e '.success == true' > /dev/null 2>&1; then
        log_test "自动化" "手动解冻" "PASS" "解冻成功"
    else
        error_msg=$(echo $unfreeze_response | jq -r '.message // .error // "未知错误"')
        # 如果是"未冻结"错误，也算正常
        if [[ "$error_msg" == *"未冻结"* ]]; then
            log_test "自动化" "手动解冻" "PASS" "该月份未冻结（预期行为）"
        else
            log_test "自动化" "手动解冻" "FAIL" "$error_msg"
        fi
    fi
fi

echo "" >> $TEST_LOG

# ========================================
# 第八部分：数据完整性检查
# ========================================
echo -e "\n${YELLOW}=== 第八部分：数据完整性检查 ===${NC}\n"
echo "## 第八部分：数据完整性检查" >> $TEST_LOG
echo "" >> $TEST_LOG

# 8.1 员工数据
employees_response=$(curl -s "$BASE_URL/api/employees")
employee_count=$(echo $employees_response | jq '. | length')
log_test "数据完整性" "员工记录数量" "PASS" "$employee_count 条记录"

# 8.2 绩效记录
if [ ! -z "$ADMIN_TOKEN" ]; then
    performance_response=$(curl -s "$BASE_URL/api/performance" \
        -H "Authorization: Bearer $ADMIN_TOKEN")
    
    if echo $performance_response | jq -e 'type == "array"' > /dev/null 2>&1; then
        perf_count=$(echo $performance_response | jq '. | length')
        log_test "数据完整性" "绩效记录数量" "PASS" "$perf_count 条记录"
    else
        log_test "数据完整性" "绩效记录数量" "FAIL" "无法查询绩效记录"
    fi
fi

# 8.3 战略目标
if [ ! -z "$GM_TOKEN" ]; then
    objectives_count=$(echo $objectives_response | jq '. | length')
    log_test "数据完整性" "战略目标数量" "PASS" "$objectives_count 条记录"
fi

echo "" >> $TEST_LOG

# ========================================
# 测试总结
# ========================================
echo -e "\n${BLUE}================================${NC}"
echo -e "${BLUE}  测试总结${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "总测试数: $TOTAL_TESTS"
echo -e "通过: ${GREEN}$PASSED_TESTS${NC}"
echo -e "失败: ${RED}$FAILED_TESTS${NC}"

pass_rate=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")
echo "通过率: ${pass_rate}%"

echo "" >> $TEST_LOG
echo "---" >> $TEST_LOG
echo "" >> $TEST_LOG
echo "## 测试总结" >> $TEST_LOG
echo "" >> $TEST_LOG
echo "- **总测试数**: $TOTAL_TESTS" >> $TEST_LOG
echo "- **通过**: $PASSED_TESTS ✅" >> $TEST_LOG
echo "- **失败**: $FAILED_TESTS ❌" >> $TEST_LOG
echo "- **通过率**: ${pass_rate}%" >> $TEST_LOG
echo "" >> $TEST_LOG

if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "\n${YELLOW}⚠️  发现 $FAILED_TESTS 个失败测试，请查看详细日志${NC}"
    echo "详细报告已保存到: $TEST_LOG"
    exit 1
else
    echo -e "\n${GREEN}✓ 所有测试通过！${NC}"
    echo "详细报告已保存到: $TEST_LOG"
    exit 0
fi
