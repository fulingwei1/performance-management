import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { bonusApi } from '@/services/okrApi';

export function MyBonus() {
  const [results, setResults] = useState<any[]>([]);

  useEffect(() => {
    bonusApi.getResults().then(res => {
      if (res.success) setResults(res.data || []);
    }).catch(() => {});
  }, []);

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
        <DollarSign className="w-6 h-6" /> 我的奖金
      </h1>

      <Card>
        <CardHeader><CardTitle>奖金记录</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>年份</TableHead>
                <TableHead>季度</TableHead>
                <TableHead>绩效分</TableHead>
                <TableHead>等级</TableHead>
                <TableHead>系数</TableHead>
                <TableHead>奖金</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.year}</TableCell>
                  <TableCell>Q{r.quarter}</TableCell>
                  <TableCell>{r.score}</TableCell>
                  <TableCell><Badge className={gradeColors[r.grade] || ''}>{r.grade}</Badge></TableCell>
                  <TableCell>{r.coefficient}x</TableCell>
                  <TableCell className="font-medium text-green-600">¥{r.bonus?.toLocaleString()}</TableCell>
                </TableRow>
              ))}
              {results.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-gray-400 py-8">暂无奖金记录</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </motion.div>
  );
}
