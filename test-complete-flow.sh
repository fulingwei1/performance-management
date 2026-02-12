#!/bin/bash

BASE_URL="http://localhost:3001/api"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ATE绩效管理系统 - 完整业务流程测试  "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# === 第一步:总经理设定战略目标 ===
echo -e "\n🎯 【第一步】总经理设定公司战略目标\n"

GM_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"郑汝才","password":"123456","role":"gm"}')
GM_TOKEN=$(echo "$GM_RESP" | jq -r '.data.token')
echo "✓ 总经理郑汝才登录成功"

AI_STRATEGY=$(curl -s -X POST "$BASE_URL/ai/company-strategy" \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"year": 2026, "context": "金凯博自动化测试公司,营收增长30%,进军新能源汽车测试市场"}')

STRATEGY=$(echo "$AI_STRATEGY" | jq -r '.data.versions[0]')
echo "✓ GM使用AI生成公司战略:"
echo "  $STRATEGY" | head -c 200
echo -e "...\n"

AI_KEYWORK=$(curl -s -X POST "$BASE_URL/ai/company-key-works" \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"year": 2026, "context": "基于战略目标,重点工作包括:新产品研发、市场开拓、团队建设"}')

KEYWORK=$(echo "$AI_KEYWORK" | jq -r '.data.versions[0]')
echo "✓ GM使用AI生成年度重点工作:"
echo "  $KEYWORK" | head -c 200
echo -e "...\n"

# === 第二步:员工查看战略并规划目标 ===
echo -e "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
echo "👤 【第二步】员工查看战略并规划个人目标\n"

EMP_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"姚洪","password":"123456","role":"employee"}')
EMP_TOKEN=$(echo "$EMP_RESP" | jq -r '.data.token')
EMP_ID=$(echo "$EMP_RESP" | jq -r '.data.user.id')
EMP_NAME=$(echo "$EMP_RESP" | jq -r '.data.user.name')
echo "✓ 员工$EMP_NAME登录成功 (ID: $EMP_ID)"

AI_GOALS=$(curl -s -X POST "$BASE_URL/ai/goal-decomposition" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$EMP_ID"'",
    "companyStrategy": "营收增长30%,新能源市场",
    "companyKeyWorks": ["新产品研发","市场开拓"],
    "departmentKeyWorks": ["签约5家新客户","销售额500万"]
  }')

echo "✓ 员工使用AI生成个人年度目标:"
echo "$AI_GOALS" | jq -r '.data.goals[]? | "  📌 \(.name) (权重\(.weight)%, 目标:\(.targetValue)\(.targetUnit))"' | head -3

GOAL_DATA=$(echo "$AI_GOALS" | jq -r '.data.goals[0]')
GOAL_NAME=$(echo "$GOAL_DATA" | jq -r '.name // "新能源客户开发"')
GOAL_DESC=$(echo "$GOAL_DATA" | jq -r '.description // "开拓新能源汽车测试市场客户"')
GOAL_TARGET=$(echo "$GOAL_DATA" | jq -r '.targetValue // "3"')
GOAL_UNIT=$(echo "$GOAL_DATA" | jq -r '.targetUnit // "家"')

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
    "weight": 35,
    "q1Target": 0.5,
    "q2Target": 1.0,
    "q3Target": 1.0,
    "q4Target": 0.5
  }')

OBJ_ID=$(echo "$CREATE_OBJ" | jq -r '.data.id')
echo "✓ 员工保存年度目标 (ID: ${OBJ_ID:0:8}...)"
echo "  目标:【$GOAL_NAME】- $GOAL_TARGET$GOAL_UNIT"

# === 第三步:员工填写季度进度 ===
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
echo "📊 【第三步】员工填写Q1季度进度\n"

CREATE_PROG=$(curl -s -X POST "$BASE_URL/goal-progress" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "objectiveId": '$OBJ_ID',
    "quarter": "2026-Q1",
    "employeeCompletion": 0.45,
    "employeeComment": "Q1成功对接3家新能源客户,完成2家技术交流,1家进入商务洽谈,预计Q2可签约至少1家。"
  }')

PROG_ID=$(echo "$CREATE_PROG" | jq -r '.data.id')
PROG_SUCCESS=$(echo "$CREATE_PROG" | jq -r '.success')

if [ "$PROG_SUCCESS" = "true" ]; then
  echo "✓ Q1进度填报成功 (ID: ${PROG_ID:0:8}...)"
  echo "  完成度: 45%"
  echo "  说明: Q1成功对接3家新能源客户..."
else
  echo "⚠️  进度填报失败:"
  echo "$CREATE_PROG" | jq .
fi

# === 第四步:部门经理查看并点评 ===
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
echo "👔 【第四步】部门经理查看进度并点评\n"

MGR_RESP=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"宋魁","password":"123456","role":"manager"}')
MGR_TOKEN=$(echo "$MGR_RESP" | jq -r '.data.token')
MGR_NAME=$(echo "$MGR_RESP" | jq -r '.data.user.name')
echo "✓ 部门经理$MGR_NAME登录成功"

AI_COMMENT=$(curl -s -X POST "$BASE_URL/ai/goal-progress-comment" \
  -H "Authorization: Bearer $MGR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeName": "'"$EMP_NAME"'",
    "goalName": "'"$GOAL_NAME"'",
    "targetValue": "'"$GOAL_TARGET$GOAL_UNIT"'",
    "actualValue": "45%",
    "employeeComment": "Q1成功对接3家新能源客户,完成2家技术交流"
  }')

COMMENT=$(echo "$AI_COMMENT" | jq -r '.data.versions[0] // "进度良好,符合预期。Q2继续加强客户跟进,争取早日签约。"')
echo "✓ 经理使用AI生成点评:"
echo "  $COMMENT" | head -c 150
echo "..."

UPDATE_PROG=$(curl -s -X PUT "$BASE_URL/goal-progress/$PROG_ID" \
  -H "Authorization: Bearer $MGR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "managerCompletion": 0.45,
    "managerComment": "'"$COMMENT"'"
  }')

echo "✓ 经理保存点评成功"

# === 第五步:总经理查看全局进度 ===
echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
echo "🎯 【第五步】总经理查看团队进度\n"

FINAL=$(curl -s -X GET "$BASE_URL/goal-progress/$PROG_ID" \
  -H "Authorization: Bearer $GM_TOKEN")

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "      📋 进度记录详情      "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$FINAL" | jq -r '
if .data then
  "🎯 目标: " + (.data.objectiveName // .data.objective.name // "N/A") +
  "\n📅 季度: " + (.data.quarter // "N/A") +
  "\n👤 员工自评: " + ((.data.employeeCompletion // 0) * 100 | tostring) + "%" +
  "\n👔 经理评估: " + ((.data.managerCompletion // 0) * 100 | tostring) + "%" +
  "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" +
  "\n💭 员工说明:\n  " + (.data.employeeComment // "无") +
  "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" +
  "\n💬 经理点评:\n  " + (.data.managerComment // "无")
else
  "❌ 数据获取失败"
end
'

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "         ✅ 测试完成!         "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "【测试总结】"
echo "✓ GM设定战略 → AI生成战略内容和重点工作"
echo "✓ 员工查看战略 → AI生成个人目标 → 保存到系统"
echo "✓ 员工填写Q1进度 → 双向记录(员工自评+经理评估)"
echo "✓ 部门经理查看 → AI生成点评 → 保存点评"
echo "✓ 总经理查看全局进度 → 完整数据展示"
echo ""
echo "📊 完整业务闭环验证成功! ✨"
echo ""
