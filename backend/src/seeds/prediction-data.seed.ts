import { query } from '../config/database';

export async function seedSalesData() {
  console.log('开始插入示例销售数据...');

  const sampleSalesData = [
    {
      date: '2024-01-15',
      productCode: 'P001',
      productName: 'ICT测试设备A',
      customerCode: 'C001',
      customerName: '深圳电子科技有限公司',
      quantity: 5,
      unitPrice: 85000,
      totalPrice: 425000,
      costOfGoods: 297500,
      salesPersonId: 'S001',
      salesPersonName: '张三',
      department: '销售部',
      category: 'ICT设备',
      region: '华南'
    },
    {
      date: '2024-01-20',
      productCode: 'P002',
      productName: 'FCT测试设备B',
      customerCode: 'C002',
      customerName: '东莞制造企业',
      quantity: 3,
      unitPrice: 120000,
      totalPrice: 360000,
      costOfGoods: 252000,
      salesPersonId: 'S002',
      salesPersonName: '李四',
      department: '销售部',
      category: 'FCT设备',
      region: '华南'
    },
    {
      date: '2024-02-10',
      productCode: 'P001',
      productName: 'ICT测试设备A',
      customerCode: 'C003',
      customerName: '上海精密仪器',
      quantity: 2,
      unitPrice: 82000,
      totalPrice: 164000,
      costOfGoods: 114800,
      salesPersonId: 'S001',
      salesPersonName: '张三',
      department: '销售部',
      category: 'ICT设备',
      region: '华东'
    },
    {
      date: '2024-02-15',
      productCode: 'P003',
      productName: '视觉检测设备C',
      customerCode: 'C004',
      customerName: '苏州自动化科技',
      quantity: 1,
      unitPrice: 180000,
      totalPrice: 180000,
      costOfGoods: 126000,
      salesPersonId: 'S003',
      salesPersonName: '王五',
      department: '销售部',
      category: '视觉检测',
      region: '华东'
    },
    {
      date: '2024-03-05',
      productCode: 'P002',
      productName: 'FCT测试设备B',
      customerCode: 'C005',
      customerName: '杭州电子设备',
      quantity: 4,
      unitPrice: 115000,
      totalPrice: 460000,
      costOfGoods: 322000,
      salesPersonId: 'S002',
      salesPersonName: '李四',
      department: '销售部',
      category: 'FCT设备',
      region: '华东'
    },
    {
      date: '2024-03-12',
      productCode: 'P004',
      productName: '烧录设备D',
      customerCode: 'C006',
      customerName: '深圳软件科技',
      quantity: 2,
      unitPrice: 65000,
      totalPrice: 130000,
      costOfGoods: 91000,
      salesPersonId: 'S004',
      salesPersonName: '赵六',
      department: '销售部',
      category: '烧录设备',
      region: '华南'
    },
    {
      date: '2024-04-08',
      productCode: 'P001',
      productName: 'ICT测试设备A',
      customerCode: 'C007',
      customerName: '北京电子工程',
      quantity: 6,
      unitPrice: 88000,
      totalPrice: 528000,
      costOfGoods: 369600,
      salesPersonId: 'S005',
      salesPersonName: '钱七',
      department: '销售部',
      category: 'ICT设备',
      region: '华北'
    },
    {
      date: '2024-04-18',
      productCode: 'P003',
      productName: '视觉检测设备C',
      customerCode: 'C008',
      customerName: '广州自动化',
      quantity: 3,
      unitPrice: 175000,
      totalPrice: 525000,
      costOfGoods: 367500,
      salesPersonId: 'S003',
      salesPersonName: '王五',
      department: '销售部',
      category: '视觉检测',
      region: '华南'
    },
    {
      date: '2024-05-03',
      productCode: 'P002',
      productName: 'FCT测试设备B',
      customerCode: 'C009',
      customerName: '南京精密制造',
      quantity: 2,
      unitPrice: 125000,
      totalPrice: 250000,
      costOfGoods: 175000,
      salesPersonId: 'S002',
      salesPersonName: '李四',
      department: '销售部',
      category: 'FCT设备',
      region: '华东'
    },
    {
      date: '2024-05-15',
      productCode: 'P005',
      productName: '老化设备E',
      customerCode: 'C010',
      customerName: '成都电子科技',
      quantity: 1,
      unitPrice: 220000,
      totalPrice: 220000,
      costOfGoods: 154000,
      salesPersonId: 'S006',
      salesPersonName: '孙八',
      department: '销售部',
      category: '老化设备',
      region: '西南'
    }
  ];

  for (const data of sampleSalesData) {
    const grossProfit = data.totalPrice - data.costOfGoods;
    const grossMargin = (grossProfit / data.totalPrice) * 100;

    await query(`
      INSERT INTO sales_data (
        date, product_code, product_name, customer_code, customer_name,
        quantity, unit_price, total_price, cost_of_goods, gross_profit,
        gross_margin, sales_person_id, sales_person_name, department,
        category, region, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (date, product_code, customer_code) DO NOTHING
    `, [
      data.date,
      data.productCode,
      data.productName,
      data.customerCode,
      data.customerName,
      data.quantity,
      data.unitPrice,
      data.totalPrice,
      data.costOfGoods,
      grossProfit,
      grossMargin,
      data.salesPersonId,
      data.salesPersonName,
      data.department,
      data.category,
      data.region
    ]);
  }

  console.log('示例销售数据插入完成');
}

export async function seedTimeSeriesData() {
  console.log('开始插入时间序列数据...');

  const monthlyData = [
    { month: '2024-01', revenue: 785000, cost: 549500, grossProfit: 235500, grossMargin: 30.0 },
    { month: '2024-02', revenue: 344000, cost: 241800, grossProfit: 102200, grossMargin: 29.7 },
    { month: '2024-03', revenue: 590000, cost: 413100, grossProfit: 176900, grossMargin: 30.0 },
    { month: '2024-04', revenue: 1053000, cost: 737100, grossProfit: 315900, grossMargin: 30.0 },
    { month: '2024-05', revenue: 470000, cost: 329000, grossProfit: 141000, grossMargin: 30.0 },
    { month: '2024-06', revenue: 920000, cost: 644000, grossProfit: 276000, grossMargin: 30.0 },
    { month: '2024-07', revenue: 1250000, cost: 875000, grossProfit: 375000, grossMargin: 30.0 },
    { month: '2024-08', revenue: 880000, cost: 616000, grossProfit: 264000, grossMargin: 30.0 },
    { month: '2024-09', revenue: 1150000, cost: 805000, grossProfit: 345000, grossMargin: 30.0 },
    { month: '2024-10', revenue: 1350000, cost: 945000, grossProfit: 405000, grossMargin: 30.0 },
    { month: '2024-11', revenue: 1420000, cost: 994000, grossProfit: 426000, grossMargin: 30.0 },
    { month: '2024-12', revenue: 1580000, cost: 1106000, grossProfit: 474000, grossMargin: 30.0 }
  ];

  for (const data of monthlyData) {
    await query(`
      INSERT INTO sales_data (
        date, product_code, product_name, customer_code, customer_name,
        quantity, unit_price, total_price, cost_of_goods, gross_profit,
        gross_margin, sales_person_id, sales_person_name, department,
        category, region, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT (date, product_code, customer_code) DO NOTHING
    `, [
      data.month + '-01',
      'TIME_SERIES_' + data.month,
      '时间序列产品',
      'TIME_SERIES_CUST_' + data.month,
      '时间序列客户',
      1,
      data.revenue,
      data.revenue,
      data.cost,
      data.grossProfit,
      data.grossMargin,
      'TIME_SERIES_SALES',
      '时间序列销售员',
      '销售部',
      '时间序列',
      '全国'
    ]);
  }

  console.log('时间序列数据插入完成');
}

export async function seedPredictionResults() {
  console.log('开始插入预测结果...');

  const predictionResults = [
    {
      modelId: '00000000-0000-0000-0000-000000000001', // 线性回归模型ID
      predictionDate: '2025-01-01',
      predictedMargin: 30.5,
      confidenceInterval: { lower: 28.2, upper: 32.8 },
      actualMargin: 31.2,
      accuracy: 4.17
    },
    {
      modelId: '00000000-0000-0000-0000-000000000001',
      predictionDate: '2025-02-01',
      predictedMargin: 30.8,
      confidenceInterval: { lower: 28.5, upper: 33.1 },
      actualMargin: 30.1,
      accuracy: 2.33
    },
    {
      modelId: '00000000-0000-0000-0000-000000000002', // 移动平均模型ID
      predictionDate: '2025-01-01',
      predictedMargin: 30.2,
      confidenceInterval: { lower: 27.9, upper: 32.5 },
      actualMargin: 31.2,
      accuracy: 3.21
    },
    {
      modelId: '00000000-0000-0000-0000-000000000003', // 季节性分解模型ID
      predictionDate: '2025-01-01',
      predictedMargin: 30.6,
      confidenceInterval: { lower: 28.3, upper: 32.9 },
      actualMargin: 31.2,
      accuracy: 1.94
    }
  ];

  for (const result of predictionResults) {
    await query(`
      INSERT INTO prediction_results (
        model_id, prediction_date, predicted_margin, confidence_interval,
        actual_margin, accuracy, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT (prediction_date, model_id) DO UPDATE SET
        predicted_margin = EXCLUDED.predicted_margin,
        confidence_interval = EXCLUDED.confidence_interval,
        actual_margin = EXCLUDED.actual_margin,
        accuracy = EXCLUDED.accuracy,
        created_at = CURRENT_TIMESTAMP
    `, [
      result.modelId,
      result.predictionDate,
      result.predictedMargin,
      JSON.stringify(result.confidenceInterval),
      result.actualMargin,
      result.accuracy
    ]);
  }

  console.log('预测结果插入完成');
}

// 主种子函数
export async function runPredictionSeed() {
  try {
    await seedSalesData();
    await seedTimeSeriesData();
    await seedPredictionResults();
    console.log('毛利率预测数据种子插入完成');
  } catch (error) {
    console.error('插入数据时发生错误:', error);
    throw error;
  }
}