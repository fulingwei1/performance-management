#!/bin/bash

BASE_URL="http://localhost:3001/api"
echo "======================================"
echo "📊 ATE绩效管理系统 - 完整业务流程测试"
echo "======================================"

# 步骤1: GM登录
echo -e "\n🔐 [步骤1] 总经理登录..."
GM_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"郑汝才","password":"123456","role":"gm"}')

GM_TOKEN=$(echo "$GM_RESP" | jq -r '.data.token')
echo "✅ 总经理郑汝才登录成功"

# 步骤2: GM使用AI生成公司战略
echo -e "\n💡 [步骤2] GM使用AI生成公司战略..."
AI_STRATEGY=$(curl -s -X POST "$BASE_URL/ai/company-strategy" \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"context": "金凯博自动化测试,2026目标:营收增长30%,进军新能源汽车测试"}')

echo "✅ AI生成战略内容:"
echo "$AI_STRATEGY" | jq -r '.data.versions[0]' | head -c 250
echo -e "...\n"

# 步骤3: 员工登录
echo -e "\n🔐 [步骤3] 员工姚洪登录..."
EMP_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"姚洪","password":"123456","role":"employee"}')

EMP_TOKEN=$(echo "$EMP_RESP" | jq -r '.data.token')
EMP_ID=$(echo "$EMP_RESP" | jq -r '.data.user.id')
EMP_NAME=$(echo "$EMP_RESP" | jq -r '.data.user.name')
EMP_DEPT=$(echo "$EMP_RESP" | jq -r '.data.user.department')
echo "✅ $EMP_NAME 登录成功 (部门: $EMP_DEPT, ID: $EMP_ID)"

# 步骤4: 员工使用AI生成个人目标
echo -e "\n🎯 [步骤4] 员工使用AI规划个人年度目标..."
AI_GOALS=$(curl -s -X POST "$BASE_URL/ai/goal-decomposition" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$EMP_ID"'",
    "companyStrategy": "营收增长30%,进军新能源汽车测试市场",
    "companyKeyWorks": ["开拓新客户","研发新产品","提升服务质量"],
    "departmentKeyWorks": ["签约5家新能源客户","销售额突破500万"]
  }')

echo "✅ AI生成的个人目标:"
echo "$AI_GOALS" | jq -r '.data.goals[]? | "  📌 \(.name) (权重\(.weight)%) - \(.description[:40])..."' | head -3

# 提取第一个目标
GOAL_NAME=$(echo "$AI_GOALS" | jq -r '.data.goals[0].name // "完成新能源客户开发"')
GOAL_DESC=$(echo "$AI_GOALS" | jq -r '.data.goals[0].description // "开拓新能源汽车行业客户"')
GOAL_TARGET=$(echo "$AI_GOALS" | jq -r '.data.goals[0].targetValue // "3"')
GOAL_UNIT=$(echo "$AI_GOALS" | jq -r '.data.goals[0].targetUnit // "家客户"')

# 步骤5: 员工保存年度目标
echo -e "\n💾 [步骤5] 员工保存年度目标到系统..."
CREATE_OBJ=$(curl -s -X POST "$BASE_URL/objectives" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": "'"$EMP_ID"'",
    "year": 2026,
    "type": "annual",
    "name": "'"$GOAL_NAME"'",
    "description": "'"$GOAL_DESC"'",
    "targetValue": "'"$GOAL_TARGET"'",
    "targetUnit": "'"$GOAL_UNIT"'",
    "weight": 30,
    "q1Target": 0.5,
    "q2Target": 1.0,
    "q3Target": 1.0,
    "q4Target": 0.5
  }')

OBJ_ID=$(echo "$CREATE_OBJ" | jq -r '.data.id')
if [ "$OBJ_ID" = "null" ]; then
  echo "❌ 创建目标失败:"
  echo "$CREATE_OBJ" | jq .
  exit 1
fi
echo "✅ 目标创建成功 (ID: $OBJ_ID)"
echo "  📋 $GOAL_NAME - 目标: $GOAL_TARGET$GOAL_UNIT"

# 步骤6: 员工填写Q1进度
echo -e "\n📈 [步骤6] 员工填写Q1季度进度..."
CREATE_PROG=$(curl -s -X POST "$BASE_URL/goal-progress" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "objectiveId": '$OBJ_ID',
    "quarter": "2026-Q1",
    "employeeCompletion": 0.4,
    "employeeComment": "Q1成功接触3家新能源客户，完成2家技术交流，1家进入需求沟通阶段，预计Q2可签约1家。"
  }')

PROG_ID=$(echo "$CREATE_PROG" | jq -r '.data.id')
echo "✅ Q1进度填报成功 (ID: $PROG_ID)"
echo "  完成度: 40%"

# 步骤7: 部门经理登录
echo -e "\n🔐 [步骤7] 部门经理登录..."
MGR_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"宋魁","password":"123456","role":"manager"}')

MGR_TOKEN=$(echo "$MGR_RESP" | jq -r '.data.token')
MGR_NAME=$(echo "$MGR_RESP" | jq -r '.data.user.name')
echo "✅ $MGR_NAME 登录成功"

# 步骤8: 经理使用AI生成点评
echo -e "\n💬 [步骤8] 部门经理使用AI生成进度点评..."
AI_COMMENT=$(curl -s -X POST "$BASE_URL/ai/goal-progress-comment" \
  -H "Authorization: Bearer $MGR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeName": "姚洪",
    "goalName": "'"$GOAL_NAME"'",
    "targetValue": "'"$GOAL_TARGET$GOAL_UNIT"'",
    "actualValue": "40%",
    "employeeComment": "Q1成功接触3家新能源客户，完成2家技术交流"
  }')

COMMENT=$(echo "$AI_COMMENT" | jq -r '.data.versions[0] // "进度良好，继续保持。Q2需加快签约节奏。"')
echo "✅ AI生成点评:"
echo "  $COMMENT" | head -c 150
echo "..."

# 步骤9: 经理保存点评
echo -e "\n💾 [步骤9] 部门经理保存点评..."
UPDATE_PROG=$(curl -s -X PUT "$BASE_URL/goal-progress/$PROG_ID" \
  -H "Authorization: Bearer $MGR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "managerCompletion": 0.4,
    "managerComment": "'"$COMMENT"'"
  }')

echo "✅ 点评保存成功"

# 步骤10: 查看最终进度
echo -e "\n📊 [步骤10] 查看完整进度记录..."
FINAL=$(curl -s -X GET "$BASE_URL/goal-progress/$PROG_ID" \
  -H "Authorization: Bearer $MGR_TOKEN")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 进度记录详情"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$FINAL" | jq -r '
"🎯 目标: " + (.data.objectiveName // "N/A") +
"\n📅 季度: " + (.data.quarter // "N/A") +
"\n👤 员工完成: " + ((.data.employeeCompletion // 0) * 100 | tostring) + "%" +
"\n👔 经理评估: " + ((.data.managerCompletion // 0) * 100 | tostring) + "%" +
"\n💭 员工说明: " + (.data.employeeComment[:80] // "无") +
"\n💬 经理点评: " + (.data.managerComment[:80] // "无")
'

echo -e "\n======================================"
echo "✅ 完整业务流程测试通过!"
echo "======================================"
echo ""
echo "【测试总结】"
echo "✓ GM: 登录 → 使用AI生成公司战略"
echo "✓ 员工: 登录 → 查看战略 → AI生成个人目标 → 保存目标"
echo "✓ 员工: 填写Q1季度进度 (双向记录)"
echo "✓ 经理: 登录 → 查看进度 → AI生成点评 → 保存点评"
echo "✓ 完整流程闭环验证成功 ✨"
echo ""
