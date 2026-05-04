#!/usr/bin/env ts-node

/**
 * 毛利率预测功能测试脚本
 * 用于验证预测系统的各个组件是否正常工作
 */

import { PredictionService } from './performance-management/backend/src/services/prediction.service';
import { SalesDataModel } from './performance-management/backend/src/models/salesData.model';
import { GrossMarginPredictionModel } from './performance-management/backend/src/models/grossMarginPrediction.model';

async function testPredictionService() {
  console.log('🧪 开始测试毛利率预测服务...\n');

  try {
    // 1. 测试数据准备
    console.log('📊 测试1: 准备训练数据');
    const trainingData = await PredictionService.prepareTrainingData({
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    
    console.log(`✅ 成功加载 ${trainingData.length} 条训练数据`);
    console.log(`最新数据点: ${trainingData[trainingData.length - 1]?.date} - ${trainingData[trainingData.length - 1]?.actualMargin}%\n`);

    if (trainingData.length < 3) {
      console.log('❌ 训练数据不足，需要至少3个月的数据');
      return;
    }

    // 2. 测试线性回归预测
    console.log('📈 测试2: 线性回归预测');
    const linearResult = await PredictionService.linearRegressionPrediction(trainingData, 3);
    console.log(`✅ 线性回归预测完成`);
    console.log(`   - 预测点数: ${linearResult.predictions.length}`);
    console.log(`   - R²分数: ${linearResult.model.r2.toFixed(4)}`);
    console.log(`   - 预测结果: ${linearResult.predictions[0]?.margin.toFixed(2)}%\n`);

    // 3. 测试移动平均预测
    console.log('📊 测试3: 移动平均预测');
    const movingAvgResult = await PredictionService.movingAveragePrediction(trainingData, 3, 3);
    console.log(`✅ 移动平均预测完成`);
    console.log(`   - 预测点数: ${movingAvgResult.predictions.length}`);
    console.log(`   - 模型准确度: ${movingAvgResult.model.accuracy.toFixed(4)}`);
    console.log(`   - 预测结果: ${movingAvgResult.predictions[0]?.margin.toFixed(2)}%\n`);

    // 4. 测试指数平滑预测
    console.log('🌊 测试4: 指数平滑预测');
    const expSmoothResult = await PredictionService.exponentialSmoothingPrediction(trainingData, 0.3, 3);
    console.log(`✅ 指数平滑预测完成`);
    console.log(`   - 预测点数: ${expSmoothResult.predictions.length}`);
    console.log(`   - 模型准确度: ${expSmoothResult.model.accuracy.toFixed(4)}`);
    console.log(`   - 预测结果: ${expSmoothResult.predictions[0]?.margin.toFixed(2)}%\n`);

    // 5. 测试综合预测
    console.log('🎯 测试5: 综合预测');
    const ensembleResult = await PredictionService.ensemblePrediction(trainingData, 3);
    console.log(`✅ 综合预测完成`);
    console.log(`   - 预测点数: ${ensembleResult.predictions.length}`);
    console.log(`   - 参与模型: ${ensembleResult.models.length}个`);
    ensembleResult.models.forEach((model, index) => {
      console.log(`   - 模型${index + 1} (${model.name}): 权重 ${model.weight.toFixed(4)}, 预测值 ${model.prediction.toFixed(2)}%`);
    });
    console.log(`   - 最终预测: ${ensembleResult.predictions[0]?.margin.toFixed(2)}%\n`);

    // 6. 测试季节性分解（如果数据足够）
    if (trainingData.length >= 12) {
      console.log('📅 测试6: 季节性分解预测');
      const seasonalResult = await PredictionService.seasonalDecompositionPrediction(trainingData, 12, 3);
      console.log(`✅ 季节性分解预测完成`);
      console.log(`   - 趋势值: ${seasonalResult.model.trend.toFixed(2)}`);
      console.log(`   - 预测结果: ${seasonalResult.predictions[0]?.margin.toFixed(2)}%\n`);
    }

    console.log('🎉 所有预测算法测试通过！');

  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
}

async function testDataModels() {
  console.log('🗃️ 开始测试数据模型...\n');

  try {
    // 1. 测试销售数据模型
    console.log('📊 测试1: 销售数据模型');
    const salesData = await SalesDataModel.findByFilters({
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    console.log(`✅ 成功加载 ${salesData.length} 条销售记录`);

    if (salesData.length > 0) {
      const sample = salesData[0];
      console.log(`   - 示例记录: ${sample.date} - ${sample.productName} - 毛利率: ${sample.grossMargin.toFixed(2)}%`);
    }

    // 2. 测试汇总统计
    console.log('\n📈 测试2: 汇总统计');
    const summary = await SalesDataModel.getSummary({
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    console.log(`✅ 汇总统计完成`);
    console.log(`   - 总营收: ¥${summary.totalRevenue.toLocaleString()}`);
    console.log(`   - 总成本: ¥${summary.totalCost.toLocaleString()}`);
    console.log(`   - 毛利润: ¥${summary.totalGrossProfit.toLocaleString()}`);
    console.log(`   - 平均毛利率: ${summary.averageGrossMargin.toFixed(2)}%`);
    console.log(`   - 记录数量: ${summary.totalRecords}`);

    // 3. 测试时间序列数据
    console.log('\n📅 测试3: 时间序列数据');
    const timeSeries = await SalesDataModel.getTimeSeriesData('monthly', {
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    console.log(`✅ 时间序列数据加载完成，共 ${timeSeries.length} 个月`);
    if (timeSeries.length > 0) {
      const latest = timeSeries[timeSeries.length - 1];
      console.log(`   - 最新月份: ${latest.date} - 毛利率: ${latest.grossMargin.toFixed(2)}%`);
    }

    // 4. 测试产品分类分析
    console.log('\n📦 测试4: 产品分类分析');
    const categoryAnalysis = await SalesDataModel.getProductCategoryAnalysis({
      startDate: '2024-01-01',
      endDate: '2024-12-31'
    });
    console.log(`✅ 产品分类分析完成，共 ${categoryAnalysis.length} 个分类`);
    if (categoryAnalysis.length > 0) {
      const topCategory = categoryAnalysis[0];
      console.log(`   - 最佳分类: ${topCategory.category} - 毛利率: ${topCategory.averageGrossMargin.toFixed(2)}%`);
    }

    console.log('\n🎉 数据模型测试通过！');

  } catch (error) {
    console.error('❌ 数据模型测试失败:', error);
  }
}

async function testPredictionModels() {
  console.log('🤖 开始测试预测模型...\n');

  try {
    // 1. 测试模型创建
    console.log('📝 测试1: 创建预测模型');
    const modelData = {
      name: '测试模型',
      modelType: 'linear' as const,
      parameters: { windowSize: 3 },
      accuracy: {
        mae: 2.5,
        mse: 8.2,
        rmse: 2.86,
        mape: 15.2,
        r2: 0.78
      }
    };

    const model = await GrossMarginPredictionModel.createModel(modelData);
    console.log(`✅ 模型创建成功`);
    console.log(`   - 模型ID: ${model.id}`);
    console.log(`   - 模型名称: ${model.name}`);
    console.log(`   - 模型类型: ${model.modelType}`);

    // 2. 测试预测结果创建
    console.log('\n🎯 测试2: 创建预测结果');
    const predictionData = {
      modelId: model.id,
      predictionDate: '2025-01-01',
      predictedMargin: 30.5,
      confidenceInterval: { lower: 28.2, upper: 32.8 }
    };

    const prediction = await GrossMarginPredictionModel.createPrediction(predictionData);
    console.log(`✅ 预测结果创建成功`);
    console.log(`   - 预测ID: ${prediction.id}`);
    console.log(`   - 预测日期: ${prediction.predictionDate}`);
    console.log(`   - 预测毛利率: ${prediction.predictedMargin.toFixed(2)}%`);

    // 3. 测试获取模型列表
    console.log('\n📋 测试3: 获取模型列表');
    const models = await GrossMarginPredictionModel.findAllModels();
    console.log(`✅ 获取到 ${models.length} 个模型`);

    // 4. 测试获取活跃模型
    console.log('\n⭐ 测试4: 获取活跃模型');
    const activeModel = await GrossMarginPredictionModel.findActiveModel();
    console.log(`✅ 活跃模型: ${activeModel?.name || '无'}`);

    // 5. 测试更新实际毛利率
    console.log('\n🔄 测试5: 更新实际毛利率');
    const updated = await GrossMarginPredictionModel.updateActualMargin(prediction.id, 31.2);
    if (updated) {
      console.log(`✅ 实际毛利率更新成功`);
      console.log(`   - 实际值: ${updated.actualMargin}%`);
      console.log(`   - 准确率: ${updated.accuracy?.toFixed(2)}%`);
    }

    // 6. 测试模型性能统计
    console.log('\n📊 测试6: 模型性能统计');
    const performance = await GrossMarginPredictionModel.getModelPerformance(model.id);
    console.log(`✅ 模型性能统计完成`);
    console.log(`   - 总预测数: ${performance.totalPredictions}`);
    console.log(`   - 平均准确率: ${performance.averageAccuracy.toFixed(2)}%`);
    console.log(`   - 最佳准确率: ${performance.bestAccuracy.toFixed(2)}%`);
    console.log(`   - 最差准确率: ${performance.worstAccuracy.toFixed(2)}%`);

    console.log('\n🎉 预测模型测试通过！');

  } catch (error) {
    console.error('❌ 预测模型测试失败:', error);
  }
}

async function main() {
  console.log('='.repeat(50));
  console.log('🚀 毛利率预测系统测试');
  console.log('='.repeat(50));
  console.log('');

  // 运行各项测试
  await testPredictionService();
  console.log('\n' + '='.repeat(30) + '\n');
  
  await testDataModels();
  console.log('\n' + '='.repeat(30) + '\n');
  
  await testPredictionModels();
  
  console.log('\n' + '='.repeat(50));
  console.log('🎊 所有测试完成！');
  console.log('='.repeat(50));
}

// 运行测试
if (require.main === module) {
  main().catch(console.error);
}

export { testPredictionService, testDataModels, testPredictionModels };