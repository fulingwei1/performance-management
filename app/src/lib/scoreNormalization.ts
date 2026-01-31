import type { PerformanceRecord } from '@/types';

/**
 * 分数标准化算法 - 消除不同经理打分习惯差异
 * 
 * 核心思想：
 * 1. 计算每个经理的历史平均分（基准分）
 * 2. 计算全公司平均分（目标分）
 * 3. 将每个经理的分数映射到统一尺度
 * 
 * 公式：标准化分数 = (原始分数 - 经理平均分) × (目标标准差 / 经理标准差) + 目标平均分
 */

interface ManagerStats {
  managerId: string;
  managerName: string;
  averageScore: number;
  stdDeviation: number;
  minScore: number;
  maxScore: number;
  count: number;
}

interface NormalizedScore {
  originalScore: number;
  normalizedScore: number;
  managerId: string;
  managerName: string;
  adjustment: number;
}

// 计算经理的统计信息
export function calculateManagerStats(records: PerformanceRecord[]): ManagerStats[] {
  const managerMap = new Map<string, PerformanceRecord[]>();
  
  // 按经理分组
  records.forEach(record => {
    if (!managerMap.has(record.assessorId)) {
      managerMap.set(record.assessorId, []);
    }
    managerMap.get(record.assessorId)!.push(record);
  });
  
  const stats: ManagerStats[] = [];
  
  managerMap.forEach((managerRecords, managerId) => {
    const scores = managerRecords.map(r => r.totalScore);
    const sum = scores.reduce((a, b) => a + b, 0);
    const average = sum / scores.length;
    
    // 计算标准差
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
    const stdDeviation = Math.sqrt(variance);
    
    stats.push({
      managerId,
      managerName: managerRecords[0].assessorName,
      averageScore: parseFloat(average.toFixed(3)),
      stdDeviation: parseFloat(stdDeviation.toFixed(3)),
      minScore: Math.min(...scores),
      maxScore: Math.max(...scores),
      count: scores.length
    });
  });
  
  return stats.sort((a, b) => a.averageScore - b.averageScore);
}

// 计算全局统计
export function calculateGlobalStats(records: PerformanceRecord[]) {
  const scores = records.map(r => r.totalScore);
  const sum = scores.reduce((a, b) => a + b, 0);
  const average = sum / scores.length;
  
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - average, 2), 0) / scores.length;
  const stdDeviation = Math.sqrt(variance);
  
  return {
    averageScore: parseFloat(average.toFixed(3)),
    stdDeviation: parseFloat(stdDeviation.toFixed(3)),
    minScore: Math.min(...scores),
    maxScore: Math.max(...scores),
    count: scores.length
  };
}

// Z-Score标准化
export function normalizeByZScore(
  score: number, 
  managerStats: ManagerStats, 
  globalStats: { averageScore: number; stdDeviation: number }
): number {
  if (managerStats.stdDeviation === 0) {
    return globalStats.averageScore;
  }
  
  // Z-Score = (原始值 - 平均值) / 标准差
  const zScore = (score - managerStats.averageScore) / managerStats.stdDeviation;
  
  // 映射到全局分布
  const normalized = globalStats.averageScore + zScore * globalStats.stdDeviation;
  
  // 限制在合理范围内 (0.5 - 1.5)
  return Math.max(0.5, Math.min(1.5, parseFloat(normalized.toFixed(2))));
}

// Min-Max标准化（按经理范围映射到全局范围）
export function normalizeByMinMax(
  score: number,
  managerStats: ManagerStats,
  globalStats: { minScore: number; maxScore: number }
): number {
  const managerRange = managerStats.maxScore - managerStats.minScore;
  
  if (managerRange === 0) {
    return globalStats.minScore + (globalStats.maxScore - globalStats.minScore) / 2;
  }
  
  // 先归一化到0-1
  const normalized01 = (score - managerStats.minScore) / managerRange;
  
  // 再映射到全局范围
  const globalRange = globalStats.maxScore - globalStats.minScore;
  const normalized = globalStats.minScore + normalized01 * globalRange;
  
  return parseFloat(normalized.toFixed(2));
}

// 推荐的标准化方法（综合Z-Score和Min-Max）
export function normalizeScore(
  record: PerformanceRecord,
  managerStats: ManagerStats[],
  globalStats: { averageScore: number; stdDeviation: number; minScore: number; maxScore: number }
): NormalizedScore {
  const manager = managerStats.find(m => m.managerId === record.assessorId);
  
  if (!manager) {
    return {
      originalScore: record.totalScore,
      normalizedScore: record.totalScore,
      managerId: record.assessorId,
      managerName: record.assessorName,
      adjustment: 0
    };
  }
  
  // 使用Z-Score标准化为主，Min-Max为辅
  let normalized = normalizeByZScore(record.totalScore, manager, globalStats);
  
  // 如果经理打分范围很小（很严格或很宽松），使用Min-Max辅助
  if (manager.stdDeviation < 0.1) {
    const minMaxNormalized = normalizeByMinMax(record.totalScore, manager, globalStats);
    // 加权平均
    normalized = normalized * 0.7 + minMaxNormalized * 0.3;
  }
  
  return {
    originalScore: record.totalScore,
    normalizedScore: parseFloat(normalized.toFixed(2)),
    managerId: record.assessorId,
    managerName: record.assessorName,
    adjustment: parseFloat((normalized - record.totalScore).toFixed(2))
  };
}

// 批量标准化
export function normalizeAllScores(records: PerformanceRecord[]) {
  const managerStats = calculateManagerStats(records);
  const globalStats = calculateGlobalStats(records);
  
  return records.map(record => ({
    ...record,
    normalizedScore: normalizeScore(record, managerStats, globalStats).normalizedScore
  }));
}

// 获取经理打分严格度评级
export function getManagerStrictnessLevel(
  managerStats: ManagerStats,
  globalAverage: number
): { level: 'strict' | 'normal' | 'lenient'; label: string; color: string } {
  const diff = managerStats.averageScore - globalAverage;
  
  if (diff < -0.15) {
    return { level: 'strict', label: '偏严格', color: '#EF4444' };
  } else if (diff > 0.15) {
    return { level: 'lenient', label: '偏宽松', color: '#10B981' };
  } else {
    return { level: 'normal', label: '正常', color: '#3B82F6' };
  }
}

// 生成标准化报告
export function generateNormalizationReport(records: PerformanceRecord[]) {
  const managerStats = calculateManagerStats(records);
  const globalStats = calculateGlobalStats(records);
  
  const report = managerStats.map(stat => {
    const strictness = getManagerStrictnessLevel(stat, globalStats.averageScore);
    return {
      ...stat,
      strictness,
      adjustmentNeeded: strictness.level !== 'normal'
    };
  });
  
  return {
    globalStats,
    managerReports: report,
    needsAdjustment: report.filter(r => r.adjustmentNeeded).length,
    totalManagers: report.length
  };
}
