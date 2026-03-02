# 性能测试报告

> 生成时间: 2026-03-02T10:15:46.381Z
> 迭代次数: 10
> 容忍波动: 10%

## API 响应时间

| 接口 | 平均(ms) | 最小(ms) | 最大(ms) | P95(ms) | 阈值(ms) | 结果 |
|------|---------|---------|---------|---------|---------|------|
| GET /api/peer-review-cycles/cycles | 0.71 | 0.61 | 0.97 | 0.97 | 100 | ✅ |
| GET /api/peer-review-cycles/cycles/test-id/reviews | 0.54 | 0.49 | 0.71 | 0.71 | 200 | ✅ |
| GET /api/interview-records/plans | 0.55 | 0.47 | 0.65 | 0.65 | 100 | ✅ |
| GET /api/interview-records/records | 0.49 | 0.46 | 0.58 | 0.58 | 200 | ✅ |
