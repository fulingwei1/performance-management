#!/bin/bash

BASE_URL="http://localhost:3001/api"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   📊 进度仪表板 API 测试    "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 创建测试数据
echo -e "\n[准备] 创建测试目标数据..."

# 员工登录
EMP_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"姚洪","password":"123456","role":"employee"}' | jq -r '.data.token')

EMP_ID=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"姚洪","password":"123456","role":"employee"}' | jq -r '.data.user.id')

# 创建3个测试目标
for i in 1 2 3; do
  PROGRESS=$((RANDOM % 100))
  curl -s -X POST "$BASE_URL/objectives" \
    -H "Authorization: Bearer $EMP_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "employeeId": "'"$EMP_ID"'",
      "year": 2026,
      "type": "annual",
      "level": "individual",
      "title": "测试目标'$i'",
      "description": "用于测试仪表板的目标",
      "targetValue": "100",
      "targetUnit": "%",
      "weight": 30,
      "progress": '$PROGRESS',
      "quarter": "Q'$((i % 4 + 1))'"
    }' > /dev/null
done

echo "✅ 已创建3个测试目标（进度随机）"

# GM登录
echo -e "\n[步骤1] GM登录..."
GM_TOKEN=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"郑汝才","password":"123456","role":"gm"}' | jq -r '.data.token')

echo "✅ GM登录成功"

# 测试API 1: 全局概览
echo -e "\n━━━ [测试1] 全局概览 ━━━"
curl -s -X GET "$BASE_URL/dashboard/overview?year=2026" \
  -H "Authorization: Bearer $GM_TOKEN" | jq '{
  year: .data.year,
  总目标数: .data.summary.totalObjectives,
  平均进度: (.data.summary.avgProgress | tostring) + "%",
  完成率: (.data.summary.completionRate | tostring) + "%",
  已完成: .data.summary.completedObjectives,
  进行中: .data.summary.inProgressObjectives,
  未开始: .data.summary.notStartedObjectives,
  部门数: (.data.departmentStats | length)
}'

# 测试API 2: 个人进度
echo -e "\n━━━ [测试2] 员工个人进度 ━━━"
curl -s -X GET "$BASE_URL/dashboard/my-progress?year=2026" \
  -H "Authorization: Bearer $EMP_TOKEN" | jq '{
  year: .data.year,
  总目标数: .data.summary.totalObjectives,
  平均进度: (.data.summary.avgProgress | tostring) + "%",
  已完成: .data.summary.completed,
  进行中: .data.summary.inProgress,
  部门对比: {
    我的进度: (.data.comparison.myProgress | tostring) + "%",
    部门平均: (.data.comparison.departmentAvg | tostring) + "%",
    差值: (.data.comparison.difference | tostring) + "%"
  }
}'

# 测试API 3: 排行榜
echo -e "\n━━━ [测试3] 排行榜 ━━━"
RANKINGS=$(curl -s -X GET "$BASE_URL/dashboard/rankings?year=2026&limit=5" \
  -H "Authorization: Bearer $GM_TOKEN")

echo "Top 5 员工:"
echo "$RANKINGS" | jq -r '.data.topPerformers[] | "  \(.employeeName) - \(.avgProgress)%  (\(.department))"' | head -3

echo -e "\nBottom 5 员工:"
echo "$RANKINGS" | jq -r '.data.bottomPerformers[] | "  \(.employeeName) - \(.avgProgress)%  (\(.department))"' | head -3

# 测试API 4: 趋势
echo -e "\n━━━ [测试4] 季度趋势 ━━━"
curl -s -X GET "$BASE_URL/dashboard/trends?year=2026" \
  -H "Authorization: Bearer $GM_TOKEN" | jq -r '.data.trends[] | "  \(.quarter): \(.avgProgress)% (目标数: \(.objectivesCount))"'

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "         ✅ 测试完成!         "
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "【访问仪表板】"
echo "1. 员工: http://localhost:5173/employee/progress-dashboard"
echo "2. 经理: http://localhost:5173/manager/progress-dashboard"
echo "3. GM:   http://localhost:5173/gm/progress-dashboard"
echo ""
echo "【测试账号】"
echo "- 姚洪 / 123456 / employee"
echo "- 宋魁 / 123456 / manager"
echo "- 郑汝才 / 123456 / gm"
echo ""
