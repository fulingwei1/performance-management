import { query } from '../config/database';

export interface PredictionModel {
  id: string;
  name: string;
  modelType: 'linear' | 'polynomial' | 'exponential' | 'moving_average' | 'seasonal_decompose' | 'ml_regression';
  parameters: Record<string, any>;
  accuracy: {
    mae: number;        // Mean Absolute Error
    mse: number;        // Mean Squared Error
    rmse: number;       // Root Mean Squared Error
    mape: number;       // Mean Absolute Percentage Error
    r2: number;         // R-squared
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionResult {
  id: string;
  modelId: string;
  predictionDate: string;
  predictedMargin: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  actualMargin?: number;
  accuracy?: number;
  createdAt: Date;
}

export interface TrainingData {
  date: string;
  actualMargin: number;
  revenue: number;
  cost: number;
  trend: 'up' | 'down' | 'stable';
  seasonality: number;
}

export class GrossMarginPredictionModel {
  // 创建预测模型
  static async createModel(data: {
    name: string;
    modelType: 'linear' | 'polynomial' | 'exponential' | 'moving_average' | 'seasonal_decompose' | 'ml_regression';
    parameters: Record<string, any>;
    accuracy: {
      mae: number;
      mse: number;
      rmse: number;
      mape: number;
      r2: number;
    };
  }): Promise<PredictionModel> {
    const sql = `
      INSERT INTO prediction_models (
        name, model_type, parameters, accuracy, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, name, model_type, parameters, accuracy, is_active, created_at, updated_at
    `;
    
    const result = await query(sql, [
      data.name,
      data.modelType,
      JSON.stringify(data.parameters),
      JSON.stringify(data.accuracy)
    ]);
    
    return this.formatModel(result[0]);
  }

  // 获取所有预测模型
  static async findAllModels(): Promise<PredictionModel[]> {
    const sql = `
      SELECT id, name, model_type, parameters, accuracy, is_active, created_at, updated_at
      FROM prediction_models
      ORDER BY created_at DESC
    `;
    
    const results = await query(sql);
    return results.map(this.formatModel);
  }

  // 获取活跃的预测模型
  static async findActiveModel(): Promise<PredictionModel | null> {
    const sql = `
      SELECT id, name, model_type, parameters, accuracy, is_active, created_at, updated_at
      FROM prediction_models
      WHERE is_active = true
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const results = await query(sql);
    return results.length > 0 ? this.formatModel(results[0]) : null;
  }

  // 创建预测结果
  static async createPrediction(data: {
    modelId: string;
    predictionDate: string;
    predictedMargin: number;
    confidenceInterval: {
      lower: number;
      upper: number;
    };
    actualMargin?: number;
    accuracy?: number;
  }): Promise<PredictionResult> {
    const sql = `
      INSERT INTO prediction_results (
        model_id, prediction_date, predicted_margin, confidence_interval, 
        actual_margin, accuracy, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      RETURNING id, model_id, prediction_date, predicted_margin, confidence_interval,
               actual_margin, accuracy, created_at
    `;
    
    const result = await query(sql, [
      data.modelId,
      data.predictionDate,
      data.predictedMargin,
      JSON.stringify(data.confidenceInterval),
      data.actualMargin,
      data.accuracy
    ]);
    
    return this.formatResult(result[0]);
  }

  // 获取预测结果
  static async getPredictions(modelId?: string, limit: number = 100): Promise<PredictionResult[]> {
    let sql = `
      SELECT id, model_id, prediction_date, predicted_margin, confidence_interval,
             actual_margin, accuracy, created_at
      FROM prediction_results
    `;
    
    const params: any[] = [];
    
    if (modelId) {
      sql += ' WHERE model_id = ?';
      params.push(modelId);
    }
    
    sql += ' ORDER BY prediction_date DESC LIMIT ?';
    params.push(limit);
    
    const results = await query(sql, params);
    return results.map(this.formatResult);
  }

  // 获取特定日期的预测结果
  static async getPredictionByDate(predictionDate: string): Promise<PredictionResult | null> {
    const sql = `
      SELECT id, model_id, prediction_date, predicted_margin, confidence_interval,
             actual_margin, accuracy, created_at
      FROM prediction_results
      WHERE prediction_date = ?
      ORDER BY created_at DESC
      LIMIT 1
    `;
    
    const results = await query(sql, [predictionDate]);
    return results.length > 0 ? this.formatResult(results[0]) : null;
  }

  // 更新实际毛利率数据
  static async updateActualMargin(id: string, actualMargin: number): Promise<PredictionResult | null> {
    // 计算准确度
    const prediction = await this.findById(id);
    let accuracy: number | undefined;
    
    if (prediction && prediction.predictedMargin !== 0) {
      accuracy = Math.abs((actualMargin - prediction.predictedMargin) / prediction.predictedMargin) * 100;
    }
    
    const sql = `
      UPDATE prediction_results
      SET actual_margin = ?, accuracy = ?, created_at = CURRENT_TIMESTAMP
      WHERE id = ?
      RETURNING id, model_id, prediction_date, predicted_margin, confidence_interval,
               actual_margin, accuracy, created_at
    `;
    
    const result = await query(sql, [actualMargin, accuracy, id]);
    return result.length > 0 ? this.formatResult(result[0]) : null;
  }

  // 删除预测结果
  static async deletePrediction(id: string): Promise<boolean> {
    const sql = 'DELETE FROM prediction_results WHERE id = ?';
    const result = await query(sql, [id]) as unknown as { affectedRows: number };
    return result.affectedRows > 0;
  }

  // 根据ID获取预测结果
  static async findById(id: string): Promise<PredictionResult | null> {
    const sql = `
      SELECT id, model_id, prediction_date, predicted_margin, confidence_interval,
             actual_margin, accuracy, created_at
      FROM prediction_results
      WHERE id = ?
    `;
    
    const results = await query(sql, [id]);
    return results.length > 0 ? this.formatResult(results[0]) : null;
  }

  // 获取模型性能统计
  static async getModelPerformance(modelId: string): Promise<{
    totalPredictions: number;
    averageAccuracy: number;
    bestAccuracy: number;
    worstAccuracy: number;
    predictionsWithActuals: number;
  }> {
    const sql = `
      SELECT 
        COUNT(*) as total_predictions,
        AVG(accuracy) as average_accuracy,
        MIN(accuracy) as best_accuracy,
        MAX(accuracy) as worst_accuracy,
        SUM(CASE WHEN actual_margin IS NOT NULL THEN 1 ELSE 0 END) as predictions_with_actuals
      FROM prediction_results
      WHERE model_id = ?
    `;
    
    const result = await query(sql, [modelId]);
    const stats = result[0];
    
    return {
      totalPredictions: parseInt(stats.total_predictions) || 0,
      averageAccuracy: parseFloat(stats.average_accuracy) || 0,
      bestAccuracy: parseFloat(stats.best_accuracy) || 0,
      worstAccuracy: parseFloat(stats.worst_accuracy) || 0,
      predictionsWithActuals: parseInt(stats.predictions_with_actuals) || 0
    };
  }

  // 格式化模型记录
  private static formatModel(row: any): PredictionModel {
    return {
      id: row.id,
      name: row.name,
      modelType: row.model_type,
      parameters: JSON.parse(row.parameters),
      accuracy: JSON.parse(row.accuracy),
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  // 格式化预测结果记录
  private static formatResult(row: any): PredictionResult {
    return {
      id: row.id,
      modelId: row.model_id,
      predictionDate: row.prediction_date,
      predictedMargin: parseFloat(row.predicted_margin),
      confidenceInterval: JSON.parse(row.confidence_interval),
      actualMargin: row.actual_margin ? parseFloat(row.actual_margin) : undefined,
      accuracy: row.accuracy ? parseFloat(row.accuracy) : undefined,
      createdAt: row.created_at
    };
  }
}