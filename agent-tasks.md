# Agent Teams 任务分配

**创建时间**: 2026-02-13 15:33  
**总任务数**: 5

---

## Task 1: 工作总结提交参数修复 (P1)
**Agent**: fix-summary-submit  
**优先级**: 高  
**预计时间**: 30分钟

**问题描述**:
- 格式1错误: "工作总结不能为空"
- 格式2错误: "月份格式必须为YYYY-MM"

**任务**:
1. 检查 `backend/src/validators/performance.validator.ts`
2. 检查 `backend/src/controllers/performance.controller.ts` 的 submitSummary 方法
3. 修复参数验证逻辑
4. 测试两种格式：`{month: "2026-02"}` 和 `{year: 2026, month: 2}`
5. 确保至少一种格式可以工作

**测试命令**:
```bash
curl -X POST http://localhost:3001/api/performance/summary \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "month": "2026-02",
    "summary": "测试",
    "achievements": "测试",
    "issues": "无"
  }'
```

---

## Task 2: 晋升管理参数验证修复 (P1)
**Agent**: fix-promotion-validation  
**优先级**: 高  
**预计时间**: 30分钟

**问题描述**:
- 查询晋升列表失败
- 创建晋升申请: "目标级别不能为空"

**任务**:
1. 检查 `backend/src/validators/promotion.validator.ts`
2. 检查 `backend/src/routes/promotionRequest.routes.ts`
3. 修复参数验证（target_level vs targetLevel）
4. 测试创建和查询

**测试命令**:
```bash
curl -X POST http://localhost:3001/api/promotion-requests \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "employee_id": "e001",
    "current_position": "销售员",
    "target_position": "高级销售员",
    "current_level": "junior",
    "target_level": "intermediate",
    "reason": "测试",
    "self_evaluation": "测试"
  }'
```

---

## Task 3: AI功能接口修复 (P2)
**Agent**: fix-ai-routes  
**优先级**: 中  
**预计时间**: 30分钟

**问题描述**:
- AI生成: "接口不存在"
- AI优化: "接口不存在"

**任务**:
1. 检查 `backend/src/routes/ai.routes.ts`
2. 检查 `backend/src/controllers/ai.controller.ts`
3. 确认路由正确注册
4. 测试 POST /api/ai/generate 和 POST /api/ai/optimize

**测试命令**:
```bash
curl -X POST http://localhost:3001/api/ai/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "帮我写工作总结",
    "context": "测试",
    "type": "summary"
  }'
```

---

## Task 4: 同行评审查询修复 (P2)
**Agent**: fix-peer-review  
**优先级**: 中  
**预计时间**: 20分钟

**问题描述**:
- 查询评审周期: "接口不存在"

**任务**:
1. 检查 `backend/src/routes/peerReviewCycle.routes.ts`
2. 检查 `backend/src/controllers/peerReviewCycle.controller.ts`
3. 修复路由或controller问题
4. 测试 GET /api/peer-review-cycles

**测试命令**:
```bash
curl http://localhost:3001/api/peer-review-cycles \
  -H "Authorization: Bearer $TOKEN"
```

---

## Task 5: objectives接口优化 (P3)
**Agent**: fix-objectives-query  
**优先级**: 低  
**预计时间**: 20分钟

**问题描述**:
- GET /api/objectives 返回空数组
- GET /api/strategic-objectives 返回38个（正常）
- 数据库有38条记录

**任务**:
1. 检查 `backend/src/controllers/objective.controller.ts`
2. 检查查询逻辑和过滤条件
3. 确保返回所有战略目标
4. 测试查询

**测试命令**:
```bash
curl http://localhost:3001/api/objectives \
  -H "Authorization: Bearer $TOKEN"
```

---

## 执行计划

**并行执行**: Task 1, 2, 3（P1-P2）  
**后续执行**: Task 4, 5（P3）等前面完成后

**完成标准**: 
- 所有测试通过
- Docker重新构建和部署
- 提交 Git commit
