# Phase 2 & 3 甘特图

> 项目: 绩效管理系统 - Phase 2 & 3  
> 时间范围: 2026-03-03 ~ 2026-06-13  
> 总周期: 15周  

---

## Phase 2 甘特图（Week 1-3）

```mermaid
gantt
    title Phase 2: 高级功能开发（2026-03-03 ~ 2026-03-21）
    dateFormat YYYY-MM-DD
    
    section Week 1: 核心功能
    360度互评-数据库设计           :a1, 2026-03-03, 1d
    360度互评-后端API              :a2, after a1, 1d
    360度互评-前端页面             :a3, after a2, 1d
    360度互评-功能完善             :a4, after a3, 1d
    面谈记录-数据库设计            :a5, 2026-03-05, 1d
    面谈记录-前端开发              :a6, after a5, 1d
    Week1收尾测试                  :a7, after a6, 1d
    
    section Week 2: 测试优化
    后端Model测试                  :b1, 2026-03-10, 1d
    后端Controller测试             :b2, after b1, 1d
    前端组件测试                   :b3, after b2, 1d
    CI/CD配置                      :b4, after b3, 1d
    性能优化                       :b5, after b4, 1d
    
    section Week 3: 生产部署
    生产环境准备                   :c1, 2026-03-17, 1d
    部署和验证                     :c2, after c1, 1d
    监控告警                       :c3, after c2, 1d
    用户培训                       :c4, after c3, 1d
    Phase2总结                     :c5, after c4, 1d
    
    section 里程碑
    Phase 2 Week 1完成             :milestone, m1, 2026-03-09, 0d
    Phase 2 Week 2完成             :milestone, m2, 2026-03-16, 0d
    Phase 2完成                    :milestone, m3, 2026-03-21, 0d
```

---

## Phase 3 甘特图（Week 4-15）

```mermaid
gantt
    title Phase 3: 智能化（2026-04-21 ~ 2026-06-13）
    dateFormat YYYY-MM-DD
    
    section Week 4-5: AI增强
    AI评分建议-数据分析            :d1, 2026-04-21, 2d
    AI评分建议-推荐算法            :d2, after d1, 3d
    异常评分检测-统计算法          :d3, after d2, 2d
    异常评分检测-预警系统          :d4, after d3, 2d
    
    section Week 6-7: 预测模型
    绩效预测-时间序列模型          :e1, 2026-05-05, 3d
    绩效预测-高潜力识别            :e2, after e1, 2d
    绩效预测-风险预警              :e3, after e2, 1d
    NLP评价生成-API集成            :e4, after e3, 2d
    NLP评价生成-提示词工程         :e5, after e4, 2d
    
    section Week 8-10: 数据分析
    绩效趋势可视化                 :f1, 2026-05-20, 3d
    部门对比分析                   :f2, after f1, 4d
    个人成长轨迹                   :f3, after f2, 3d
    
    section Week 11-15: 组织健康度
    健康度报告-绩效分布            :g1, 2026-06-06, 2d
    健康度报告-离职风险            :g2, after g1, 2d
    健康度报告-改进建议            :g3, after g2, 2d
    整合测试优化                   :g4, after g3, 3d
    
    section 里程碑
    Phase 3 Week 1完成             :milestone, m4, 2026-05-02, 0d
    Phase 3 Week 2完成             :milestone, m5, 2026-05-16, 0d
    Phase 3 Week 3完成             :milestone, m6, 2026-05-30, 0d
    Phase 3完成                    :milestone, m7, 2026-06-13, 0d
```

---

## 完整时间线总览

```mermaid
gantt
    title 绩效管理系统完整开发时间线（Phase 1-3）
    dateFormat YYYY-MM-DD
    
    section Phase 1
    核心功能开发                   :done, p1, 2026-02-24, 7d
    
    section Phase 2
    360度互评+面谈记录             :p2a, 2026-03-03, 7d
    单元测试+CI/CD                 :p2b, after p2a, 7d
    生产部署+监控                  :p2c, after p2b, 5d
    
    section Phase 3
    AI评分+异常检测                :p3a, 2026-04-21, 14d
    绩效预测+NLP                   :p3b, after p3a, 14d
    可视化+健康度报告              :p3c, after p3b, 18d
    
    section 版本发布
    v1.0.0 Phase 1                 :milestone, 2026-03-01, 0d
    v1.1.0 Phase 2                 :milestone, 2026-03-21, 0d
    v2.0.0 Phase 3                 :milestone, 2026-06-13, 0d
```

---

## 资源分配甘特图

```mermaid
gantt
    title 团队资源分配（按角色）
    dateFormat YYYY-MM-DD
    
    section 全栈开发
    Phase 2 开发                   :r1, 2026-03-03, 19d
    Phase 3 开发                   :r2, 2026-04-21, 54d
    
    section 后端开发
    Phase 2 API开发                :r3, 2026-03-03, 15d
    Phase 3 AI服务                 :r4, 2026-04-21, 35d
    
    section 前端开发
    Phase 2 UI开发                 :r5, 2026-03-03, 15d
    Phase 3 可视化                 :r6, 2026-05-20, 25d
    
    section 测试工程师
    单元测试                       :r7, 2026-03-10, 10d
    E2E测试                        :r8, 2026-06-06, 8d
    
    section DevOps
    CI/CD配置                      :r9, 2026-03-13, 5d
    生产部署                       :r10, 2026-03-17, 3d
    
    section 数据科学家
    AI模型开发                     :r11, 2026-04-21, 20d
    模型优化                       :r12, 2026-05-20, 15d
```

---

## 关键路径分析

### Phase 2 关键路径
```
360度互评 → 面谈记录 → 单元测试 → CI/CD → 生产部署
   (5天)      (3天)      (5天)     (2天)    (3天)
   
总计: 18天（含周末休息3天 = 21天 = 3周）
```

### Phase 3 关键路径
```
AI评分建议 → 异常检测 → 绩效预测 → 可视化 → 健康度报告
   (5天)      (4天)     (6天)     (10天)    (6天)
   
总计: 31天工作日（含周末 ≈ 54天 = 8周）

实际时间线: 2026-04-21 ~ 2026-06-13（~8周）
```

---

## 依赖关系图

```mermaid
graph TD
    A[Phase 1 完成] -->|v1.0.0| B[Phase 2: 360度互评]
    A -->|v1.0.0| C[Phase 2: 面谈记录]
    B --> D[单元测试]
    C --> D
    D --> E[CI/CD配置]
    E --> F[生产部署]
    F -->|v1.1.0| G[Phase 3: AI评分]
    F -->|v1.1.0| H[Phase 3: 异常检测]
    G --> I[绩效预测]
    H --> I
    I --> J[NLP生成]
    J --> K[数据可视化]
    K --> L[健康度报告]
    L -->|v2.0.0| M[项目完成]
    
    style A fill:#90EE90
    style F fill:#FFD700
    style M fill:#FF6B6B
```

---

## 并行任务优化

### Phase 2 并行策略
```
Week 1: 
  开发者A: 360度互评后端
  开发者B: 面谈记录前端
  （2天后交叉集成）

Week 2:
  开发者A: 后端测试
  开发者B: 前端测试
  DevOps: CI/CD配置（并行）

Week 3:
  全员: 生产部署（串行）
```

### Phase 3 并行策略
```
Week 4-5:
  数据科学家: AI模型开发
  后端开发: API接口准备
  （独立并行）

Week 8-10:
  前端开发: 可视化组件
  后端开发: 数据聚合API
  （并行开发，最后集成）
```

---

## 风险缓冲时间

### 已预留缓冲
- Phase 2: 每周预留1天缓冲（周五）
- Phase 3: 每2周预留2天缓冲
- 总缓冲时间: ~10天（约15%）

### 应急措施
如果进度落后:
1. **Week 1延期** → 压缩IDP功能（延后到Phase 3）
2. **Week 2延期** → 降低测试覆盖率目标（60% → 50%）
3. **Week 3延期** → 简化监控配置
4. **Phase 3延期** → 削减非核心AI功能

---

## 里程碑检查点

| 日期 | 里程碑 | 验收标准 | 风险等级 |
|------|--------|----------|----------|
| 2026-03-01 | Phase 1 完成 ✅ | 测试100%通过 | ✅ 低 |
| 2026-03-09 | Phase 2 Week 1 | 2个功能上线 | ⚠️ 中 |
| 2026-03-16 | Phase 2 Week 2 | 覆盖率60%+ | ⚠️ 中 |
| 2026-03-21 | Phase 2 完成 | 生产稳定运行 | 🔴 高 |
| 2026-05-02 | Phase 3 Week 1 | AI准确率90%+ | ⚠️ 中 |
| 2026-05-16 | Phase 3 Week 2 | 预测偏差<10% | ⚠️ 中 |
| 2026-05-30 | Phase 3 Week 3 | 图表<1s渲染 | ⚠️ 中 |
| 2026-06-13 | Phase 3 完成 | 完整验收 | 🔴 高 |

---

## 使用说明

### 在Markdown中查看
- GitHub/GitLab: 自动渲染Mermaid图表
- VS Code: 安装Mermaid插件
- Obsidian: 原生支持Mermaid

### 导出为图片
```bash
# 使用 mermaid-cli
npm install -g @mermaid-js/mermaid-cli
mmdc -i GANTT_CHART.md -o gantt-phase2.png -t forest
```

### 交互式查看
- 使用HTML版本（见下一个文件）
- 导入到项目管理工具（Jira/Trello/Monday）

---

**生成时间**: 2026-03-01  
**计划周期**: 15周  
**总工时**: 约56个工作日
