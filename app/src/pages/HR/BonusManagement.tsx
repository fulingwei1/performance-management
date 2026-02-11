import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calculator, Settings, DollarSign, Edit, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { bonusApi } from '@/services/okrApi';
import { toast } from 'sonner';

interface BonusRule {
  grade: string;
  coefficient: number;
  label: string;
  minScore: number;
}

interface BonusResult {
  id: string;
  employeeName: string;
  department: string;
  score: number;
  grade: string;
  coefficient: number;
  baseSalary: number;
  bonus: number;
  adjusted: boolean;
}

export function BonusManagement() {
  const [rules, setRules] = useState<BonusRule[]>([]);
  const [results, setResults] = useState<BonusResult[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBonus, setEditBonus] = useState(0);
  const [year] = useState(new Date().getFullYear());
  const [quarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));

  useEffect(() => {
    loadConfig();
    loadResults();
  }, []);

  const loadConfig = async () => {
    try {
      const res = await bonusApi.getConfig();
      if (res.success && res.data) setRules(res.data.rules || []);
    } catch { /* ignore */ }
  };

  const loadResults = async () => {
    try {
      const res = await bonusApi.getResults();
      if (res.success) setResults(res.data || []);
    } catch { /* ignore */ }
  };

  const handleSaveConfig = async () => {
    try {
      await bonusApi.updateConfig(rules);
      toast.success('奖金系数配置已保存');
    } catch { toast.error('保存失败'); }
  };

  const handleCalculate = async () => {
    try {
      const res = await bonusApi.calculate({ year, quarter });
      if (res.success) {
        setResults(res.data || []);
        toast.success(res.message || '计算完成');
      }
    } catch { toast.error('计算失败'); }
  };

  const handleSaveResult = async (id: string) => {
    try {
      await bonusApi.updateResult(id, { bonus: editBonus });
      setEditingId(null);
      loadResults();
      toast.success('已调整');
    } catch { toast.error('调整失败'); }
  };

  const gradeColors: Record<string, string> = {
    'A+': 'bg-purple-100 text-purple-700',
    'A': 'bg-green-100 text-green-700',
    'B+': 'bg-blue-100 text-blue-700',
    'B': 'bg-gray-100 text-gray-700',
    'C': 'bg-yellow-100 text-yellow-700',
    'D': 'bg-red-100 text-red-700',
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <DollarSign className="w-6 h-6" /> 奖金管理
      </h1>

      <Tabs defaultValue="results">
        <TabsList>
          <TabsTrigger value="results">奖金结果</TabsTrigger>
          <TabsTrigger value="config">系数配置</TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={handleCalculate}>
              <Calculator className="w-4 h-4 mr-1" /> 批量计算 {year}Q{quarter}
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>姓名</TableHead>
                    <TableHead>部门</TableHead>
                    <TableHead>绩效分</TableHead>
                    <TableHead>等级</TableHead>
                    <TableHead>系数</TableHead>
                    <TableHead>基础工资</TableHead>
                    <TableHead>奖金</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.employeeName}</TableCell>
                      <TableCell>{r.department}</TableCell>
                      <TableCell>{r.score}</TableCell>
                      <TableCell>
                        <Badge className={gradeColors[r.grade] || ''}>{r.grade}</Badge>
                      </TableCell>
                      <TableCell>{r.coefficient}x</TableCell>
                      <TableCell>¥{r.baseSalary?.toLocaleString()}</TableCell>
                      <TableCell>
                        {editingId === r.id ? (
                          <Input type="number" value={editBonus} onChange={e => setEditBonus(Number(e.target.value))} className="w-24" />
                        ) : (
                          <span className={r.adjusted ? 'text-orange-600 font-medium' : ''}>
                            ¥{r.bonus?.toLocaleString()}
                            {r.adjusted && ' (已调整)'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === r.id ? (
                          <Button size="sm" onClick={() => handleSaveResult(r.id)}>
                            <Save className="w-3 h-3" />
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" onClick={() => { setEditingId(r.id); setEditBonus(r.bonus); }}>
                            <Edit className="w-3 h-3" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {results.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-gray-400 py-8">暂无数据，请先进行批量计算</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" /> 绩效等级→奖金系数
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>等级</TableHead>
                    <TableHead>标签</TableHead>
                    <TableHead>最低分数</TableHead>
                    <TableHead>奖金系数</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule, idx) => (
                    <TableRow key={rule.grade}>
                      <TableCell><Badge className={gradeColors[rule.grade] || ''}>{rule.grade}</Badge></TableCell>
                      <TableCell>
                        <Input value={rule.label} onChange={e => {
                          const nr = [...rules]; nr[idx] = { ...nr[idx], label: e.target.value }; setRules(nr);
                        }} className="w-24" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={rule.minScore} onChange={e => {
                          const nr = [...rules]; nr[idx] = { ...nr[idx], minScore: Number(e.target.value) }; setRules(nr);
                        }} className="w-20" />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.1" value={rule.coefficient} onChange={e => {
                          const nr = [...rules]; nr[idx] = { ...nr[idx], coefficient: Number(e.target.value) }; setRules(nr);
                        }} className="w-20" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="mt-4">
                <Button onClick={handleSaveConfig}>
                  <Save className="w-4 h-4 mr-1" /> 保存配置
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
