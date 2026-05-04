-- 毛利率预测系统数据库表

-- 1. 销售数据表
CREATE TABLE IF NOT EXISTS sales_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    product_code VARCHAR(50) NOT NULL,
    product_name VARCHAR(100) NOT NULL,
    customer_code VARCHAR(50) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(15, 2) NOT NULL,
    cost_of_goods DECIMAL(15, 2) NOT NULL,
    gross_profit DECIMAL(15, 2) NOT NULL,
    gross_margin DECIMAL(8, 4) NOT NULL,
    sales_person_id VARCHAR(50) NOT NULL,
    sales_person_name VARCHAR(100) NOT NULL,
    department VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL,
    region VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 预测模型表
CREATE TABLE IF NOT EXISTS prediction_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    model_type VARCHAR(50) NOT NULL CHECK (model_type IN ('linear', 'polynomial', 'exponential', 'moving_average', 'seasonal_decompose', 'ml_regression')),
    parameters JSONB NOT NULL DEFAULT '{}',
    accuracy JSONB NOT NULL DEFAULT '{"mae": 0, "mse": 0, "rmse": 0, "mape": 0, "r2": 0}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. 预测结果表
CREATE TABLE IF NOT EXISTS prediction_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID NOT NULL REFERENCES prediction_models(id) ON DELETE CASCADE,
    prediction_date DATE NOT NULL,
    predicted_margin DECIMAL(8, 4) NOT NULL,
    confidence_interval JSONB NOT NULL DEFAULT '{"lower": 0, "upper": 0}',
    actual_margin DECIMAL(8, 4),
    accuracy DECIMAL(8, 4),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_sales_data_date ON sales_data(date);
CREATE INDEX IF NOT EXISTS idx_sales_data_product_code ON sales_data(product_code);
CREATE INDEX IF NOT EXISTS idx_sales_data_customer_code ON sales_data(customer_code);
CREATE INDEX IF NOT EXISTS idx_sales_data_department ON sales_data(department);
CREATE INDEX IF NOT EXISTS idx_sales_data_category ON sales_data(category);
CREATE INDEX IF NOT EXISTS idx_sales_data_region ON sales_data(region);
CREATE INDEX IF NOT EXISTS idx_sales_data_created_at ON sales_data(created_at);

CREATE INDEX IF NOT EXISTS idx_prediction_models_created_at ON prediction_models(created_at);
CREATE INDEX IF NOT EXISTS idx_prediction_models_active ON prediction_models(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_prediction_results_model_id ON prediction_results(model_id);
CREATE INDEX IF NOT EXISTS idx_prediction_results_prediction_date ON prediction_results(prediction_date);
CREATE INDEX IF NOT EXISTS idx_prediction_results_created_at ON prediction_results(created_at);

-- 创建时间序列视图
CREATE OR REPLACE VIEW sales_data_time_series AS
SELECT 
    date,
    SUM(total_price) as total_revenue,
    SUM(cost_of_goods) as total_cost,
    SUM(gross_profit) as total_gross_profit,
    AVG(gross_margin) as average_gross_margin,
    COUNT(*) as record_count
FROM sales_data
GROUP BY date
ORDER BY date;

-- 创建产品分类分析视图
CREATE OR REPLACE VIEW product_category_analysis AS
SELECT 
    category,
    SUM(total_price) as total_revenue,
    SUM(cost_of_goods) as total_cost,
    SUM(gross_profit) as total_gross_profit,
    AVG(gross_margin) as average_gross_margin,
    COUNT(*) as record_count,
    SUM(total_price) * 100.0 / (SELECT SUM(total_price) FROM sales_data) as revenue_percentage
FROM sales_data
GROUP BY category
ORDER BY total_revenue DESC;

-- 创建毛利率预测函数
CREATE OR REPLACE FUNCTION calculate_gross_margin(
    total_price DECIMAL,
    cost_of_goods DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE 
        WHEN total_price = 0 THEN 0
        ELSE (total_price - cost_of_goods) / total_price * 100
    END;
END;
$$ LANGUAGE plpgsql;

-- 创建预测准确度计算函数
CREATE OR REPLACE FUNCTION calculate_prediction_accuracy(
    predicted_margin DECIMAL,
    actual_margin DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    RETURN CASE 
        WHEN predicted_margin = 0 THEN NULL
        ELSE ABS((actual_margin - predicted_margin) / predicted_margin) * 100
    END;
END;
$$ LANGUAGE plpgsql;

-- 插入示例预测模型数据
INSERT INTO prediction_models (name, model_type, parameters, accuracy) VALUES
('线性回归基础模型', 'linear', '{"windowSize": 3, "futureMonths": 6}', '{"mae": 2.5, "mse": 8.2, "rmse": 2.86, "mape": 15.2, "r2": 0.78}'),
('移动平均模型', 'moving_average', '{"windowSize": 6}', '{"mae": 3.1, "mse": 12.3, "rmse": 3.51, "mape": 18.7, "r2": 0.65}'),
('季节性分解模型', 'seasonal_decompose', '{"seasonalPeriod": 12}', '{"mae": 2.8, "mse": 9.7, "rmse": 3.11, "mape": 16.9, "r2": 0.72}')
ON CONFLICT (name) DO NOTHING;

-- 添加注释
COMMENT ON TABLE sales_data IS '销售数据表，包含每笔销售的详细信息';
COMMENT ON TABLE prediction_models IS '预测模型表，存储不同类型的预测模型';
COMMENT ON TABLE prediction_results IS '预测结果表，存储模型预测结果和实际对比';

COMMENT ON COLUMN sales_data.gross_margin IS '毛利率百分比';
COMMENT ON COLUMN prediction_results.confidence_interval IS '置信区间，包含下限和上限';
COMMENT ON COLUMN prediction_results.accuracy IS '预测准确度百分比';