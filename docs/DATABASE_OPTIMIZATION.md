# Phase 2 数据库优化建议

> 生成日期: 2026-03-01
> 目标: 分析9个Phase 2表的索引、查询、结构，提供优化方案

---

## 一、索引分析总结

### 现有索引覆盖情况

| 表 | 主键 | 外键索引 | 查询索引 | 问题 |
|---|---|---|---|---|
| review_cycles | ✅ | N/A | status, dates, type | ✅ 良好 |
| review_relationships | ✅ | cycle_id(FK+UK) | reviewer, reviewee, status | ⚠️ department_id无索引 |
| peer_reviews | ✅ | relationship_id(FK), cycle_id(FK) | reviewer, reviewee, submitted | ⚠️ 缺少复合索引 |
| review_statistics | ✅ | cycle_id(FK+UK) | avg_score | ✅ 良好 |
| interview_plans | ✅ | 无FK | manager, employee, date, status | ⚠️ template_id无索引 |
| interview_templates | ✅ | N/A | type, status | ✅ 良好 |
| interview_records | ✅ | plan_id(FK) | employee, manager, date, status | ⚠️ 缺少复合索引 |
| improvement_plans | ✅ | interview_record_id(FK) | employee, status, target_date | ⚠️ manager_id无索引 |
| interview_reminders | ✅ | plan_id(FK) | recipient, date, sent | ⚠️ 缺少复合索引 |

### 建议添加的索引

#### 1. 复合索引（高优先级）

```sql
-- peer_reviews: 按周期+被评人查询是最常见模式（触发器和统计都用）
CREATE INDEX idx_peer_reviews_cycle_reviewee ON peer_reviews(cycle_id, reviewee_id);

-- review_relationships: 按周期+评价人查询（"我需要评谁"）
CREATE INDEX idx_review_rel_cycle_reviewer ON review_relationships(cycle_id, reviewer_id, status);

-- interview_reminders: 查未发送提醒的典型查询
CREATE INDEX idx_reminders_unsent ON interview_reminders(is_sent, reminder_date);

-- improvement_plans: 按员工+状态查询（findByEmployee使用）
CREATE INDEX idx_improvement_employee_status ON improvement_plans(employee_id, status);
```

#### 2. 缺失的单列索引（中优先级）

```sql
-- improvement_plans: manager_id查询（经理查看下属改进计划）
CREATE INDEX idx_improvement_manager ON improvement_plans(manager_id);

-- interview_plans: template_id（JOIN模板时需要）
CREATE INDEX idx_interview_plans_template ON interview_plans(template_id);

-- review_relationships: department_id（按部门筛选）
CREATE INDEX idx_review_rel_dept ON review_relationships(department_id);
```

#### 3. 可删除的冗余索引（低优先级）

```sql
-- peer_reviews.idx_cycle 被新的复合索引 idx_peer_reviews_cycle_reviewee 覆盖
-- 但保留也无大碍，仅cycle_id单独查询时有用
-- 建议：暂时保留，观察实际查询后决定
```

---

## 二、查询优化建议

### 2.1 触发器性能问题 ⚠️ 高风险

**问题**: `after_peer_review_insert` 和 `after_peer_review_update` 触发器每次都执行全量 `AVG()` + `COUNT()` 聚合查询。

**影响**: 批量插入N条互评记录会触发N次全表扫描（WHERE cycle_id=X AND reviewee_id=Y）。

**优化方案**:
- 添加复合索引 `(cycle_id, reviewee_id)` 后聚合查询从全表扫描变为索引扫描
- 预期提升: **10x-50x** (取决于表大小)
- 长期建议: 改为应用层批量计算统计，而非触发器逐行触发

### 2.2 findByCycle 查询优化

```sql
-- 当前: SELECT * FROM review_relationships WHERE cycle_id = $1 AND reviewer_id = $2
-- 使用新复合索引后，变为索引覆盖扫描
-- 预期提升: 从O(n)到O(log n)
```

### 2.3 InterviewPlanModel.findAll 排序优化

```sql
-- 当前: ORDER BY scheduled_date DESC, created_at DESC
-- 建议添加复合索引（如查询量大）:
CREATE INDEX idx_interview_plans_date_created ON interview_plans(scheduled_date DESC, created_at DESC);
-- 但该表数据量小，暂不需要
```

### 2.4 ImprovementPlanModel.findByEmployee 排序

```sql
-- 当前: WHERE employee_id = $1 [AND status = $2] ORDER BY target_date ASC NULLS LAST
-- 新复合索引 (employee_id, status) 已覆盖过滤
-- 排序只需在小结果集上进行，可接受
```

---

## 三、数据类型检查

| 字段 | 当前 | 建议 | 原因 |
|---|---|---|---|
| review_cycles.status | VARCHAR(20) | ✅ 保持 | SQLite兼容性，值少但ENUM在PG中反而麻烦 |
| peer_reviews.total_score | DECIMAL(3,1) | ✅ 保持 | 范围0.0-99.9，但实际5维*5.0=25.0足够 |
| interview_records.attachments | JSON | ✅ 保持 | 灵活的附件列表，结构不固定 |
| interview_templates.questions | JSON | ✅ 保持 | 动态问题列表，适合JSON |
| improvement_plans.progress_percentage | INT | ✅ 保持 | 0-100足够 |
| review_relationships.weight | DECIMAL(3,2) | ✅ 保持 | 0.00-9.99，实际用0-1 |

**无重大数据类型问题**。VARCHAR用于状态字段是正确选择（跨数据库兼容）。

---

## 四、表结构改进建议

### 4.1 缺失的NOT NULL约束

```sql
-- peer_reviews: cycle_id和reviewer_id已是NOT NULL（隐含在逻辑中但DDL中标注了）
-- interview_records: employee_id, manager_id 已是NOT NULL ✅
-- improvement_plans.progress_percentage 应该 NOT NULL DEFAULT 0（已经是）✅
```

### 4.2 缺失的DEFAULT值

```sql
-- interview_records.status 已有 DEFAULT 'draft' ✅
-- improvement_plans.status 已有 DEFAULT 'not_started' ✅
-- 建议: interview_plans.duration_minutes DEFAULT 60 已有 ✅
```

### 4.3 级联删除检查

| 关系 | 当前 | 建议 |
|---|---|---|
| review_relationships → review_cycles | ON DELETE CASCADE | ✅ 正确 |
| peer_reviews → review_relationships | ON DELETE CASCADE | ✅ 正确 |
| peer_reviews → review_cycles | ON DELETE CASCADE | ✅ 正确 |
| review_statistics → review_cycles | ON DELETE CASCADE | ✅ 正确 |
| interview_records → interview_plans | ON DELETE SET NULL | ✅ 正确（记录应保留） |
| improvement_plans → interview_records | ON DELETE CASCADE | ⚠️ 可考虑SET NULL |
| interview_reminders → interview_plans | ON DELETE CASCADE | ✅ 正确 |

**建议**: `improvement_plans` 的CASCADE可能导致删除面谈记录时丢失改进计划。但考虑到业务场景（删除面谈记录不常见），当前设计可接受。

### 4.4 无需分区表

1000员工 * 2周期/年 = 数据量很小，无需分区。

---

## 五、数据规模估算

### 假设: 1000名员工，每年2个互评周期

| 表 | 年增量行数 | 5年累计 | 单行大小 | 5年表大小 |
|---|---|---|---|---|
| review_cycles | 2 | 10 | ~200B | <4KB |
| review_relationships | 10,000 (每人5个关系*2周期) | 50,000 | ~100B | ~5MB |
| peer_reviews | 10,000 | 50,000 | ~500B | ~25MB |
| review_statistics | 2,000 | 10,000 | ~150B | ~1.5MB |
| interview_plans | 2,000 (每人1次/半年) | 10,000 | ~200B | ~2MB |
| interview_templates | ~10 | ~50 | ~2KB | <100KB |
| interview_records | 2,000 | 10,000 | ~1KB | ~10MB |
| improvement_plans | 4,000 (每人2个) | 20,000 | ~500B | ~10MB |
| interview_reminders | 6,000 | 30,000 | ~150B | ~4.5MB |

**总计5年**: ~58MB（不含索引）

**结论**: 数据规模很小。优化主要针对**查询效率**而非存储。核心瓶颈在触发器的聚合查询。

---

## 六、性能提升预期 (Before/After)

| 场景 | Before | After | 提升 |
|---|---|---|---|
| 触发器统计计算 (1000条互评) | 全表扫描 ~50ms/次 | 索引扫描 ~2ms/次 | **25x** |
| 按周期+评人查互评关系 | 扫描所有关系 | 索引直达 | **5-10x** |
| 查员工改进计划(按状态) | 两次过滤 | 复合索引 | **3-5x** |
| 查未发送提醒 | 全表扫描 | 部分索引 | **5-10x** |
| 整体写入性能影响 | 基准 | +7个索引维护 | **-5%~-10%** |

**综合评价**: 读性能大幅提升，写性能影响可忽略（数据量小）。
