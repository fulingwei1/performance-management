/**
 * AI 绩效预测服务
 * 基于历史数据预测未来绩效趋势
 */

interface PerformanceRecord {
  month: string;
  score: number;
}

interface PredictionResult {
  predictions: Array<{
    month: string;
    predictedScore: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  confidence: number;
}

export class AIPredictionService {
  /**
   * 预测未来绩效（线性回归）
   */
  async predictPerformance(
    employeeId: number,
    monthsToPredict: number = 3
  ): Promise<PredictionResult> {
    // 获取历史数据（过去 12 个月）
    const historicalData = await this.getHistoricalData(employeeId, 12);

    if (historicalData.length < 3) {
      throw new Error('历史数据不足，至少需要3个月数据');
    }

    // 线性回归计算
    const regression = this.linearRegression(historicalData);

    // 生成预测
    const predictions = [];
    const lastMonth = new Date(historicalData[historicalData.length - 1].month);

    for (let i = 1; i <= monthsToPredict; i++) {
      const futureMonth = new Date(lastMonth);
      futureMonth.setMonth(futureMonth.getMonth() + i);

      const monthIndex = historicalData.length + i;
      const predictedScore = regression.slope * monthIndex + regression.intercept;

      // 限制在 0-100 范围内
      const clampedScore = Math.max(0, Math.min(100, predictedScore));

      // 置信区间（±10%）
      const margin = regression.stdError * 1.96; // 95% 置信区间

      predictions.push({
        month: futureMonth.toISOString().slice(0, 7),
        predictedScore: Math.round(clampedScore * 10) / 10,
        confidenceInterval: {
          lower: Math.max(0, Math.round((clampedScore - margin) * 10) / 10),
          upper: Math.min(100, Math.round((clampedScore + margin) * 10) / 10)
        }
      });
    }

    // 判断趋势
    const trend = regression.slope > 1
      ? 'increasing'
      : regression.slope < -1
      ? 'decreasing'
      : 'stable';

    // 置信度（基于 R²）
    const confidence = Math.round(regression.rSquared * 100);

    return {
      predictions,
      trend,
      confidence
    };
  }

  /**
   * 线性回归算法
   */
  private linearRegression(data: PerformanceRecord[]): {
    slope: number;
    intercept: number;
    rSquared: number;
    stdError: number;
  } {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0, sumY2 = 0;

    data.forEach((record, index) => {
      const x = index;
      const y = record.score;

      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
      sumY2 += y * y;
    });

    // 计算斜率和截距
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 计算 R²（拟合优度）
    const meanY = sumY / n;
    let ssTotal = 0, ssResidual = 0;

    data.forEach((record, index) => {
      const yPredicted = slope * index + intercept;
      ssTotal += Math.pow(record.score - meanY, 2);
      ssResidual += Math.pow(record.score - yPredicted, 2);
    });

    const rSquared = 1 - (ssResidual / ssTotal);

    // 计算标准误差
    const stdError = Math.sqrt(ssResidual / (n - 2));

    return { slope, intercept, rSquared, stdError };
  }

  /**
   * 获取历史绩效数据
   */
  private async getHistoricalData(
    employeeId: number,
    months: number
  ): Promise<PerformanceRecord[]> {
    const { query } = await import('../config/database');
    
    const sql = `
      SELECT 
        TO_CHAR(month, 'YYYY-MM') as month,
        total_score as score
      FROM monthly_assessments
      WHERE employee_id = $1
        AND month >= NOW() - INTERVAL '${months} months'
      ORDER BY month ASC
    `;

    const result = await query(sql, [employeeId]);

    return result.map((row: any) => ({
      month: row.month,
      score: parseFloat(row.score)
    }));
  }

  /**
   * 移动平均预测（备选方法）
   */
  async predictWithMovingAverage(
    employeeId: number,
    monthsToPredict: number = 3,
    windowSize: number = 3
  ): Promise<PredictionResult> {
    const historicalData = await this.getHistoricalData(employeeId, 12);

    if (historicalData.length < windowSize) {
      throw new Error(`历史数据不足，至少需要${windowSize}个月数据`);
    }

    const predictions = [];
    const lastMonth = new Date(historicalData[historicalData.length - 1].month);

    // 计算最近 N 个月的平均值
    const recentScores = historicalData.slice(-windowSize).map(r => r.score);
    const avgScore = recentScores.reduce((a, b) => a + b, 0) / windowSize;

    // 计算趋势
    const trend = this.calculateTrend(historicalData);

    for (let i = 1; i <= monthsToPredict; i++) {
      const futureMonth = new Date(lastMonth);
      futureMonth.setMonth(futureMonth.getMonth() + i);

      // 基于移动平均 + 趋势调整
      const trendAdjustment = trend * i;
      let predictedScore = avgScore + trendAdjustment;
      predictedScore = Math.max(0, Math.min(100, predictedScore));

      const stdDev = this.calculateStdDev(recentScores);

      predictions.push({
        month: futureMonth.toISOString().slice(0, 7),
        predictedScore: Math.round(predictedScore * 10) / 10,
        confidenceInterval: {
          lower: Math.max(0, Math.round((predictedScore - stdDev) * 10) / 10),
          upper: Math.min(100, Math.round((predictedScore + stdDev) * 10) / 10)
        }
      });
    }

    const trendDirection = trend > 0.5 ? 'increasing' : trend < -0.5 ? 'decreasing' : 'stable';

    return {
      predictions,
      trend: trendDirection,
      confidence: 75 // 移动平均法置信度较低
    };
  }

  /**
   * 计算趋势斜率
   */
  private calculateTrend(data: PerformanceRecord[]): number {
    if (data.length < 2) return 0;

    const firstHalf = data.slice(0, Math.floor(data.length / 2));
    const secondHalf = data.slice(Math.floor(data.length / 2));

    const avgFirst = firstHalf.reduce((sum, r) => sum + r.score, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, r) => sum + r.score, 0) / secondHalf.length;

    return (avgSecond - avgFirst) / firstHalf.length;
  }

  /**
   * 计算标准差
   */
  private calculateStdDev(scores: number[]): number {
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    return Math.sqrt(variance);
  }
}

export const aiPredictionService = new AIPredictionService();
