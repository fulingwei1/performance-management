#!/bin/bash

BASE_URL="http://localhost:3001/api"
echo "======================================"
echo "完整业务流程测试"
echo "======================================"

# 步骤1: GM登录并设置战略目标
echo -e "\n[步骤1] 总经理登录..."
GM_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"郑汝才","password":"123456"}')

GM_TOKEN=$(echo $GM_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "✓ GM Token: ${GM_TOKEN:0:20}..."

# 获取现有战略目标
echo -e "\n[步骤2] 查看现有战略目标..."
STRATEGIC=$(curl -s -X GET "$BASE_URL/strategic-objectives" \
  -H "Authorization: Bearer $GM_TOKEN")
echo $STRATEGIC | head -c 200
echo "..."

# 更新公司战略(使用AI生成)
echo -e "\n[步骤3] 使用AI生成公司战略..."
AI_STRATEGY=$(curl -s -X POST "$BASE_URL/ai/company-strategy" \
  -H "Authorization: Bearer $GM_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "context": "金凯博自动化测试公司,2026年目标:营收增长30%,进军新能源汽车测试市场"
  }')
echo $AI_STRATEGY | head -c 300
echo "..."

# 步骤4: 员工登录并查看战略目标
echo -e "\n[步骤4] 员工登录..."
EMP_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"姚洪","password":"123456"}')

EMP_TOKEN=$(echo $EMP_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
EMP_ID=$(echo $EMP_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✓ Employee Token: ${EMP_TOKEN:0:20}..."
echo "✓ Employee ID: $EMP_ID"

# 员工使用AI规划个人目标
echo -e "\n[步骤5] 员工使用AI规划个人目标..."
AI_GOALS=$(curl -s -X POST "$BASE_URL/ai/goal-decomposition" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeName": "姚洪",
    "position": "测试工程师",
    "department": "技术部",
    "companyStrategy": "营收增长30%,进军新能源汽车测试市场",
    "departmentGoals": "研发3款新测试设备,提升测试效率20%"
  }')
echo $AI_GOALS | head -c 500
echo "..."

# 创建员工目标
echo -e "\n[步骤6] 保存员工年度目标..."
CREATE_OBJ=$(curl -s -X POST "$BASE_URL/objectives" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeId": '$EMP_ID',
    "year": 2026,
    "quarter": null,
    "type": "annual",
    "name": "测试设备研发目标",
    "description": "参与新能源汽车测试设备研发,完成3个测试模块开发",
    "targetValue": "3",
    "targetUnit": "个模块",
    "weight": 40,
    "q1Target": 0.5,
    "q2Target": 1.0,
    "q3Target": 1.0,
    "q4Target": 0.5
  }')
OBJ_ID=$(echo $CREATE_OBJ | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✓ 创建目标 ID: $OBJ_ID"

# 员工填写Q1进度
echo -e "\n[步骤7] 员工填写Q1进度..."
CREATE_PROGRESS=$(curl -s -X POST "$BASE_URL/goal-progress" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "objectiveId": '$OBJ_ID',
    "quarter": "2026-Q1",
    "employeeCompletion": 0.6,
    "employeeComment": "Q1完成了设备需求分析和原理图设计,进度符合预期"
  }')
PROGRESS_ID=$(echo $CREATE_PROGRESS | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)
echo "✓ 进度记录 ID: $PROGRESS_ID"

# 使用AI生成进度评论
echo -e "\n[步骤8] 使用AI生成进度评论..."
AI_COMMENT=$(curl -s -X POST "$BASE_URL/ai/goal-progress-comment" \
  -H "Authorization: Bearer $EMP_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employeeName": "姚洪",
    "goalName": "测试设备研发目标",
    "targetValue": "3个模块",
    "actualValue": "0.6个模块",
    "employeeComment": "Q1完成了设备需求分析和原理图设计,进度符合预期"
  }')
echo $AI_COMMENT | head -c 300
echo "..."

# 部门经理登录并点评
echo -e "\n[步骤9] 部门经理登录..."
MGR_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"宋魁","password":"123456"}')

MGR_TOKEN=$(echo $MGR_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "✓ Manager Token: ${MGR_TOKEN:0:20}..."

# 部门经理更新进度点评
echo -e "\n[步骤10] 部门经理添加点评..."
UPDATE_PROGRESS=$(curl -s -X PUT "$BASE_URL/goal-progress/$PROGRESS_ID" \
  -H "Authorization: Bearer $MGR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "managerCompletion": 0.6,
    "managerComment": "进度良好,需求分析很扎实。Q2注意与硬件团队的协作。"
  }')
echo "✓ 点评完成"

# 查看最终进度
echo -e "\n[步骤11] 查看目标最终进度..."
FINAL_PROGRESS=$(curl -s -X GET "$BASE_URL/goal-progress/$PROGRESS_ID" \
  -H "Authorization: Bearer $MGR_TOKEN")
echo $FINAL_PROGRESS | grep -o '"employeeCompletion":[^,]*'
echo $FINAL_PROGRESS | grep -o '"managerCompletion":[^,]*'
echo $FINAL_PROGRESS | grep -o '"employeeComment":"[^"]*"' | cut -d'"' -f4
echo $FINAL_PROGRESS | grep -o '"managerComment":"[^"]*"' | cut -d'"' -f4

echo -e "\n======================================"
echo "✓ 测试完成!"
echo "======================================"
