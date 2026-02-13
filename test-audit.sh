#!/bin/bash

echo "=== 测试审计日志功能 ==="
echo ""

# 1. 登录获取 token
echo "1. 登录（会记录登录日志）"
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' | jq -r '.data.token')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
  echo "❌ 登录失败"
  exit 1
fi
echo "✅ 登录成功，Token: ${TOKEN:0:20}..."
echo ""

sleep 2

# 2. 执行一些操作（会被记录）
echo "2. 提交工作总结（会记录 CREATE 操作）"
SUMMARY_RESULT=$(curl -s -X POST http://localhost:3001/api/performance/summary \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "month":"2027-02",
    "summary":"测试审计日志功能",
    "achievements":"实现了审计日志",
    "issues":"无"
  }')
echo "$SUMMARY_RESULT" | jq '.message'
echo ""

sleep 2

# 3. 查询审计日志
echo "3. 查询审计日志（需要 HR/admin 权限）"
LOGS=$(curl -s -X GET "http://localhost:3001/api/audit-logs?limit=10" \
  -H "Authorization: Bearer $TOKEN")
echo "$LOGS" | jq '{
  success: .success,
  total: .data.pagination.total,
  recent_logs: .data.logs[:3] | map({
    action: .action,
    module: .module,
    description: .description,
    created_at: .created_at
  })
}'
echo ""

sleep 1

# 4. 查询统计信息
echo "4. 查询统计信息"
STATS=$(curl -s -X GET "http://localhost:3001/api/audit-logs/stats" \
  -H "Authorization: Bearer $TOKEN")
echo "$STATS" | jq '{
  success: .success,
  totalLogs: .data.totalLogs,
  byAction: .data.byAction,
  byModule: .data.byModule,
  byResult: .data.byResult
}'
echo ""

sleep 1

# 5. 查询某用户的操作历史
echo "5. 查询 admin 用户的操作历史"
USER_LOGS=$(curl -s -X GET "http://localhost:3001/api/audit-logs/user/admin" \
  -H "Authorization: Bearer $TOKEN")
echo "$USER_LOGS" | jq '{
  success: .success,
  log_count: (.data.logs | length),
  recent_actions: .data.logs[:3] | map({action: .action, module: .module, description: .description})
}'
echo ""

echo "=== 测试完成 ==="
