# ATE绩效管理平台 - 技术规范

---

## 1. 组件清单

### shadcn/ui 组件
| 组件 | 用途 |
|------|------|
| Button | 所有按钮交互 |
| Card | 信息卡片容器 |
| Input | 文本输入 |
| Textarea | 多行文本输入 |
| Select | 下拉选择 |
| Dialog | 弹窗对话框 |
| Drawer | 侧滑抽屉 |
| Table | 数据表格 |
| Tabs | 标签页切换 |
| Badge | 状态标签 |
| Avatar | 用户头像 |
| Separator | 分隔线 |
| Label | 表单标签 |
| Calendar | 日期选择 |
| Popover | 浮层 |
| ScrollArea | 滚动区域 |
| Skeleton | 加载骨架 |
| Toast | 消息提示 |
| Progress | 进度条 |
| RadioGroup | 单选组 |
| Checkbox | 复选框 |

### 自定义组件
| 组件 | 用途 |
|------|------|
| Layout | 页面布局 (侧边栏+内容区) |
| Sidebar | 导航侧边栏 |
| ScoreSelector | 评分选择器 (L1-L5) |
| ScoreDisplay | 分数展示组件 |
| StarRating | 星级评分 |
| StatsCard | 统计卡片 |
| PerformanceChart | 绩效趋势图 |
| DistributionChart | 评分分布图 |
| RankTable | 排名表格 |

---

## 2. 动画实现表

| 动画 | 库 | 实现方式 | 复杂度 |
|------|-----|---------|--------|
| 页面加载淡入 | Framer Motion | AnimatePresence + motion.div | 低 |
| 内容滑入 | Framer Motion | staggerChildren + variants | 中 |
| 抽屉滑出 | shadcn Drawer | 内置动画 | 低 |
| 弹窗动画 | shadcn Dialog | 内置动画 | 低 |
| 数字跳动 | Framer Motion | useSpring + animate | 中 |
| 进度条填充 | Framer Motion | motion.div width animation | 低 |
| 表格行悬停 | Tailwind CSS | hover:bg-gray-50 transition | 低 |
| 卡片悬停 | Tailwind CSS | hover:shadow-lg hover:-translate-y-0.5 | 低 |
| 标签页切换 | Framer Motion | AnimatePresence | 中 |
| 星级评分 | Framer Motion | scale animation on hover | 低 |

---

## 3. 项目文件结构

```
app/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn/ui 组件
│   │   ├── layout/          # 布局组件
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── score/           # 评分相关组件
│   │   │   ├── ScoreSelector.tsx
│   │   │   ├── ScoreDisplay.tsx
│   │   │   └── StarRating.tsx
│   │   ├── charts/          # 图表组件
│   │   │   ├── PerformanceChart.tsx
│   │   │   └── DistributionChart.tsx
│   │   └── stats/           # 统计组件
│   │       ├── StatsCard.tsx
│   │       └── RankTable.tsx
│   ├── pages/               # 页面组件
│   │   ├── Login.tsx
│   │   ├── Employee/
│   │   │   ├── Dashboard.tsx
│   │   │   ├── WorkSummary.tsx
│   │   │   ├── MyScores.tsx
│   │   │   └── PeerReview.tsx
│   │   └── Manager/
│   │       ├── Dashboard.tsx
│   │       ├── Scoring.tsx
│   │       ├── PeerReviewManage.tsx
│   │       └── Analytics.tsx
│   ├── hooks/               # 自定义 Hooks
│   │   ├── useAuth.ts
│   │   ├── usePerformance.ts
│   │   └── useToast.ts
│   ├── stores/              # 状态管理
│   │   ├── authStore.ts
│   │   ├── performanceStore.ts
│   │   └── uiStore.ts
│   ├── types/               # TypeScript 类型
│   │   └── index.ts
│   ├── lib/                 # 工具函数
│   │   ├── utils.ts
│   │   ├── calculateScore.ts
│   │   └── mockData.ts
│   ├── App.tsx
│   └── main.tsx
├── public/
├── index.html
├── package.json
├── tailwind.config.js
└── vite.config.ts
```

---

## 4. 依赖清单

### 核心依赖
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "framer-motion": "^10.16.0",
    "zustand": "^4.4.0",
    "recharts": "^2.10.0",
    "date-fns": "^2.30.0",
    "lucide-react": "^0.294.0",
    "clsx": "^2.0.0",
    "tailwind-merge": "^2.0.0"
  }
}
```

### 安装命令
```bash
npm install framer-motion zustand recharts date-fns
```

---

## 5. 路由结构

```typescript
const routes = [
  {
    path: '/login',
    element: <Login />
  },
  {
    path: '/employee',
    element: <EmployeeLayout />,
    children: [
      { path: 'dashboard', element: <EmployeeDashboard /> },
      { path: 'summary', element: <WorkSummary /> },
      { path: 'scores', element: <MyScores /> },
      { path: 'peer-review', element: <EmployeePeerReview /> }
    ]
  },
  {
    path: '/manager',
    element: <ManagerLayout />,
    children: [
      { path: 'dashboard', element: <ManagerDashboard /> },
      { path: 'scoring', element: <ScoringManagement /> },
      { path: 'peer-review', element: <PeerReviewManage /> },
      { path: 'analytics', element: <Analytics /> }
    ]
  }
];
```

---

## 6. 状态管理设计

### Auth Store
```typescript
interface AuthState {
  user: Employee | null;
  isAuthenticated: boolean;
  role: 'employee' | 'manager' | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}
```

### Performance Store
```typescript
interface PerformanceState {
  records: PerformanceRecord[];
  currentRecord: PerformanceRecord | null;
  loading: boolean;
  
  // Actions
  fetchRecords: (filters?: Filters) => Promise<void>;
  fetchRecord: (id: string) => Promise<void>;
  saveSummary: (data: SummaryData) => Promise<void>;
  submitScore: (data: ScoreData) => Promise<void>;
  submitPeerReview: (data: PeerReviewData) => Promise<void>;
}
```

---

## 7. 关键计算逻辑

### 综合得分计算
```typescript
function calculateTotalScore(
  taskCompletion: number,  // 0.5-1.5
  initiative: number,       // 0.5-1.5
  projectFeedback: number,  // 0.5-1.5
  qualityImprovement: number // 0.5-1.5
): number {
  return (
    taskCompletion * 0.4 +
    initiative * 0.3 +
    projectFeedback * 0.2 +
    qualityImprovement * 0.1
  );
}
```

### 等级转换
```typescript
function scoreToLevel(score: number): string {
  if (score >= 1.4) return 'L5';
  if (score >= 1.15) return 'L4';
  if (score >= 0.9) return 'L3';
  if (score >= 0.65) return 'L2';
  return 'L1';
}

function levelToScore(level: string): number {
  const map: Record<string, number> = {
    'L5': 1.5,
    'L4': 1.2,
    'L3': 1.0,
    'L2': 0.8,
    'L1': 0.5
  };
  return map[level] || 1.0;
}
```

---

## 8. 响应式断点

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    screens: {
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    }
  }
}
```

---

## 9. 性能优化策略

1. **组件懒加载**: 使用 React.lazy 和 Suspense
2. **数据缓存**: Zustand store 缓存已加载数据
3. **虚拟滚动**: 长列表使用虚拟滚动
4. **图表优化**: Recharts 使用 ResponsiveContainer
5. **动画优化**: 使用 transform 和 opacity，添加 will-change

---
