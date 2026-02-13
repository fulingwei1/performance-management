#!/bin/bash

# 保存测试token
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3MDk2NTYzNCwiZXhwIjoxNzcxNTcwNDM0fQ.QJemJISI7ssvtTS8nHlvdhAfoEFJKK1q-5IIdA7PgjM"

echo "=== 手动核心功能测试 ==="
echo

echo "1. 查询员工列表（需要认证）"
curl -s "http://localhost:3001/api/employees" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq '. | length'
echo

echo "2. 查询绩效记录"
curl -s "http://localhost:3001/api/performance" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq '. | length'
echo

echo "3. 查询战略目标"
curl -s "http://localhost:3001/api/objectives" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq '. | length'
echo

echo "4. 查询晋升申请列表"
curl -s "http://localhost:3001/api/promotion-requests" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq '. | length'
echo

echo "5. 查询申诉列表"
curl -s "http://localhost:3001/api/appeals" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq '. | length'
echo

echo "6. 查询目标调整列表"
curl -s "http://localhost:3001/api/objective-adjustments" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq '. | length'
echo

echo "7. 测试AI功能（生成工作总结）"
curl -s -X POST "http://localhost:3001/api/ai/generate" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
        "prompt": "帮我写一份本月工作总结",
        "context": "完成了系统测试工作",
        "type": "summary"
    }' | jq -r '.text' | head -c 200
echo
echo

