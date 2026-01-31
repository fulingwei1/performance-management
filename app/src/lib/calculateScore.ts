import type { ScoreLevel } from '@/types';

// 等级转分数
export function levelToScore(level: ScoreLevel): number {
  const map: Record<string, number> = {
    'L5': 1.5,
    'L4': 1.2,
    'L3': 1.0,
    'L2': 0.8,
    'L1': 0.5
  };
  return map[level] || 1.0;
}

// 分数转等级
export function scoreToLevel(score: number): ScoreLevel {
  if (score >= 1.4) return 'L5';
  if (score >= 1.15) return 'L4';
  if (score >= 0.9) return 'L3';
  if (score >= 0.65) return 'L2';
  return 'L1';
}

// 获取等级标签
export function getLevelLabel(level: ScoreLevel): string {
  const map: Record<string, string> = {
    'L5': '优秀',
    'L4': '良好',
    'L3': '合格',
    'L2': '待改进',
    'L1': '不合格'
  };
  return map[level] || '合格';
}

// 获取等级颜色
export function getLevelColor(level: ScoreLevel): string {
  const map: Record<string, string> = {
    'L5': '#10B981',
    'L4': '#3B82F6',
    'L3': '#F59E0B',
    'L2': '#F97316',
    'L1': '#EF4444'
  };
  return map[level] || '#F59E0B';
}

// 计算综合得分
export function calculateTotalScore(
  taskCompletion: number,
  initiative: number,
  projectFeedback: number,
  qualityImprovement: number
): number {
  const score = taskCompletion * 0.4 + initiative * 0.3 + projectFeedback * 0.2 + qualityImprovement * 0.1;
  return parseFloat(score.toFixed(2));
}

// 获取权重说明
export function getWeightDescription(dimension: string): string {
  const map: Record<string, string> = {
    'taskCompletion': '权重 40%',
    'initiative': '权重 30%',
    'projectFeedback': '权重 20%',
    'qualityImprovement': '权重 10%'
  };
  return map[dimension] || '';
}

// 格式化分数显示
export function formatScore(score: number): string {
  return score.toFixed(2);
}

// 获取分数评价
export function getScoreComment(score: number): string {
  if (score >= 1.4) return '表现卓越，是团队的标杆';
  if (score >= 1.15) return '表现优秀，超出预期';
  if (score >= 0.9) return '表现合格，达到要求';
  if (score >= 0.65) return '有待改进，需要努力';
  return '表现不佳，急需改进';
}
