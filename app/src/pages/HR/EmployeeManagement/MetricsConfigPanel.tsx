import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface MetricsConfigPanelProps {
  metrics: any[];
  setMetrics: (m: any[]) => void;
  onSave: () => void;
}

export function MetricsConfigPanel({ metrics, setMetrics, onSave }: MetricsConfigPanelProps) {
  const handleMetricChange = (index: number, field: string, value: any) => {
    const newMetrics = [...metrics];
    newMetrics[index] = { ...newMetrics[index], [field]: value };
    setMetrics(newMetrics);
  };
  
  const totalWeight = metrics.reduce((sum: number, m: any) => sum + m.weight, 0);
  
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 mb-4">
        {metrics.map((metric: any, index: number) => (
          <Card key={metric.key}>
            <CardContent className="pt-4">
              <div className="space-y-3">
                <div><Label className="text-sm">指标名称</Label><Input value={metric.name} onChange={(e) => handleMetricChange(index, 'name', e.target.value)} className="mt-1" /></div>
                <div><Label className="text-sm">权重 (%)</Label><Input type="number" min="0" max="100" value={metric.weight} onChange={(e) => handleMetricChange(index, 'weight', parseInt(e.target.value))} className="mt-1" /></div>
                <div><Label className="text-sm">描述</Label><Textarea value={metric.description} onChange={(e) => handleMetricChange(index, 'description', e.target.value)} className="mt-1" rows={2} /></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className={cn("p-4 rounded-lg", totalWeight === 100 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200")}>
        <div className="flex items-center justify-between">
          <span className="font-medium">权重总和</span>
          <span className={cn("text-lg font-bold", totalWeight === 100 ? "text-green-600" : "text-red-600")}>{totalWeight}%</span>
        </div>
        {totalWeight !== 100 && <p className="text-sm text-red-600 mt-1">权重总和必须为100%</p>}
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => window.location.reload()}>重置默认</Button>
        <Button onClick={onSave}>保存配置</Button>
      </div>
    </div>
  );
}
