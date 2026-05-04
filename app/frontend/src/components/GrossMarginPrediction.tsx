import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SalesData {
  id: string;
  date: string;
  productCode: string;
  productName: string;
  customerName: string;
  totalPrice: number;
  costOfGoods: number;
  grossMargin: number;
}

interface Prediction {
  id: string;
  predictionDate: string;
  predictedMargin: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  actualMargin?: number;
  accuracy?: number;
}

interface Summary {
  totalRevenue: number;
  totalCost: number;
  totalGrossProfit: number;
  averageGrossMargin: number;
  totalRecords: number;
}

interface TimeSeriesData {
  date: string;
  revenue: number;
  cost: number;
  grossProfit: number;
  grossMargin: number;
}

interface CategoryAnalysis {
  category: string;
  totalRevenue: number;
  totalCost: number;
  totalGrossProfit: number;
  averageGrossMargin: number;
  recordCount: number;
}

const GrossMarginPrediction: React.FC = () => {
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesData[]>([]);
  const [categoryAnalysis, setCategoryAnalysis] = useState<CategoryAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAlgorithm, setSelectedAlgorithm] = useState('ensemble');
  const [futureMonths, setFutureMonths] = useState(6);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    category: ''
  });

  // 加载数据
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const [salesResponse, timeSeriesResponse, categoryResponse] = await Promise.all([
        fetch(`/api/prediction/sales-data?${params}`),
        fetch(`/api/prediction/time-series/monthly?${params}`),
        fetch(`/api/prediction/sales-data?${params}`)
      ]);

      const salesData = await salesResponse.json();
      const timeSeriesData = await timeSeriesResponse.json();
      const categoryData = await categoryResponse.json();

      if (salesData.success) {
        setSalesData(salesData.data.salesData);
        setSummary(salesData.data.summary);
      }
      
      if (timeSeriesData.success) {
        setTimeSeries(timeSeriesData.data);
      }

      if (salesData.success) {
        setCategoryAnalysis(salesData.data.categoryAnalysis || []);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 执行预测
  const runPrediction = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/prediction/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          algorithm: selectedAlgorithm,
          futureMonths,
          parameters: {
            windowSize: 3,
            alpha: 0.3,
            seasonalPeriod: 12
          },
          ...filters
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // 加载预测结果
        await loadPredictions(result.data.model.id);
        alert('预测执行成功！');
      } else {
        alert('预测执行失败: ' + result.error);
      }
    } catch (error) {
      console.error('预测执行失败:', error);
      alert('预测执行失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 加载预测结果
  const loadPredictions = async (modelId: string) => {
    try {
      const response = await fetch(`/api/prediction/predictions/${modelId}`);
      const result = await response.json();
      
      if (result.success) {
        setPredictions(result.data);
      }
    } catch (error) {
      console.error('加载预测结果失败:', error);
    }
  };

  // 导出报告
  const exportReport = async (format: 'json' | 'csv') => {
    try {
      const params = new URLSearchParams({
        format,
        ...filters
      });
      
      window.open(`/api/prediction/export?${params}`, '_blank');
    } catch (error) {
      console.error('导出报告失败:', error);
    }
  };

  // 更新实际毛利率
  const updateActualMargin = async (id: string, actualMargin: number) => {
    try {
      const response = await fetch(`/api/prediction/predictions/${id}/actual`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ actualMargin })
      });

      const result = await response.json();
      
      if (result.success) {
        // 重新加载数据
        await loadData();
        alert('实际毛利率更新成功！');
      } else {
        alert('更新失败: ' + result.error);
      }
    } catch (error) {
      console.error('更新实际毛利率失败:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">毛利率预测分析</h1>
        <div className="space-x-2">
          <Button onClick={() => exportReport('json')} variant="outline">
            导出JSON报告
          </Button>
          <Button onClick={() => exportReport('csv')} variant="outline">
            导出CSV报告
          </Button>
        </div>
      </div>

      {/* 筛选条件 */}
      <Card>
        <CardHeader>
          <CardTitle>数据筛选</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">开始日期</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">结束日期</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">产品分类</label>
              <Input
                value={filters.category}
                onChange={(e) => setFilters({...filters, category: e.target.value})}
                placeholder="输入分类名称"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={loadData} disabled={loading}>
                筛选数据
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据摘要 */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">总营收</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{(summary.totalRevenue / 10000).toFixed(2)}万</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">总成本</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">¥{(summary.totalCost / 10000).toFixed(2)}万</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">毛利润</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ¥{(summary.totalGrossProfit / 10000).toFixed(2)}万
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">平均毛利率</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.averageGrossMargin.toFixed(2)}%</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">记录数量</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalRecords}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 预测配置 */}
      <Card>
        <CardHeader>
          <CardTitle>预测配置</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">预测算法</label>
              <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linear">线性回归</SelectItem>
                  <SelectItem value="moving_average">移动平均</SelectItem>
                  <SelectItem value="exponential_smoothing">指数平滑</SelectItem>
                  <SelectItem value="seasonal_decompose">季节性分解</SelectItem>
                  <SelectItem value="ensemble">综合预测</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">预测月数</label>
              <Input
                type="number"
                value={futureMonths}
                onChange={(e) => setFutureMonths(parseInt(e.target.value) || 6)}
                min="1"
                max="24"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={runPrediction} disabled={loading}>
                {loading ? '预测中...' : '执行预测'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 时间序列图表 */}
      {timeSeries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>毛利率时间序列</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="grossMargin" 
                  stroke="#8884d8" 
                  name="毛利率"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 产品分类分析 */}
      {categoryAnalysis.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>产品分类分析</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={categoryAnalysis}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="category" />
                <YAxis />
                <Tooltip formatter={(value, name) => [value, name === 'averageGrossMargin' ? '毛利率%' : name]} />
                <Legend />
                <Bar dataKey="averageGrossMargin" fill="#82ca9d" name="平均毛利率" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* 预测结果 */}
      {predictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>预测结果</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>预测日期</TableHead>
                  <TableHead>预测毛利率</TableHead>
                  <TableHead>实际毛利率</TableHead>
                  <TableHead>准确率</TableHead>
                  <TableHead>置信区间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {predictions.map((prediction) => (
                  <TableRow key={prediction.id}>
                    <TableCell>{prediction.predictionDate}</TableCell>
                    <TableCell>{prediction.predictedMargin.toFixed(2)}%</TableCell>
                    <TableCell>
                      {prediction.actualMargin ? (
                        `${prediction.actualMargin.toFixed(2)}%`
                      ) : (
                        <span className="text-gray-500">待更新</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {prediction.accuracy ? `${prediction.accuracy.toFixed(2)}%` : '-'}
                    </TableCell>
                    <TableCell>
                      {prediction.confidenceInterval.lower.toFixed(2)}% - {prediction.confidenceInterval.upper.toFixed(2)}%
                    </TableCell>
                    <TableCell>
                      {!prediction.actualMargin && (
                        <Button
                          onClick={() => {
                            const actualMargin = prompt('请输入实际毛利率:');
                            if (actualMargin) {
                              updateActualMargin(prediction.id, parseFloat(actualMargin));
                            }
                          }}
                          size="sm"
                        >
                          更新实际值
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 销售数据表格 */}
      <Card>
        <CardHeader>
          <CardTitle>销售数据</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>产品名称</TableHead>
                  <TableHead>客户名称</TableHead>
                  <TableHead>总价格</TableHead>
                  <TableHead>成本</TableHead>
                  <TableHead>毛利率</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData.slice(0, 10).map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.productName}</TableCell>
                    <TableCell>{record.customerName}</TableCell>
                    <TableCell>¥{record.totalPrice.toLocaleString()}</TableCell>
                    <TableCell>¥{record.costOfGoods.toLocaleString()}</TableCell>
                    <TableCell>{record.grossMargin.toFixed(2)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GrossMarginPrediction;