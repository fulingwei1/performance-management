import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../middleware/errorHandler';
import { memoryStore } from '../config/memory-db';
import { USE_MEMORY_DB } from '../config/database';
import { BonusConfig, BonusResult, BonusRule } from '../types';

function scoreToGrade(score: number, rules: BonusRule[]): { grade: string; coefficient: number } {
  const sorted = [...rules].sort((a, b) => b.minScore - a.minScore);
  for (const rule of sorted) {
    if (score >= rule.minScore) {
      return { grade: rule.grade, coefficient: rule.coefficient };
    }
  }
  return { grade: 'D', coefficient: 0 };
}

export const bonusController = {
  getConfig: asyncHandler(async (_req: Request, res: Response) => {
    if (USE_MEMORY_DB) {
      const config = memoryStore.bonusConfig.get('default');
      return res.json({ success: true, data: config || null });
    }
    res.json({ success: true, data: null });
  }),

  updateConfig: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const { rules } = req.body;

    if (USE_MEMORY_DB) {
      const config: BonusConfig = {
        id: 'default',
        rules,
        updatedBy: req.user.userId,
        updatedAt: new Date().toISOString(),
      };
      memoryStore.bonusConfig.set('default', config);
      return res.json({ success: true, data: config });
    }
    res.json({ success: true });
  }),

  calculate: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const { year, quarter } = req.body;

    if (USE_MEMORY_DB) {
      const config = memoryStore.bonusConfig.get('default');
      if (!config) return res.status(400).json({ success: false, error: '未配置奖金规则' });

      const employees = Array.from(memoryStore.employees.values());
      const results: BonusResult[] = [];

      for (const emp of employees) {
        // Get performance score from records
        const records = Array.from(memoryStore.performanceRecords.values())
          .filter(r => r.employeeId === emp.id);
        const avgScore = records.length > 0
          ? records.reduce((sum, r) => sum + (r.totalScore || 0), 0) / records.length
          : 60; // default

        const { grade, coefficient } = scoreToGrade(avgScore, config.rules);
        const baseSalary = 10000; // default base salary
        const bonus = baseSalary * coefficient;

        const result: BonusResult = {
          id: uuidv4(),
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department,
          year: year || new Date().getFullYear(),
          quarter: quarter || 1,
          score: Math.round(avgScore * 100) / 100,
          grade,
          coefficient,
          baseSalary,
          bonus,
          adjusted: false,
          createdAt: new Date().toISOString(),
        };
        memoryStore.bonusResults.set(result.id, result);
        results.push(result);
      }

      return res.json({ success: true, data: results, message: `已计算${results.length}人奖金` });
    }
    res.json({ success: true, data: [] });
  }),

  getResults: asyncHandler(async (req: Request, res: Response) => {
    const yearQ = req.query.year as string | undefined;
    const quarterQ = req.query.quarter as string | undefined;

    if (USE_MEMORY_DB) {
      let results = Array.from(memoryStore.bonusResults.values());
      if (yearQ) results = results.filter(r => r.year === parseInt(yearQ));
      if (quarterQ) results = results.filter(r => r.quarter === parseInt(quarterQ));
      // If employee role, only show own
      if (req.user && req.user.role === 'employee') {
        results = results.filter(r => r.employeeId === req.user!.userId);
      }
      return res.json({ success: true, data: results });
    }
    res.json({ success: true, data: [] });
  }),

  updateResult: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const id = req.params.id as string;
    const { bonus, baseSalary } = req.body;

    if (USE_MEMORY_DB) {
      const result = memoryStore.bonusResults.get(id);
      if (!result) return res.status(404).json({ success: false, error: '记录不存在' });
      if (bonus !== undefined) result.bonus = bonus;
      if (baseSalary !== undefined) result.baseSalary = baseSalary;
      result.adjusted = true;
      result.adjustedBy = req.user.userId;
      result.adjustedAt = new Date().toISOString();
      memoryStore.bonusResults.set(id, result);
      return res.json({ success: true, data: result });
    }
    res.status(404).json({ success: false, error: '记录不存在' });
  }),
};
