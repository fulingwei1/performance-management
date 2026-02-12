#!/bin/bash

API="http://localhost:3001/api"

# 1. 登录
echo "=== 1. 登录 ==="
LOGIN=$(curl -s -X POST "$API/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"姚洪","password":"123456"}')

TOKEN=$(echo $LOGIN | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo "❌ 登录失败: $LOGIN"
  exit 1
fi

echo "✅ 登录成功"
echo ""

# 2. 测试员工自评AI
echo "=== 2. AI生成：员工月度总结 ==="
SUMMARY=$(curl -s -X POST "$API/ai/self-summary" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"employeeId":"emp-yaohong","month":"2026-02"}')

echo $SUMMARY | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ 成功' if d.get('success') else '❌ 失败'); print('版本1:', d.get('data',{}).get('versions',[''])[0][:200]+'...' if d.get('data',{}).get('versions') else d)" 2>/dev/null || echo "解析失败: $SUMMARY"
echo ""

# 3. 测试晋升申请AI
echo "=== 3. AI生成：晋升申请-绩效总结 ==="
PROMO=$(curl -s -X POST "$API/ai/promotion-performance" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"employeeName":"姚洪","currentLevel":"中级工程师","targetLevel":"高级工程师"}')

echo $PROMO | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ 成功' if d.get('success') else '❌ 失败'); print('内容:', d.get('data',{}).get('versions',[''])[0][:200]+'...' if d.get('data',{}).get('versions') else d)" 2>/dev/null || echo "解析失败: $PROMO"
echo ""

# 4. 测试同事互评AI
echo "=== 4. AI生成：同事互评意见 ==="
PEER=$(curl -s -X POST "$API/ai/peer-review-comment" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"reviewerName":"姚洪","revieweeName":"罗伟军","scores":{"collaboration":4,"professionalism":5,"communication":4}}')

echo $PEER | python3 -c "import sys,json; d=json.load(sys.stdin); print('✅ 成功' if d.get('success') else '❌ 失败'); print('内容:', d.get('data',{}).get('versions',[''])[0][:200]+'...' if d.get('data',{}).get('versions') else d)" 2>/dev/null || echo "解析失败: $PEER"
echo ""

# 5. AI使用统计
echo "=== 5. AI使用统计 ==="
STATS=$(curl -s "$API/ai/my-usage" -H "Authorization: Bearer $TOKEN")
echo $STATS | python3 -c "import sys,json; d=json.load(sys.stdin); print(f\"总调用: {d.get('data',{}).get('total_calls',0)}次, 总token: {d.get('data',{}).get('total_tokens',0)}, 成本: ¥{d.get('data',{}).get('total_cost',0):.4f}\")" 2>/dev/null || echo $STATS

