import {
  calculateTotalScore,
  scoreToLevel,
  levelToScore,
  getLevelLabel,
  getLevelColor,
  formatScore,
  getScoreComment
} from '../../lib/calculateScore';

describe('calculateScore.ts', () => {
  describe('calculateTotalScore', () => {
    it('should calculate correct total score with maximum values', () => {
      const result = calculateTotalScore(1.5, 1.5, 1.5, 1.5);
      expect(result).toBe(1.5);
    });

    it('should calculate correct total score with minimum values', () => {
      const result = calculateTotalScore(0.5, 0.5, 0.5, 0.5);
      expect(result).toBe(0.5);
    });

    it('should calculate correct total score with average values', () => {
      const result = calculateTotalScore(1.0, 1.0, 1.0, 1.0);
      expect(result).toBe(1.0);
    });

    it('should apply correct weights', () => {
      const result = calculateTotalScore(1.0, 0, 0, 0);
      expect(result).toBe(0.4);
    });

    it('should calculate correct total score with mixed values', () => {
      const result = calculateTotalScore(1.2, 1.1, 1.0, 1.0);
      const expected = 1.2 * 0.4 + 1.1 * 0.3 + 1.0 * 0.2 + 1.0 * 0.1;
      expect(result).toBeCloseTo(expected, 2);
    });

    it('should format to 2 decimal places', () => {
      const result = calculateTotalScore(0.555, 0.666, 0.777, 0.888);
      const decimals = result.toString().split('.')[1]?.length || 0;
      expect(decimals).toBeLessThanOrEqual(2);
    });
  });

  describe('scoreToLevel', () => {
    it('should return L5 for score >= 1.4', () => {
      expect(scoreToLevel(1.4)).toBe('L5');
      expect(scoreToLevel(1.5)).toBe('L5');
    });

    it('should return L4 for score >= 1.15', () => {
      expect(scoreToLevel(1.15)).toBe('L4');
      expect(scoreToLevel(1.25)).toBe('L4');
    });

    it('should return L3 for score >= 0.9', () => {
      expect(scoreToLevel(0.9)).toBe('L3');
      expect(scoreToLevel(1.0)).toBe('L3');
    });

    it('should return L2 for score >= 0.65', () => {
      expect(scoreToLevel(0.65)).toBe('L2');
      expect(scoreToLevel(0.75)).toBe('L2');
    });

    it('should return L1 for score < 0.65', () => {
      expect(scoreToLevel(0.5)).toBe('L1');
      expect(scoreToLevel(0.6)).toBe('L1');
    });

    it('should handle boundary values correctly', () => {
      expect(scoreToLevel(1.399)).toBe('L4');
      expect(scoreToLevel(1.4)).toBe('L5');
    });
  });

  describe('levelToScore', () => {
    it('should return correct score for L5', () => {
      expect(levelToScore('L5')).toBe(1.5);
    });

    it('should return correct score for L4', () => {
      expect(levelToScore('L4')).toBe(1.2);
    });

    it('should return correct score for L3', () => {
      expect(levelToScore('L3')).toBe(1.0);
    });

    it('should return correct score for L2', () => {
      expect(levelToScore('L2')).toBe(0.8);
    });

    it('should return correct score for L1', () => {
      expect(levelToScore('L1')).toBe(0.5);
    });

    it('should return default for invalid level', () => {
      expect(levelToScore('L6' as any)).toBe(1.0);
    });
  });

  describe('getLevelLabel', () => {
    it('should return correct label for L5', () => {
      expect(getLevelLabel('L5')).toBe('优秀');
    });

    it('should return correct label for L4', () => {
      expect(getLevelLabel('L4')).toBe('良好');
    });

    it('should return correct label for L3', () => {
      expect(getLevelLabel('L3')).toBe('合格');
    });

    it('should return correct label for L2', () => {
      expect(getLevelLabel('L2')).toBe('待改进');
    });

    it('should return correct label for L1', () => {
      expect(getLevelLabel('L1')).toBe('不合格');
    });
  });

  describe('getLevelColor', () => {
    it('should return correct color for L5', () => {
      expect(getLevelColor('L5')).toBe('#10B981');
    });

    it('should return correct color for L4', () => {
      expect(getLevelColor('L4')).toBe('#3B82F6');
    });

    it('should return correct color for L3', () => {
      expect(getLevelColor('L3')).toBe('#F59E0B');
    });

    it('should return correct color for L2', () => {
      expect(getLevelColor('L2')).toBe('#F97316');
    });

    it('should return correct color for L1', () => {
      expect(getLevelColor('L1')).toBe('#EF4444');
    });
  });

  describe('formatScore', () => {
    it('should format to 2 decimal places', () => {
      expect(formatScore(1.234567)).toBe('1.23');
    });

    it('should format whole numbers correctly', () => {
      expect(formatScore(1)).toBe('1.00');
    });

    it('should format small decimals correctly', () => {
      expect(formatScore(0.5)).toBe('0.50');
    });
  });

  describe('getScoreComment', () => {
    it('should return correct comment for L5', () => {
      expect(getScoreComment(1.4)).toBe('表现卓越，是团队的标杆');
    });

    it('should return correct comment for L4', () => {
      expect(getScoreComment(1.15)).toBe('表现优秀，超出预期');
    });

    it('should return correct comment for L3', () => {
      expect(getScoreComment(0.9)).toBe('表现合格，达到要求');
    });

    it('should return correct comment for L2', () => {
      expect(getScoreComment(0.65)).toBe('有待改进，需要努力');
    });

    it('should return correct comment for L1', () => {
      expect(getScoreComment(0.5)).toBe('表现不佳，急需改进');
    });
  });

  describe('Conversion consistency', () => {
    it('should be consistent when converting score to level and back', () => {
      const levels = ['L1', 'L2', 'L3', 'L4', 'L5'] as const;
      levels.forEach(level => {
        const score = levelToScore(level);
        const convertedLevel = scoreToLevel(score);
        expect(convertedLevel).toBe(level);
      });
    });
  });
});
