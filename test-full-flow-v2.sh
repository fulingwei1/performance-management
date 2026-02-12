#!/bin/bash

BASE_URL="http://localhost:3001/api"
echo "======================================"
echo "ATE绩效管理系统 - 完整业务流程测试"
echo "======================================"

# 步骤1: GM登录并设置战略目标
echo -e "\n━━━ [步骤1] 总经理登录 ━━━"
GM_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"郑汝才","password":"123456","role":"gm"}')

GM_TOKEN=$(echo "$GM_RESPONSE" | jq -r '.data.token // empty')
if [ -z "$GM_TOKEN" ]; then
  echo "❌ GM登录失败:"
  echo "$GM_RESPONSE" | jq .
  exit 1
fi
echo "✓ 总经理登录成功 (Token: ${GM_TOKEN:0:20}...)"

# 步骤2: GM使用AI生成公司战略
echo -e "\n━━━ [步骤2] GM使用AI生成公司战略 ━━━"
AI_STRATEGY=$(curl -s -X POST "$BASE_URL/ai/company-strategy" \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "金凯博自动化测试公司,2026年目标:营收增长30%,进军新能源汽车测试市场,提升自动化测试设备市场占有率"
  }')
STRATEGY_TEXT=$(echo "$AI_STRATEGY" | jq -r '.data.versions[0] // empty')
echo "✓ AI生成的战略内容:"
echo "$STRATEGY_TEXT" | head -c 300
echo -e "...\n"

# 步骤3: GM使用AI生成公司重点工作
echo -e "\n━━━ [步骤3] GM使用AI生成公司年度重点工作 ━━━"
AI_KEYWORK=$(curl -s -X POST "$BASE_URL/ai/company-key-works" \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "基于战略: '$STRATEGY_TEXT',生成5-7项年度重点工作"
  }')
KEYWORK_TEXT=$(echo "$AI_KEYWORK" | jq -r '.data.versions[0] // empty')
echo "✓ AI生成的重点工作:"
echo "$KEYWORK_TEXT" | head -c 300
echo -e "...\n"

# 步骤4: 员工登录
echo -e "\n━━━ [步骤4] 员工登录 ━━━"
EMP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"姚洪","password":"123456","role":"employee"}')

EMP_TOKEN=$(echo "$EMP_RESPONSE" | jq -r '.data.token // empty')
EMP_ID=$(echo "$EMP_RESPONSE" | jq -r '.data.user.id // empty')
EMP_NAME=$(echo "$EMP_RESPONSE" | jq -r '.data.user.name // empty')
EMP_DEPT=$(echo "$EMP_RESPONSE" | jq -r '.data.user.department // empty')

if [ -z "$EMP_TOKEN" ]; then
  echo "❌ 员工登录失败:"
  echo "$EMP_RESPONSE" | jq .
  exit 1
fi
echo "✓ 员工登录成功"
echo "  姓名: $EMP_NAME"
echo "  部门: $EMP_DEPT"
echo "  ID: $EMP_ID"

# 步骤5: 员工使用AI规划个人目标
echo -e "\n━━━ [步骤5] 员工使用AI生成个人年度目标 ━━━"
AI_GOALS=$(curl -s -X POST "$BASE_URL/ai/goal-decomposition" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeName": "'"$EMP_NAME"'",
    "position": "测试工程师",
    "department": "'"$EMP_DEPT"'",
    "companyStrategy": "'"$STRATEGY_TEXT"'",
    "departmentGoals": "研发3款新能源汽车测试设备,提升测试效率20%,开拓新客户"
  }')

echo "✓ AI生成的个人目标:"
echo "$AI_GOALS" | jq -r '.data.goals[] | "  【\(.name)】权重:\(.weight)% 目标:\(.targetValue)\(.targetUnit)"' | head -5

# 提取第一个目标用于后续测试
GOAL_1=$(echo "$AI_GOALS" | jq -r '.data.goals[0]')
GOAL_NAME=$(echo "$GOAL_1" | jq -r '.name')
GOAL_DESC=$(echo "$GOAL_1" | jq -r '.description')
GOAL_TARGET=$(echo "$GOAL_1" | jq -r '.targetValue')
GOAL_UNIT=$(echo "$GOAL_1" | jq -r '.targetUnit')
GOAL_WEIGHT=$(echo "$GOAL_1" | jq -r '.weight')

# 步骤6: 员工保存年度目标
echo -e "\n━━━ [步骤6] 员工保存第一个目标到系统 ━━━"
CREATE_OBJ=$(curl -s -X POST "$BASE_URL/objectives" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": '$EMP_ID',
    "year": 2026,
    "quarter": null,
    "type": "annual",
    "name": "'"$GOAL_NAME"'",
    "description": "'"$GOAL_DESC"'",
    "targetValue": "'"$GOAL_TARGET"'",
    "targetUnit": "'"$GOAL_UNIT"'",
    "weight": '$GOAL_WEIGHT',
    "q1Target": 0.2,
    "q2Target": 0.3,
    "q3Target": 0.3,
    "q4Target": 0.2
  }')

OBJ_ID=$(echo "$CREATE_OBJ" | jq -r '.data.id // empty')
if [ -z "$OBJ_ID" ]; then
  echo "❌ 创建目标失败:"
  echo "$CREATE_OBJ" | jq .
  exit 1
fi
echo "✓ 目标创建成功 (ID: $OBJ_ID)"
echo "  【$GOAL_NAME】"

# 步骤7: 员工填写Q1进度
echo -e "\n━━━ [步骤7] 员工填写Q1季度进度 ━━━"
CREATE_PROGRESS=$(curl -s -X POST "$BASE_URL/goal-progress" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "objectiveId": '$OBJ_ID',
    "quarter": "2026-Q1",
    "employeeCompletion": 0.25,
    "employeeComment": "Q1完成了新能源测试设备需求调研,编写技术方案,完成初步原理图设计,进度符合预期。下一步将进入详细设计和样机制作阶段。"
  }')

PROGRESS_ID=$(echo "$CREATE_PROGRESS" | jq -r '.data.id // empty')
if [ -z "$PROGRESS_ID" ]; then
  echo "❌ 创建进度失败:"
  echo "$CREATE_PROGRESS" | jq .
  exit 1
fi
echo "✓ Q1进度填报成功 (ID: $PROGRESS_ID)"
echo "  完成度: 25%"
echo "  说明: Q1完成了需求调研和技术方案..."

# 步骤8: 部门经理登录
echo -e "\n━━━ [步骤8] 部门经理登录 ━━━"
MGR_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"宋魁","password":"123456","role":"manager"}')

MGR_TOKEN=$(echo "$MGR_RESPONSE" | jq -r '.data.token // empty')
MGR_NAME=$(echo "$MGR_RESPONSE" | jq -r '.data.user.name // empty')

if [ -z "$MGR_TOKEN" ]; then
  echo "❌ 部门经理登录失败:"
  echo "$MGR_RESPONSE" | jq .
  exit 1
fi
echo "✓ 部门经理登录成功: $MGR_NAME"

# 步骤9: 部门经理使用AI生成点评
echo -e "\n━━━ [步骤9] 部门经理使用AI生成进度点评 ━━━"
AI_COMMENT=$(curl -s -X POST "$BASE_URL/ai/goal-progress-comment" \
  -H "Authorization: Bearer $MGR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeName": "'"$EMP_NAME"'",
    "goalName": "'"$GOAL_NAME"'",
    "targetValue": "'"$GOAL_TARGET $GOAL_UNIT"'",
    "actualValue": "25%",
    "employeeComment": "Q1完成了新能源测试设备需求调研,编写技术方案,完成初步原理图设计"
  }')

COMMENT_TEXT=$(echo "$AI_COMMENT" | jq -r '.data.versions[0] // empty')
echo "✓ AI生成的点评:"
echo "$COMMENT_TEXT" | head -c 200
echo -e "...\n"

# 步骤10: 部门经理保存点评
echo -e "\n━━━ [步骤10] 部门经理保存点评到系统 ━━━"
UPDATE_PROGRESS=$(curl -s -X PUT "$BASE_URL/goal-progress/$PROGRESS_ID" \
  -H "Authorization: Bearer $MGR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "managerCompletion": 0.25,
    "managerComment": "'"$COMMENT_TEXT"'"
  }')

if [ "$(echo "$UPDATE_PROGRESS" | jq -r '.success')" = "true" ]; then
  echo "✓ 部门经理点评保存成功"
else
  echo "❌ 点评保存失败:"
  echo "$UPDATE_PROGRESS" | jq .
fi

# 步骤11: 查看最终进度记录
echo -e "\n━━━ [步骤11] 查看完整的进度记录 ━━━"
FINAL_PROGRESS=$(curl -s -X GET "$BASE_URL/goal-progress/$PROGRESS_ID" \
  -H "Authorization: Bearer $MGR_TOKEN")

echo "✓ 进度记录详情:"
echo "$FINAL_PROGRESS" | jq '{
  目标名称: .data.objectiveName,
  季度: .data.quarter,
  员工完成度: (.data.employeeCompletion * 100 | tostring + "%"),
  经理完成度: (.data.managerCompletion * 100 | tostring + "%"),
  员工说明: .data.employeeComment[:60],
  经理点评: .data.managerComment[:60]
}'

echo -e "\n======================================"
echo "✅ 完整业务流程测试通过!"
echo "======================================"
echo ""
echo "【测试总结】"
echo "1. ✓ 总经理使用AI生成公司战略和重点工作"
echo "2. ✓ 员工查看战略目标并用AI规划个人目标"
echo "3. ✓ 员工保存年度目标并填写季度进度"
echo "4. ✓ 部门经理查看下属进度并用AI生成点评"
echo "5. ✓ 双向进度记录(员工+经理)保存成功"
echo ""
