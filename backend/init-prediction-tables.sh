#!/bin/bash
set -e

echo "初始化毛利率预测表..."

# 执行预测相关的表创建
psql -d performance_management -f src/migrations/015_gross_margin_prediction_tables.sql

echo ""
echo "插入示例预测模型数据..."
psql -d performance_management -c "
INSERT INTO prediction_models (name, model_type, parameters, accuracy) VALUES
('线性回归基础模型', 'linear', '{\"windowSize\": 3, \"futureMonths\": 6}', '{\"mae\": 2.5, \"mse\": 8.2, \"rmse\": 2.86, \"mape\": 15.2, \"r2\": 0.78}'),
('移动平均模型', 'moving_average', '{\"windowSize\": 6}', '{\"mae\": 3.1, \"mse\": 12.3, \"rmse\": 3.51, \"mape\": 18.7, \"r2\": 0.65}'),
('季节性分解模型', 'seasonal_decompose', '{\"seasonalPeriod\": 12}', '{\"mae\": 2.8, \"mse\": 9.7, \"rmse\": 3.11, \"mape\": 16.9, \"r2\": 0.72}')
ON CONFLICT (name) DO NOTHING;
"

echo ""
echo "✅ 毛利率预测表初始化完成！"