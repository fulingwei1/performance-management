import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { asyncHandler } from '../middleware/errorHandler';
import { memoryStore } from '../config/memory-db';
import { USE_MEMORY_DB } from '../config/database';
import { PeerReviewCycle, PeerReviewTask } from '../types';

/**
 * Fisher-Yates 洗牌算法
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export const peerReviewCycleController = {
  createCycle: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const { title, year, quarter, startDate, endDate, participants, reviewsPerPerson } = req.body;
    const id = uuidv4();

    // 默认每人评价4个同事（可配置3-5个）
    const reviewCount = reviewsPerPerson || 4;

    const cycle: PeerReviewCycle = {
      id, title, year, quarter, startDate, endDate,
      participants: participants || [],
      status: 'active',
      createdBy: req.user.userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (USE_MEMORY_DB) {
      memoryStore.peerReviewCycles.set(id, cycle);

      // 🎲 随机分配逻辑：每人评价N个随机同事
      const parts = cycle.participants;
      
      if (parts.length <= 1) {
        return res.status(400).json({ 
          success: false, 
          message: '参与者至少需要2人' 
        });
      }

      for (const reviewerId of parts) {
        // 候选人：除自己外的所有人
        const candidates = parts.filter(p => p !== reviewerId);
        
        // 随机洗牌
        const shuffled = shuffleArray(candidates);
        
        // 取前N个（不超过候选人总数）
        const selectedCount = Math.min(reviewCount, shuffled.length);
        const selectedReviewees = shuffled.slice(0, selectedCount);
        
        // 创建互评任务
        for (const revieweeId of selectedReviewees) {
          const taskId = uuidv4();
          const task: PeerReviewTask = {
            id: taskId,
            cycleId: id,
            reviewerId,
            revieweeId,
            status: 'pending',
            createdAt: new Date().toISOString(),
          };
          memoryStore.peerReviewTasks.set(taskId, task);
        }
      }
    }

    res.status(201).json({ 
      success: true, 
      data: cycle,
      message: `互评周期创建成功，每人随机分配${reviewCount}个评价任务`
    });
  }),

  getCycles: asyncHandler(async (_req: Request, res: Response) => {
    if (USE_MEMORY_DB) {
      const cycles = Array.from(memoryStore.peerReviewCycles.values())
        .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
      return res.json({ success: true, data: cycles });
    }
    res.json({ success: true, data: [] });
  }),

  getPending: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });

    if (USE_MEMORY_DB) {
      const tasks = Array.from(memoryStore.peerReviewTasks.values())
        .filter(t => t.reviewerId === req.user!.userId && t.status === 'pending');

      // Enrich with reviewee name
      const enriched = tasks.map(t => {
        const reviewee = memoryStore.employees.get(t.revieweeId);
        const cycle = memoryStore.peerReviewCycles.get(t.cycleId);
        return {
          ...t,
          revieweeName: reviewee?.name || '未知',
          cycleTitle: cycle?.title || '',
        };
      });

      return res.json({ success: true, data: enriched });
    }
    res.json({ success: true, data: [] });
  }),

  submit: asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) return res.status(401).json({ success: false, error: '未认证' });
    const { cycleId, revieweeId, scores } = req.body;

    if (USE_MEMORY_DB) {
      const task = Array.from(memoryStore.peerReviewTasks.values())
        .find(t => t.cycleId === cycleId && t.reviewerId === req.user!.userId && t.revieweeId === revieweeId);

      if (!task) return res.status(404).json({ success: false, error: '互评任务不存在' });

      task.scores = scores;
      task.status = 'submitted';
      task.submittedAt = new Date().toISOString();
      memoryStore.peerReviewTasks.set(task.id, task);

      return res.json({ success: true, data: task, message: '互评提交成功' });
    }
    res.status(404).json({ success: false, error: '互评任务不存在' });
  }),

  getResults: asyncHandler(async (req: Request, res: Response) => {
    const cycleId = req.params.cycleId as string;

    if (USE_MEMORY_DB) {
      const tasks = Array.from(memoryStore.peerReviewTasks.values())
        .filter(t => t.cycleId === cycleId && t.status === 'submitted');

      // Group by reviewee
      const resultMap: Record<string, { revieweeId: string; revieweeName: string; scores: any[]; avgScore: number }> = {};

      for (const task of tasks) {
        if (!resultMap[task.revieweeId]) {
          const emp = memoryStore.employees.get(task.revieweeId);
          resultMap[task.revieweeId] = {
            revieweeId: task.revieweeId,
            revieweeName: emp?.name || '未知',
            scores: [],
            avgScore: 0,
          };
        }
        if (task.scores) {
          resultMap[task.revieweeId].scores.push(...task.scores);
        }
      }

      // Calculate averages
      const results = Object.values(resultMap).map(r => {
        if (r.scores.length > 0) {
          r.avgScore = Math.round(
            (r.scores.reduce((sum, s) => sum + s.score, 0) / r.scores.length) * 100
          ) / 100;
        }
        return r;
      });

      return res.json({ success: true, data: results });
    }
    res.json({ success: true, data: [] });
  }),
};
