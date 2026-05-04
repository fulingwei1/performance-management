import { SalesDataModel, SalesDataFilters } from '../models/salesData.model';
import { GrossMarginPredictionModel, PredictionModel, PredictionResult, TrainingData } from '../models/grossMarginPrediction.model';

export class PredictionService {
  // 准备训练数据
  static async prepareTrainingData(filters?: SalesDataFilters): Promise<TrainingData[]> {
    const salesData = await SalesDataModel.findByFilters(filters || { 
      startDate: '2023-01-01', 
      endDate: new Date().toISOString().split('T')[0] 
    });
    
    const timeSeries = await SalesDataModel.getTimeSeriesData('monthly', filters);
    
    return timeSeries.map(item => ({
      date: item.date,
      actualMargin: item.grossMargin,
      revenue: item.revenue,
      cost: item.cost,
      trend: this.calculateTrend(timeSeries, item.date),
      seasonality: this.calculateSeasonality(timeSeries, item.date)
    }));
  }

  // 线性回归预测
  static async linearRegressionPrediction(data: TrainingData[], futureMonths: number = 6): Promise<{
    predictions: { date: string; margin: number; confidence: { lower: number; upper: number } }[];
    model: { slope: number; intercept: number; r2: number };
  }> {
    if (data.length < 2) {
      throw new Error('数据不足，无法进行线性回归预测');
    }

    // 将日期转换为数字
    const numericData = data.map((item, index) => ({
      x: index,
      y: item.actualMargin
    }));

    // 计算线性回归参数
    const n = numericData.length;
    const sumX = numericData.reduce((sum, item) => sum + item.x, 0);
    const sumY = numericData.reduce((sum, item) => sum + item.y, 0);
    const sumXY = numericData.reduce((sum, item) => sum + item.x * item.y, 0);
    const sumX2 = numericData.reduce((sum, item) => sum + item.x * item.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 计算R²
    const yMean = sumY / n;
    const totalSumSquares = numericData.reduce((sum, item) => sum + Math.pow(item.y - yMean, 2), 0);
    const residualSumSquares = numericData.reduce((sum, item) => {
      const predicted = slope * item.x + intercept;
      return sum + Math.pow(item.y - predicted, 2);
    }, 0);
    const r2 = 1 - (residualSumSquares / totalSumSquares);

    // 预测未来值
    const predictions = [];
    const lastX = numericData[numericData.length - 1].x;
    
    for (let i = 1; i <= futureMonths; i++) {
      const futureX = lastX + i;
      const predictedMargin = slope * futureX + intercept;
      
      // 计算置信区间（简单估计）
      const residuals = numericData.map(item => item.y - (slope * item.x + intercept));
      const residualStd = Math.sqrt(residuals.reduce((sum, r) => sum + r * r, 0) / residuals.length);
      const marginOfError = 1.96 * residualStd * Math.sqrt(1 + 1/n + Math.pow(futureX - sumX/n, 2) / (sumX2 - sumX * sumX / n));
      
      predictions.push({
        date: this.getDateFromOffset(data[data.length - 1].date, i),
        margin: predictedMargin,
        confidence: {
          lower: predictedMargin - marginOfError,
          upper: predictedMargin + marginOfError
        }
      });
    }

    return {
      predictions,
      model: { slope, intercept, r2 }
    };
  }

  // 移动平均预测
  static async movingAveragePrediction(data: TrainingData[], windowSize: number = 3, futureMonths: number = 6): Promise<{
    predictions: { date: string; margin: number; confidence: { lower: number; upper: number } }[];
    model: { windowSize: number; accuracy: number };
  }> {
    if (data.length < windowSize) {
      throw new Error(`数据不足，需要至少${windowSize}个数据点`);
    }

    const predictions = [];
    const actualValues = data.map(d => d.actualMargin);
    
    // 计算移动平均
    const movingAverages = [];
    for (let i = windowSize - 1; i < actualValues.length; i++) {
      const sum = actualValues.slice(i - windowSize + 1, i + 1).reduce((s, val) => s + val, 0);
      movingAverages.push(sum / windowSize);
    }

    // 计算误差
    const errors = [];
    for (let i = 0; i < movingAverages.length; i++) {
      const error = Math.abs(actualValues[i + windowSize - 1] - movingAverages[i]);
      errors.push(error);
    }

    const avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
    
    // 预测未来值
    const lastMA = movingAverages[movingAverages.length - 1];
    
    for (let i = 1; i <= futureMonths; i++) {
      // 简单预测：使用最后的移动平均值
      const predictedMargin = lastMA;
      
      // 置信区间基于历史误差
      const marginOfError = avgError * 1.96;
      
      predictions.push({
        date: this.getDateFromOffset(data[data.length - 1].date, i),
        margin: predictedMargin,
        confidence: {
          lower: predictedMargin - marginOfError,
          upper: predictedMargin + marginOfError
        }
      });
    }

    return {
      predictions,
      model: { windowSize, accuracy: 1 / (1 + avgError) }
    };
  }

  // 指数平滑预测
  static async exponentialSmoothingPrediction(data: TrainingData[], alpha: number = 0.3, futureMonths: number = 6): Promise<{
    predictions: { date: string; margin: number; confidence: { lower: number; upper: number } }[];
    model: { alpha: number; accuracy: number };
  }> {
    if (data.length < 2) {
      throw new Error('数据不足，无法进行指数平滑预测');
    }

    // 初始化
    const smoothedValues = [data[0].actualMargin];
    
    // 计算平滑值
    for (let i = 1; i < data.length; i++) {
      const smoothed = alpha * data[i].actualMargin + (1 - alpha) * smoothedValues[i - 1];
      smoothedValues.push(smoothed);
    }

    // 计算误差
    const errors = [];
    for (let i = 0; i < data.length - 1; i++) {
      const error = Math.abs(data[i + 1].actualMargin - smoothedValues[i]);
      errors.push(error);
    }

    const avgError = errors.reduce((sum, e) => sum + e, 0) / errors.length;
    
    // 预测未来值
    const lastSmoothed = smoothedValues[smoothedValues.length - 1];
    
    const predictions = [];
    for (let i = 1; i <= futureMonths; i++) {
      // 指数平滑预测（简单趋势）
      const predictedMargin = lastSmoothed;
      
      // 置信区间基于历史误差
      const marginOfError = avgError * 1.96;
      
      predictions.push({
        date: this.getDateFromOffset(data[data.length - 1].date, i),
        margin: predictedMargin,
        confidence: {
          lower: predictedMargin - marginOfError,
          upper: predictedMargin + marginOfError
        }
      });
    }

    return {
      predictions,
      model: { alpha, accuracy: 1 / (1 + avgError) }
    };
  }

  // 季节性分解预测
  static async seasonalDecompositionPrediction(data: TrainingData[], seasonalPeriod: number = 12, futureMonths: number = 6): Promise<{
    predictions: { date: string; margin: number; confidence: { lower: number; upper: number } }[];
    model: { trend: number; seasonal: number[]; accuracy: number };
  }> {
    if (data.length < seasonalPeriod * 2) {
      throw new Error(`数据不足，需要至少${seasonalPeriod * 2}个数据点进行季节性分解`);
    }

    // 简化的季节性分解
    const n = data.length;
    const trend = [];
    
    // 计算趋势（移动平均）
    for (let i = 0; i < n; i++) {
      const start = Math.max(0, i - Math.floor(seasonalPeriod / 2));
      const end = Math.min(n - 1, i + Math.floor(seasonalPeriod / 2));
      const window = data.slice(start, end + 1);
      const avg = window.reduce((sum, d) => sum + d.actualMargin, 0) / window.length;
      trend.push(avg);
    }

    // 计算季节性因子
    const seasonalFactors = [];
    for (let i = 0; i < seasonalPeriod; i++) {
      const factors = [];
      for (let j = i; j < n; j += seasonalPeriod) {
        factors.push(data[j].actualMargin / trend[j]);
      }
      const avgFactor = factors.reduce((sum, f) => sum + f, 0) / factors.length;
      seasonalFactors.push(avgFactor);
    }

    // 预测未来值
    const predictions = [];
    const lastTrend = trend[trend.length - 1];
    const lastSeasonal = seasonalFactors[(n - 1) % seasonalPeriod];
    
    for (let i = 1; i <= futureMonths; i++) {
      const futureIndex = n + i - 1;
      const seasonalIndex = futureIndex % seasonalPeriod;
      const predictedMargin = lastTrend * seasonalFactors[seasonalIndex];
      
      // 简单置信区间
      const marginOfError = Math.abs(lastTrend - predictedMargin) * 1.96;
      
      predictions.push({
        date: this.getDateFromOffset(data[data.length - 1].date, i),
        margin: predictedMargin,
        confidence: {
          lower: predictedMargin - marginOfError,
          upper: predictedMargin + marginOfError
        }
      });
    }

    return {
      predictions,
      model: { 
        trend: lastTrend, 
        seasonal: seasonalFactors,
        accuracy: 0.85 // 简化计算
      }
    };
  }

  // 综合预测（结合多种算法）
  static async ensemblePrediction(data: TrainingData[], futureMonths: number = 6): Promise<{
    predictions: { date: string; margin: number; confidence: { lower: number; upper: number } }[];
    models: { name: string; weight: number; prediction: number }[];
  }> {
    const predictions = [];
    const models = [];

    // 运行多种预测算法
    const linear = await this.linearRegressionPrediction(data, futureMonths);
    const movingAvg = await this.movingAveragePrediction(data, 3, futureMonths);
    const expSmooth = await this.exponentialSmoothingPrediction(data, 0.3, futureMonths);

    // 根据模型性能分配权重
    const weights = [
      { name: 'linear', weight: linear.model.r2, prediction: linear.predictions[0]?.margin || 0 },
      { name: 'moving_average', weight: movingAvg.model.accuracy, prediction: movingAvg.predictions[0]?.margin || 0 },
      { name: 'exponential_smoothing', weight: expSmooth.model.accuracy, prediction: expSmooth.predictions[0]?.margin || 0 }
    ];

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    weights.forEach(w => w.weight = w.weight / totalWeight);

    // 计算加权平均预测
    for (let i = 0; i < futureMonths; i++) {
      const weightedPrediction = weights.reduce((sum, w) => {
        const modelPred = linear.predictions[i]?.margin || 
                         movingAvg.predictions[i]?.margin || 
                         expSmooth.predictions[i]?.margin || 0;
        return sum + (w.weight * modelPred);
      }, 0);

      // 计算置信区间
      const marginOfError = 0.05 * weightedPrediction * 1.96; // 5%误差范围

      predictions.push({
        date: this.getDateFromOffset(data[data.length - 1].date, i + 1),
        margin: weightedPrediction,
        confidence: {
          lower: weightedPrediction - marginOfError,
          upper: weightedPrediction + marginOfError
        }
      });
    }

    return {
      predictions,
      models: weights
    };
  }

  // 辅助方法：计算趋势
  private static calculateTrend(data: TrainingData[], currentDate: string): 'up' | 'down' | 'stable' {
    const currentIndex = data.findIndex(d => d.date === currentDate);
    if (currentIndex < 2) return 'stable';

    const recent = data[currentIndex].actualMargin;
    const previous = data[currentIndex - 1].actualMargin;
    const earlier = data[currentIndex - 2].actualMargin;

    const trend1 = recent - previous;
    const trend2 = previous - earlier;

    if (trend1 > 0 && trend2 > 0) return 'up';
    if (trend1 < 0 && trend2 < 0) return 'down';
    return 'stable';
  }

  // 辅助方法：计算季节性
  private static calculateSeasonality(data: TrainingData[], currentDate: string): number {
    const currentIndex = data.findIndex(d => d.date === currentDate);
    if (currentIndex < 12) return 1; // 没有足够数据计算季节性

    const current = data[currentIndex].actualMargin;
    const previousYear = data[currentIndex - 12]?.actualMargin || current;
    
    return current / previousYear;
  }

  // 辅助方法：根据偏移量计算日期
  private static getDateFromOffset(baseDate: string, offset: number): string {
    const date = new Date(baseDate + '-01');
    date.setMonth(date.getMonth() + offset);
    return date.toISOString().split('T')[0];
  }
}