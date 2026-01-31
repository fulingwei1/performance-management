import {
  calculateManagerStats,
  calculateGlobalStats,
  normalizeByZScore,
  normalizeByMinMax,
  normalizeScore,
  normalizeAllScores,
  getManagerStrictnessLevel,
  generateNormalizationReport
} from '../../lib/scoreNormalization';

const mockRecords = [
  {
    id: '1',
    employeeId: '1',
    employeeName: '员工1',
    assessorId: 'manager1',
    assessorName: '张经理',
    totalScore: 1.2,
    taskCompletion: 1.2,
    initiative: 1.1,
    projectFeedback: 1.0,
    qualityImprovement: 1.0,
    level: 'L4',
    month: '2024-01',
    summary: '工作总结'
  },
  {
    id: '2',
    employeeId: '2',
    employeeName: '员工2',
    assessorId: 'manager1',
    assessorName: '张经理',
    totalScore: 1.3,
    taskCompletion: 1.3,
    initiative: 1.2,
    projectFeedback: 1.1,
    qualityImprovement: 1.0,
    level: 'L4',
    month: '2024-01',
    summary: '工作总结'
  },
  {
    id: '3',
    employeeId: '3',
    employeeName: '员工3',
    assessorId: 'manager2',
    assessorName: '李经理',
    totalScore: 0.8,
    taskCompletion: 0.8,
    initiative: 0.7,
    projectFeedback: 0.9,
    qualityImprovement: 0.8,
    level: 'L2',
    month: '2024-01',
    summary: '工作总结'
  },
  {
    id: '4',
    employeeId: '4',
    employeeName: '员工4',
    assessorId: 'manager2',
    assessorName: '李经理',
    totalScore: 0.9,
    taskCompletion: 0.9,
    initiative: 0.8,
    projectFeedback: 1.0,
    qualityImprovement: 0.9,
    level: 'L3',
    month: '2024-01',
    summary: '工作总结'
  }
];

describe('scoreNormalization.ts', () => {
  describe('calculateManagerStats', () => {
    it('should calculate correct manager statistics', () => {
      const stats = calculateManagerStats(mockRecords);
      expect(stats).toHaveLength(2);
      expect(stats[0].managerId).toBe('manager2');
      expect(stats[1].managerId).toBe('manager1');
    });

    it('should calculate correct average scores', () => {
      const stats = calculateManagerStats(mockRecords);
      const manager1 = stats.find(m => m.managerId === 'manager1');
      const manager2 = stats.find(m => m.managerId === 'manager2');
      
      expect(manager1?.averageScore).toBeCloseTo(1.25, 3);
      expect(manager2?.averageScore).toBeCloseTo(0.85, 3);
    });

    it('should calculate correct standard deviation', () => {
      const stats = calculateManagerStats(mockRecords);
      const manager1 = stats.find(m => m.managerId === 'manager1');
      const manager2 = stats.find(m => m.managerId === 'manager2');
      
      expect(manager1?.stdDeviation).toBeGreaterThan(0);
      expect(manager2?.stdDeviation).toBeGreaterThan(0);
    });

    it('should sort by average score ascending', () => {
      const stats = calculateManagerStats(mockRecords);
      expect(stats[0].averageScore).toBeLessThan(stats[1].averageScore);
    });

    it('should return empty array for no records', () => {
      const stats = calculateManagerStats([]);
      expect(stats).toHaveLength(0);
    });
  });

  describe('calculateGlobalStats', () => {
    it('should calculate correct global statistics', () => {
      const stats = calculateGlobalStats(mockRecords);
      expect(stats.averageScore).toBeCloseTo(1.05, 3);
      expect(stats.count).toBe(4);
    });

    it('should calculate correct min and max scores', () => {
      const stats = calculateGlobalStats(mockRecords);
      expect(stats.minScore).toBe(0.8);
      expect(stats.maxScore).toBe(1.3);
    });

    it('should return correct standard deviation', () => {
      const stats = calculateGlobalStats(mockRecords);
      expect(stats.stdDeviation).toBeGreaterThan(0);
    });

    it('should return zero for empty array', () => {
      const stats = calculateGlobalStats([]);
      expect(stats.averageScore).toBeNaN();
    });
  });

  describe('normalizeByZScore', () => {
    it('should normalize score using Z-Score method', () => {
      const managerStats = {
        managerId: 'manager1',
        managerName: '张经理',
        averageScore: 1.25,
        stdDeviation: 0.05,
        minScore: 1.2,
        maxScore: 1.3,
        count: 2
      };
      
      const globalStats = {
        averageScore: 1.05,
        stdDeviation: 0.2
      };
      
      const normalized = normalizeByZScore(1.25, managerStats, globalStats);
      expect(normalized).toBeCloseTo(1.05, 2);
    });

    it('should handle zero standard deviation', () => {
      const managerStats = {
        managerId: 'manager1',
        managerName: '张经理',
        averageScore: 1.0,
        stdDeviation: 0,
        minScore: 1.0,
        maxScore: 1.0,
        count: 2
      };
      
      const globalStats = {
        averageScore: 1.05,
        stdDeviation: 0.2
      };
      
      const normalized = normalizeByZScore(1.0, managerStats, globalStats);
      expect(normalized).toBe(1.05);
    });

    it('should clamp normalized score to valid range', () => {
      const managerStats = {
        managerId: 'manager1',
        managerName: '张经理',
        averageScore: 1.0,
        stdDeviation: 0.1,
        minScore: 0.9,
        maxScore: 1.1,
        count: 2
      };
      
      const globalStats = {
        averageScore: 1.0,
        stdDeviation: 0.2
      };
      
      // Test extreme values
      const normalized1 = normalizeByZScore(1.5, managerStats, globalStats);
      const normalized2 = normalizeByZScore(0.5, managerStats, globalStats);
      
      expect(normalized1).toBeLessThanOrEqual(1.5);
      expect(normalized1).toBeGreaterThanOrEqual(0.5);
      expect(normalized2).toBeLessThanOrEqual(1.5);
      expect(normalized2).toBeGreaterThanOrEqual(0.5);
    });
  });

  describe('normalizeByMinMax', () => {
    it('should normalize score using Min-Max method', () => {
      const managerStats = {
        managerId: 'manager1',
        managerName: '张经理',
        averageScore: 1.25,
        stdDeviation: 0.05,
        minScore: 1.2,
        maxScore: 1.3,
        count: 2
      };
      
      const globalStats = {
        minScore: 0.8,
        maxScore: 1.3
      };
      
      const normalized1 = normalizeByMinMax(1.2, managerStats, globalStats);
      const normalized2 = normalizeByMinMax(1.3, managerStats, globalStats);
      
      expect(normalized1).toBe(0.8);
      expect(normalized2).toBe(1.3);
    });

    it('should handle zero range', () => {
      const managerStats = {
        managerId: 'manager1',
        managerName: '张经理',
        averageScore: 1.0,
        stdDeviation: 0,
        minScore: 1.0,
        maxScore: 1.0,
        count: 2
      };
      
      const globalStats = {
        minScore: 0.8,
        maxScore: 1.3
      };
      
      const normalized = normalizeByMinMax(1.0, managerStats, globalStats);
      expect(normalized).toBeCloseTo(1.05, 2);
    });
  });

  describe('normalizeScore', () => {
    it('should return normalized score with adjustment', () => {
      const managerStats = calculateManagerStats(mockRecords);
      const globalStats = calculateGlobalStats(mockRecords);
      
      const result = normalizeScore(mockRecords[0], managerStats, globalStats);
      
      expect(result).toHaveProperty('originalScore');
      expect(result).toHaveProperty('normalizedScore');
      expect(result).toHaveProperty('managerId');
      expect(result).toHaveProperty('managerName');
      expect(result).toHaveProperty('adjustment');
    });

    it('should return original score if manager not found', () => {
      const managerStats = calculateManagerStats(mockRecords);
      const globalStats = calculateGlobalStats(mockRecords);
      
      const record = { ...mockRecords[0], assessorId: 'unknown', assessorName: 'Unknown' };
      const result = normalizeScore(record, managerStats, globalStats);
      
      expect(result.normalizedScore).toBe(result.originalScore);
      expect(result.adjustment).toBe(0);
    });
  });

  describe('normalizeAllScores', () => {
    it('should normalize all scores in the array', () => {
      const results = normalizeAllScores(mockRecords);
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result).toHaveProperty('normalizedScore');
      });
    });

    it('should return empty array for empty input', () => {
      const results = normalizeAllScores([]);
      expect(results).toHaveLength(0);
    });
  });

  describe('getManagerStrictnessLevel', () => {
    it('should identify strict manager', () => {
      const managerStats = {
        managerId: 'manager1',
        managerName: '张经理',
        averageScore: 0.8,
        stdDeviation: 0.1,
        minScore: 0.7,
        maxScore: 0.9,
        count: 2
      };
      
      const result = getManagerStrictnessLevel(managerStats, 1.0);
      expect(result.level).toBe('strict');
      expect(result.label).toBe('偏严格');
      expect(result.color).toBe('#EF4444');
    });

    it('should identify lenient manager', () => {
      const managerStats = {
        managerId: 'manager1',
        managerName: '张经理',
        averageScore: 1.2,
        stdDeviation: 0.1,
        minScore: 1.1,
        maxScore: 1.3,
        count: 2
      };
      
      const result = getManagerStrictnessLevel(managerStats, 1.0);
      expect(result.level).toBe('lenient');
      expect(result.label).toBe('偏宽松');
      expect(result.color).toBe('#10B981');
    });

    it('should identify normal manager', () => {
      const managerStats = {
        managerId: 'manager1',
        managerName: '张经理',
        averageScore: 1.0,
        stdDeviation: 0.1,
        minScore: 0.9,
        maxScore: 1.1,
        count: 2
      };
      
      const result = getManagerStrictnessLevel(managerStats, 1.0);
      expect(result.level).toBe('normal');
      expect(result.label).toBe('正常');
      expect(result.color).toBe('#3B82F6');
    });
  });

  describe('generateNormalizationReport', () => {
    it('should generate complete normalization report', () => {
      const report = generateNormalizationReport(mockRecords);
      
      expect(report).toHaveProperty('globalStats');
      expect(report).toHaveProperty('managerReports');
      expect(report).toHaveProperty('needsAdjustment');
      expect(report).toHaveProperty('totalManagers');
      
      expect(report.totalManagers).toBe(2);
      expect(report.managerReports).toHaveLength(2);
    });

    it('should identify managers needing adjustment', () => {
      const report = generateNormalizationReport(mockRecords);
      
      report.managerReports.forEach(managerReport => {
        expect(managerReport).toHaveProperty('strictness');
        expect(managerReport).toHaveProperty('adjustmentNeeded');
      });
    });
  });
});
