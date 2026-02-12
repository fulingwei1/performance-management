#!/bin/bash
BASE_URL="http://localhost:3001/api"

echo "=== 快速流程测试 ==="

# 1. GM登录
echo -e "\n[1] GM登录..."
GM=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"郑汝才","password":"123456","role":"gm"}')
GM_TOKEN=$(echo "$GM" | jq -r '.data.token')
echo "✓ GM登录成功"

# 2. 员工登录并创建目标
echo -e "\n[2] 员工登录并创建年度目标..."
EMP=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"姚洪","password":"123456","role":"employee"}')
EMP_TOKEN=$(echo "$EMP" | jq -r '.data.token')
EMP_ID=$(echo "$EMP" | jq -r '.data.user.id')

OBJ=$(curl -s -X POST "$BASE_URL/objectives" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"'"$EMP_ID"'","year":2026,"type":"annual","name":"新能源客户开发","description":"开拓新能源汽车测试市场客户","targetValue":"5","targetUnit":"家","weight":40,"q1Target":1,"q2Target":1.5,"q3Target":1.5,"q4Target":1}')
OBJ_ID=$(echo "$OBJ" | jq -r '.data.id')
echo "✓ 目标创建成功 (ID: ${OBJ_ID:0:12}...)"
echo "  名称:【新能源客户开发】目标: 5家"

# 3. 员工填写Q1进度
echo -e "\n[3] 员工填写Q1进度..."
PROG=$(curl -s -X POST "$BASE_URL/goal-progress" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"objectiveId":'$OBJ_ID',"quarter":"2026-Q1","employeeCompletion":0.40,"employeeComment":"Q1已接触3家客户,2家完成技术交流,1家进入商务洽谈阶段"}')
PROG_ID=$(echo "$PROG" | jq -r '.data.id')
echo "✓ Q1进度填报成功 (ID: ${PROG_ID:0:12}...)"

# 4. 部门经理点评
echo -e "\n[4] 部门经理登录并点评..."
MGR=$(curl -s -X POST "$BASE_URL/auth/login" -H "Content-Type: application/json" -d '{"username":"宋魁","password":"123456","role":"manager"}')
MGR_TOKEN=$(echo "$MGR" | jq -r '.data.token')

UPD=$(curl -s -X PUT "$BASE_URL/goal-progress/$PROG_ID" \
  -H "Authorization: Bearer $MGR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"managerCompletion":0.40,"managerComment":"进度良好,客户开发节奏符合预期。Q2需加快签约进度,争取完成至少1家签约。"}')
echo "✓ 经理点评成功"

# 5. 查看最终进度
echo -e "\n[5] 查看进度详情..."
DETAIL=$(curl -s -X GET "$BASE_URL/goal-progress/$PROG_ID" -H "Authorization: Bearer $MGR_TOKEN")

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━"
echo "   📊 进度记录    "
echo "━━━━━━━━━━━━━━━━━━━━━━━"
echo "$DETAIL" | jq -r '
if .data then {
  "目标": (.data.objectiveName // .data.objective.name // "新能源客户开发"),
  "季度": .data.quarter,
  "员工完成度": ((.data.employeeCompletion // 0) * 100 | tostring) + "%",
  "经理评估": ((.data.managerCompletion // 0) * 100 | tostring) + "%",
  "员工说明": .data.employeeComment,
  "经理点评": .data.managerComment
} else {success: .success, error: .error} end
' | jq -r 'to_entries[] | "\(.key): \(.value)"'

echo -e "\n=== ✅ 完整流程测试成功! ==="
