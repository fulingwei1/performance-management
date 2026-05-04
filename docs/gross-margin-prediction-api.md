# 毛利率预测分析 API 文档

## 概述

毛利率预测分析系统是基于历史销售数据，使用多种机器学习算法对未来毛利率进行预测的分析工具。系统支持多种预测算法，包括线性回归、移动平均、指数平滑、季节性分解和综合预测。

## API 端点

### 1. 销售数据相关接口

#### 获取销售数据
```
GET /api/prediction/sales-data

查询参数：
- startDate (string): 开始日期 (YYYY-MM-DD)
- endDate (string): 结束日期 (YYYY-MM-DD)
- productCode (string): 产品代码
- customerCode (string): 客户代码
- salesPersonId (string): 销售人员ID
- department (string): 部门
- category (string): 产品分类
- region (string): 地区

响应：
{
  "success": true,
  "data": {
    "salesData": [...],
    "summary": {...},
    "timeSeries": [...],
    "categoryAnalysis": [...]
  }
}
```

#### 获取时间序列数据
```
GET /api/prediction/time-series/:interval

路径参数：
- interval: 时间粒度 (daily, weekly, monthly)

查询参数：
- startDate (string): 开始日期 (YYYY-MM-DD)
- endDate (string): 结束日期 (YYYY-MM-DD)

响应：
{
  "success": true,
  "data": [
    {
      "date": "2024-01-01",
      "revenue": 1000000,
      "cost": 700000,
      "grossProfit": 300000,
      "grossMargin": 30.0
    }
  ]
}
```

### 2. 预测相关接口

#### 执行毛利率预测
```
POST /api/prediction/predict

请求体：
{
  "algorithm": "ensemble", // 预测算法
  "futureMonths": 6, // 预测月数
  "parameters": {}, // 算法参数
  "startDate": "2023-01-01", // 训练数据开始日期
  "endDate": "2024-12-31" // 训练数据结束日期
}

响应：
{
  "success": true,
  "data": {
    "model": {...},
    "predictions": [...],
    "algorithm": "ensemble",
    "trainingDataLength": 24
  }
}
```

#### 获取预测模型列表
```
GET /api/prediction/models

响应：
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "线性回归基础模型",
      "modelType": "linear",
      "parameters": {...},
      "accuracy": {...},
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### 获取活跃模型
```
GET /api/prediction/models/active

响应：
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "当前活跃模型",
    "modelType": "ensemble",
    "parameters": {...},
    "accuracy": {...},
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

#### 获取预测结果
```
GET /api/prediction/predictions/:modelId?limit=100

路径参数：
- modelId: 模型ID

查询参数：
- limit (number): 返回记录数量限制

响应：
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "modelId": "uuid",
      "predictionDate": "2025-01-01",
      "predictedMargin": 30.5,
      "confidenceInterval": {
        "lower": 28.2,
        "upper": 32.8
      },
      "actualMargin": 31.2,
      "accuracy": 4.17,
      "createdAt": "2024-12-01T00:00:00Z"
    }
  ]
}
```

#### 更新实际毛利率
```
PUT /api/prediction/predictions/:id/actual

路径参数：
- id: 预测结果ID

请求体：
{
  "actualMargin": 31.2
}

响应：
{
  "success": true,
  "data": {
    "id": "uuid",
    "modelId": "uuid",
    "predictionDate": "2025-01-01",
    "predictedMargin": 30.5,
    "confidenceInterval": {...},
    "actualMargin": 31.2,
    "accuracy": 4.17,
    "createdAt": "2024-12-01T00:00:00Z"
  }
}
```

#### 获取模型性能统计
```
GET /api/prediction/models/:modelId/performance

路径参数：
- modelId: 模型ID

响应：
{
  "success": true,
  "data": {
    "totalPredictions": 12,
    "averageAccuracy": 5.2,
    "bestAccuracy": 1.5,
    "worstAccuracy": 15.8,
    "predictionsWithActuals": 8
  }
}
```

### 3. 报告导出接口

#### 导出预测报告
```
GET /api/prediction/export?format=json&modelId=uuid&startDate=2024-01-01&endDate=2024-12-31

查询参数：
- format: 报告格式 (json, csv)
- modelId: 模型ID (可选)
- startDate: 开始日期 (可选)
- endDate: 结束日期 (可选)

响应：
JSON格式：
{
  "generatedAt": "2024-12-01T00:00:00Z",
  "period": "2024-01-01 - 2024-12-31",
  "historicalData": {
    "summary": {...},
    "trendData": [...],
    "categoryAnalysis": [...]
  },
  "predictions": [...],
  "modelPerformance": {...},
  "recommendations": [...]
}

CSV格式：直接下载CSV文件
```

## 预测算法说明

### 1. 线性回归 (Linear Regression)
- **原理**: 使用最小二乘法拟合线性关系
- **适用场景**: 数据呈现线性趋势
- **参数**: 无特殊参数
- **优势**: 简单易理解，解释性强
- **劣势**: 无法处理复杂非线性关系

### 2. 移动平均 (Moving Average)
- **原理**: 使用最近n个数据的平均值作为预测值
- **适用场景**: 短期预测，数据波动较小
- **参数**: windowSize - 窗口大小 (默认3)
- **优势**: 简单，对噪声有一定平滑作用
- **劣势**: 滞后性明显，无法捕捉趋势变化

### 3. 指数平滑 (Exponential Smoothing)
- **原理**: 对历史数据赋予不同权重，近期权重更高
- **适用场景**: 短期预测，数据有趋势
- **参数**: alpha - 平滑系数 (默认0.3)
- **优势**: 对近期变化更敏感
- **劣势**: 参数调优较复杂

### 4. 季节性分解 (Seasonal Decomposition)
- **原理**: 将数据分解为趋势、季节性和残差三部分
- **适用场景**: 具有明显季节性模式的数据
- **参数**: seasonalPeriod - 季节性周期 (默认12)
- **优势**: 能处理季节性变化
- **劣势**: 需要足够长的历史数据

### 5. 综合预测 (Ensemble)
- **原理**: 结合多种算法的预测结果，加权平均
- **适用场景**: 复杂业务场景，提高预测准确性
- **参数**: 基于各算法的性能自动分配权重
- **优势**: 鲁棒性强，准确性较高
- **劣势**: 计算复杂度较高

## 数据模型

### 销售数据表 (sales_data)
```typescript
interface SalesRecord {
  id: string;                    // UUID
  date: string;                  // 日期 (YYYY-MM-DD)
  productCode: string;          // 产品代码
  productName: string;          // 产品名称
  customerCode: string;         // 客户代码
  customerName: string;         // 客户名称
  quantity: number;             // 数量
  unitPrice: number;            // 单价
  totalPrice: number;           // 总价格
  costOfGoods: number;          // 商品成本
  grossProfit: number;          // 毛利润
  grossMargin: number;          // 毛利率百分比
  salesPersonId: string;        // 销售人员ID
  salesPersonName: string;      // 销售人员姓名
  department: string;           // 部门
  category: string;             // 产品分类
  region: string;              // 地区
  createdAt: Date;             // 创建时间
  updatedAt: Date;             // 更新时间
}
```

### 预测模型表 (prediction_models)
```typescript
interface PredictionModel {
  id: string;                    // UUID
  name: string;                  // 模型名称
  modelType: string;             // 模型类型
  parameters: Record<string, any>; // 模型参数
  accuracy: {                    // 模型性能指标
    mae: number;                 // 平均绝对误差
    mse: number;                 // 均方误差
    rmse: number;                // 均方根误差
    mape: number;                // 平均绝对百分比误差
    r2: number;                  // 决定系数
  };
  isActive: boolean;             // 是否活跃
  createdAt: Date;               // 创建时间
  updatedAt: Date;               // 更新时间
}
```

### 预测结果表 (prediction_results)
```typescript
interface PredictionResult {
  id: string;                    // UUID
  modelId: string;              // 模型ID
  predictionDate: string;        // 预测日期
  predictedMargin: number;       // 预测毛利率
  confidenceInterval: {         // 置信区间
    lower: number;              // 下限
    upper: number;              // 上限
  };
  actualMargin?: number;         // 实际毛利率
  accuracy?: number;             // 预测准确度
  createdAt: Date;              // 创建时间
}
```

## 使用示例

### 1. 执行预测
```javascript
// 使用综合算法预测未来6个月的毛利率
const response = await fetch('/api/prediction/predict', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    algorithm: 'ensemble',
    futureMonths: 6,
    parameters: {},
    startDate: '2023-01-01',
    endDate: '2024-12-31'
  })
});

const result = await response.json();
console.log('预测结果:', result.data.predictions);
```

### 2. 更新实际值
```javascript
// 更新某个预测点的实际毛利率
const response = await fetch('/api/prediction/predictions/uuid-123/actual', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    actualMargin: 31.2
  })
});
```

### 3. 获取模型性能
```javascript
// 获取特定模型的性能统计
const response = await fetch('/api/prediction/models/uuid-456/performance');
const result = await response.json();
console.log('模型性能:', result.data);
```

## 最佳实践

1. **数据质量**: 确保销售数据完整、准确，包含足够的样本量
2. **算法选择**: 根据数据特征选择合适的算法，综合预测通常效果最好
3. **参数调优**: 针对特定数据特点调整算法参数
4. **定期验证**: 定期用实际数据验证预测准确性
5. **模型更新**: 当业务模式变化时重新训练模型

## 错误处理

常见错误代码及含义：
- `400`: 请求参数错误
- `404`: 资源未找到
- `422`: 数据验证失败
- `500`: 服务器内部错误

错误响应格式：
```json
{
  "success": false,
  "error": "错误描述信息"
}
```