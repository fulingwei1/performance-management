# Phase 2 性能测试报告

**日期:** 2026-03-02  
**测试环境:** macOS (Apple Silicon) | Node.js v25.5.0 | 本地开发环境  
**测试方法:** 自定义 Node.js benchmark (native fetch, concurrent workers)

## 测试结果

| API | 方法 | 请求数 | 并发 | RPS | Avg(ms) | P95(ms) | P99(ms) | 错误率 |
|-----|------|--------|------|-----|---------|---------|---------|--------|
| /peer-reviews/cycles | GET | 300 | 20 | 2,778 | 4.7 | 19 | 22 | 0% |
| /peer-reviews/cycles/1 | GET | 300 | 20 | 11,539 | 1.7 | 3 | 3 | 0% |
| /peer-reviews/cycles | POST | 50 | 5 | 3,333 | 1.4 | 6 | 6 | 0% |
| /peer-reviews/relationships | POST | 50 | 5 | 6,250 | 0.8 | 2 | 2 | 0% |
| /peer-reviews/relationships/1 | GET | 300 | 20 | 15,000 | 1.2 | 2 | 3 | 0% |
| /peer-reviews/reviews | POST | 100 | 10 | 5,556 | 1.7 | 4 | 5 | 0% |
| /peer-reviews/reviews/1 | GET | 300 | 20 | 16,667 | 1.2 | 2 | 2 | 0% |
| /peer-reviews/statistics/1 | GET | 200 | 10 | 15,385 | 0.6 | 1 | 1 | 0% |
| /interview-records/plans | POST | 50 | 5 | 5,556 | 0.9 | 2 | 3 | 0% |
| /interview-records/plans | GET | 300 | 20 | 16,667 | 1.2 | 2 | 2 | 0% |
| /interview-records/records | POST | 50 | 5 | 6,250 | 0.8 | 2 | 2 | 0% |
| /interview-records/records | GET | 300 | 20 | 15,790 | 1.2 | 3 | 3 | 0% |

## 性能目标对比

| 指标 | 目标 | 实际 | 状态 |
|------|------|------|------|
| 查询 API RPS | > 500 | 2,778 ~ 16,667 | ✅ 远超目标 |
| 创建 API RPS | > 100 | 3,333 ~ 6,250 | ✅ 远超目标 |
| 统计 API RPS | > 200 | 15,385 | ✅ 远超目标 |
| P95 延迟 | < 200ms | 1 ~ 22ms | ✅ 远超目标 |
| 错误率 | 0% | 0% | ✅ |

## 结论

**所有 Phase 2 API 性能均远超预期目标**，0 错误率。

### 亮点
- 统计查询 API 表现最佳 (15,385 RPS, P95=1ms)
- 所有 GET 接口 P95 < 22ms
- 所有 POST 接口 P95 < 6ms
- 批量创建评价关系 6,250 RPS，无瓶颈

### 注意事项
- 测试在本地环境执行，生产环境性能取决于网络延迟和数据库规模
- 当前数据量较小，大数据量下需复测
- 建议数据增长后重新执行，验证索引 (014_optimize_phase2_indexes.sql) 效果

## 测试脚本

`backend/tests/performance/phase2-perf.mjs`
