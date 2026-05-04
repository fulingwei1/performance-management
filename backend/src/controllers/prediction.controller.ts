import { Request, Response } from 'express';
import { SalesDataModel, SalesDataFilters } from '../models/salesData.model';
import { GrossMarginPredictionModel, PredictionModel, PredictionResult } from '../models/grossMarginPrediction.model';
import { PredictionService } from '../services/prediction.service';

export class PredictionController {
  
  // 获取历史销售数据
  static async getSalesData(req: Request, res: Response) {
    try {
      const filters: SalesDataFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        productCode: req.query.productCode as string,
        customerCode: req.query.customerCode as string,
        salesPersonId: req.query.salesPersonId as string,
        department: req.query.department as string,
        category: req.query.category as string,
        region: req.query.region as string,
      };

      const salesData = await SalesDataModel.findByFilters(filters);
      const summary = await SalesDataModel.getSummary(filters);
      const timeSeries = await SalesDataModel.getTimeSeriesData('monthly', filters);
      const categoryAnalysis = await SalesDataModel.getProductCategoryAnalysis(filters);

      res.json({
        success: true,
        data: {
          salesData,
          summary,
          timeSeries,
          categoryAnalysis
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 获取时间序列数据
  static async getTimeSeries(req: Request, res: Response) {
    try {
      const { interval = 'monthly' } = req.params;
      const filters: SalesDataFilters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };

      const timeSeries = await SalesDataModel.getTimeSeriesData(
        interval as 'daily' | 'weekly' | 'monthly',
        filters
      );

      res.json({
        success: true,
        data: timeSeries
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 执行毛利率预测
  static async predictGrossMargin(req: Request, res: Response) {
    try {
      const { 
        algorithm = 'ensemble', 
        futureMonths = 6, 
        parameters = {},
        startDate,
        endDate 
      } = req.body;

      // 准备训练数据
      const filters: SalesDataFilters = {
        startDate: startDate || '2023-01-01',
        endDate: endDate || new Date().toISOString().split('T')[0],
      };

      const trainingData = await PredictionService.prepareTrainingData(filters);
      if (trainingData.length < 3) {
        throw new Error('训练数据不足，需要至少3个月的历史数据');
      }

      let result;
      switch (algorithm) {
        case 'linear':
          result = await PredictionService.linearRegressionPrediction(trainingData, futureMonths);
          break;
        case 'moving_average':
          result = await PredictionService.movingAveragePrediction(
            trainingData, 
            parameters.windowSize || 3, 
            futureMonths
          );
          break;
        case 'exponential_smoothing':
          result = await PredictionService.exponentialSmoothingPrediction(
            trainingData, 
            parameters.alpha || 0.3, 
            futureMonths
          );
          break;
        case 'seasonal_decompose':
          result = await PredictionService.seasonalDecompositionPrediction(
            trainingData, 
            parameters.seasonalPeriod || 12, 
            futureMonths
          );
          break;
        case 'ensemble':
        default:
          result = await PredictionService.ensemblePrediction(trainingData, futureMonths);
          break;
      }

      // 保存预测模型
      const modelData = {
        name: `${algorithm}_model_${new Date().toISOString().split('T')[0]}`,
        modelType: algorithm,
        parameters,
        accuracy: {
          mae: 0, // 将在更新实际值后计算
          mse: 0,
          rmse: 0,
          mape: 0,
          r2: result.model?.r2 || 0.85
        }
      };

      const model = await GrossMarginPredictionModel.createModel(modelData);

      // 保存预测结果
      const predictionResults = result.predictions.map(prediction => ({
        modelId: model.id,
        predictionDate: prediction.date,
        predictedMargin: prediction.margin,
        confidenceInterval: prediction.confidence
      }));

      const savedPredictions = await Promise.all(
        predictionResults.map(p => GrossMarginPredictionModel.createPrediction(p))
      );

      res.json({
        success: true,
        data: {
          model,
          predictions: savedPredictions,
          algorithm: algorithm,
          trainingDataLength: trainingData.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 获取预测模型列表
  static async getModels(req: Request, res: Response) {
    try {
      const models = await GrossMarginPredictionModel.findAllModels();
      res.json({
        success: true,
        data: models
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 获取活跃模型
  static async getActiveModel(req: Request, res: Response) {
    try {
      const model = await GrossMarginPredictionModel.findActiveModel();
      res.json({
        success: true,
        data: model
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 获取预测结果
  static async getPredictions(req: Request, res: Response) {
    try {
      const { modelId } = req.params;
      const { limit = 100 } = req.query;

      const predictions = await GrossMarginPredictionModel.getPredictions(
        modelId, 
        parseInt(limit as string)
      );

      res.json({
        success: true,
        data: predictions
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 更新实际毛利率
  static async updateActualMargin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { actualMargin } = req.body;

      const updated = await GrossMarginPredictionModel.updateActualMargin(id, actualMargin);
      
      if (!updated) {
        return res.status(404).json({
          success: false,
          error: '预测结果未找到'
        });
      }

      res.json({
        success: true,
        data: updated
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 获取模型性能统计
  static async getModelPerformance(req: Request, res: Response) {
    try {
      const { modelId } = req.params;
      
      if (!modelId) {
        return res.status(400).json({
          success: false,
          error: '模型ID是必需的'
        });
      }

      const performance = await GrossMarginPredictionModel.getModelPerformance(modelId);
      
      res.json({
        success: true,
        data: performance
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 导出预测报告
  static async exportReport(req: Request, res: Response) {
    try {
      const { 
        modelId, 
        format = 'json',
        startDate,
        endDate 
      } = req.query;

      const filters: SalesDataFilters = {
        startDate: startDate as string,
        endDate: endDate as string,
      };

      // 获取历史数据
      const historicalData = await SalesDataModel.findByFilters(filters);
      const historicalSummary = await SalesDataModel.getSummary(filters);

      // 获取预测结果
      const predictions = modelId 
        ? await GrossMarginPredictionModel.getPredictions(modelId as string, 50)
        : [];

      // 获取模型性能
      let modelPerformance = null;
      if (modelId) {
        modelPerformance = await GrossMarginPredictionModel.getModelPerformance(modelId as string);
      }

      const report = {
        generatedAt: new Date().toISOString(),
        period: filters.startDate && filters.endDate 
          ? `${filters.startDate} - ${filters.endDate}` 
          : '全部历史数据',
        historicalData: {
          summary: historicalSummary,
          trendData: await SalesDataModel.getTimeSeriesData('monthly', filters),
          categoryAnalysis: await SalesDataModel.getProductCategoryAnalysis(filters)
        },
        predictions,
        modelPerformance,
        recommendations: this.generateRecommendations(historicalSummary, predictions)
      };

      if (format === 'csv') {
        // 生成CSV格式
        const csv = this.generateCSV(report);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="gross_margin_prediction_report.csv"');
        res.send(csv);
      } else {
        // 默认JSON格式
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="gross_margin_prediction_report.json"');
        res.json(report);
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  // 生成建议
  private static generateRecommendations(historicalSummary: any, predictions: any[]): string[] {
    const recommendations: string[] = [];

    if (historicalSummary.averageGrossMargin < 20) {
      recommendations.push('毛利率偏低，建议优化产品定价或降低成本');
    }

    if (predictions.length > 0) {
      const predictedTrend = predictions.slice(-3).map(p => p.predictedMargin);
      const isIncreasing = predictedTrend.every((val, i) => i === 0 || val >= predictedTrend[i - 1]);
      
      if (isIncreasing) {
        recommendations.push('预测毛利率呈上升趋势，建议保持当前策略');
      } else {
        recommendations.push('预测毛利率呈下降趋势，建议采取措施优化');
      }
    }

    if (historicalSummary.totalRevenue > 1000000) {
      recommendations.push('销售额较高，可以考虑扩大市场覆盖');
    }

    return recommendations;
  }

  // 生成CSV报告
  private static generateCSV(report: any): string {
    const lines: string[] = [];

    // 添加标题
    lines.push('报告类型,数值');
    lines.push(`生成时间,${report.generatedAt}`);
    lines.push(`分析期间,${report.period}`);
    lines.push('');

    // 历史数据摘要
    lines.push('历史数据摘要');
    lines.push(`总营收,${report.historicalData.summary.totalRevenue}`);
    lines.push(`总成本,${report.historicalData.summary.totalCost}`);
    lines.push(`毛利润,${report.historicalData.summary.totalGrossProfit}`);
    lines.push(`平均毛利率,${report.historicalData.summary.averageGrossMargin}%`);
    lines.push(`记录数量,${report.historicalData.summary.totalRecords}`);
    lines.push('');

    // 预测结果
    lines.push('预测结果');
    lines.push('预测日期,预测毛利率,实际毛利率,准确率,置信区间下限,置信区间上限');
    
    report.predictions.forEach((pred: any) => {
      lines.push(`${pred.predictionDate},${pred.predictedMargin},${pred.actualMargin || ''},${pred.accuracy || ''},${pred.confidenceInterval.lower},${pred.confidenceInterval.upper}`);
    });

    return lines.join('\n');
  }
}