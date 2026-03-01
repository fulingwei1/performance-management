# 性能测试报告

> 生成时间: 2026-03-01T11:12:41.824Z
> 迭代次数: 10
> 容忍波动: 10.000000000000009%

## API 响应时间

| 接口 | 平均(ms) | 最小(ms) | 最大(ms) | P95(ms) | 阈值(ms) | 结果 |
|------|---------|---------|---------|---------|---------|------|
| GET /api/peer-review-cycles/cycles | 1.04 | 0.78 | 1.68 | 1.68 | 100 | ✅ |
| GET /api/peer-review-cycles/cycles/test-id/reviews | 0.79 | 0.61 | 1.12 | 1.12 | 200 | ✅ |
| GET /api/interview-records/plans | 0.63 | 0.55 | 1.08 | 1.08 | 100 | ✅ |
| GET /api/interview-records/records | 0.58 | 0.51 | 0.7 | 0.7 | 200 | ✅ |
