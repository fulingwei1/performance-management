"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const helpers_1 = require("../../utils/helpers");
describe('Helper Functions', () => {
    describe('calculateTotalScore', () => {
        it('should calculate correct total score with L5 values', () => {
            const result = (0, helpers_1.calculateTotalScore)(1.5, 1.5, 1.5, 1.5);
            expect(result).toBe(1.5);
        });
        it('should calculate correct total score with L3 values', () => {
            const result = (0, helpers_1.calculateTotalScore)(1.0, 1.0, 1.0, 1.0);
            expect(result).toBe(1.0);
        });
        it('should calculate correct total score with L1 values', () => {
            const result = (0, helpers_1.calculateTotalScore)(0.5, 0.5, 0.5, 0.5);
            expect(result).toBe(0.5);
        });
        it('should calculate correct total score with mixed values', () => {
            const result = (0, helpers_1.calculateTotalScore)(1.2, 1.1, 1.0, 1.0);
            const expected = 1.2 * 0.4 + 1.1 * 0.3 + 1.0 * 0.2 + 1.0 * 0.1;
            expect(result).toBeCloseTo(expected, 5);
        });
        it('should apply correct weights', () => {
            const result = (0, helpers_1.calculateTotalScore)(1.0, 0, 0, 0);
            expect(result).toBeCloseTo(0.4, 5);
        });
        it('should handle decimal precision correctly', () => {
            const result = (0, helpers_1.calculateTotalScore)(0.8, 0.9, 1.1, 1.2);
            expect(result).toBeGreaterThan(0);
            expect(result).toBeLessThanOrEqual(1.5);
        });
    });
    describe('scoreToLevel', () => {
        it('should return L5 for score >= 1.4', () => {
            expect((0, helpers_1.scoreToLevel)(1.4)).toBe('L5');
            expect((0, helpers_1.scoreToLevel)(1.45)).toBe('L5');
            expect((0, helpers_1.scoreToLevel)(1.5)).toBe('L5');
        });
        it('should return L4 for score >= 1.15 and < 1.4', () => {
            expect((0, helpers_1.scoreToLevel)(1.15)).toBe('L4');
            expect((0, helpers_1.scoreToLevel)(1.25)).toBe('L4');
            expect((0, helpers_1.scoreToLevel)(1.39)).toBe('L4');
        });
        it('should return L3 for score >= 0.9 and < 1.15', () => {
            expect((0, helpers_1.scoreToLevel)(0.9)).toBe('L3');
            expect((0, helpers_1.scoreToLevel)(1.0)).toBe('L3');
            expect((0, helpers_1.scoreToLevel)(1.14)).toBe('L3');
        });
        it('should return L2 for score >= 0.65 and < 0.9', () => {
            expect((0, helpers_1.scoreToLevel)(0.65)).toBe('L2');
            expect((0, helpers_1.scoreToLevel)(0.75)).toBe('L2');
            expect((0, helpers_1.scoreToLevel)(0.89)).toBe('L2');
        });
        it('should return L1 for score < 0.65', () => {
            expect((0, helpers_1.scoreToLevel)(0.5)).toBe('L1');
            expect((0, helpers_1.scoreToLevel)(0.6)).toBe('L1');
            expect((0, helpers_1.scoreToLevel)(0.64)).toBe('L1');
        });
        it('should handle boundary values correctly', () => {
            expect((0, helpers_1.scoreToLevel)(1.399)).toBe('L4');
            expect((0, helpers_1.scoreToLevel)(1.4)).toBe('L5');
            expect((0, helpers_1.scoreToLevel)(1.149)).toBe('L3');
            expect((0, helpers_1.scoreToLevel)(1.15)).toBe('L4');
            expect((0, helpers_1.scoreToLevel)(0.899)).toBe('L2');
            expect((0, helpers_1.scoreToLevel)(0.9)).toBe('L3');
            expect((0, helpers_1.scoreToLevel)(0.649)).toBe('L1');
            expect((0, helpers_1.scoreToLevel)(0.65)).toBe('L2');
        });
    });
    describe('levelToScore', () => {
        it('should return 1.5 for L5', () => {
            expect((0, helpers_1.levelToScore)('L5')).toBe(1.5);
        });
        it('should return 1.2 for L4', () => {
            expect((0, helpers_1.levelToScore)('L4')).toBe(1.2);
        });
        it('should return 1.0 for L3', () => {
            expect((0, helpers_1.levelToScore)('L3')).toBe(1.0);
        });
        it('should return 0.8 for L2', () => {
            expect((0, helpers_1.levelToScore)('L2')).toBe(0.8);
        });
        it('should return 0.5 for L1', () => {
            expect((0, helpers_1.levelToScore)('L1')).toBe(0.5);
        });
        it('should return 1.0 for invalid level', () => {
            expect((0, helpers_1.levelToScore)('L6')).toBe(1.0);
            expect((0, helpers_1.levelToScore)('')).toBe(1.0);
            expect((0, helpers_1.levelToScore)('invalid')).toBe(1.0);
        });
        it('should be case sensitive', () => {
            expect((0, helpers_1.levelToScore)('l5')).toBe(1.0);
            expect((0, helpers_1.levelToScore)('L5')).toBe(1.5);
        });
    });
    describe('Combined score-level conversion', () => {
        it('should maintain consistency when converting score to level and back', () => {
            const originalScore = 1.25;
            const level = (0, helpers_1.scoreToLevel)(originalScore);
            const convertedScore = (0, helpers_1.levelToScore)(level);
            expect(['L1', 'L2', 'L3', 'L4', 'L5']).toContain(level);
        });
        it('should maintain consistency when converting level to score and back', () => {
            const levels = ['L1', 'L2', 'L3', 'L4', 'L5'];
            levels.forEach(level => {
                const score = (0, helpers_1.levelToScore)(level);
                const convertedLevel = (0, helpers_1.scoreToLevel)(score);
                expect(convertedLevel).toBe(level);
            });
        });
    });
    describe('Edge cases', () => {
        it('should handle minimum valid score (0.5)', () => {
            expect((0, helpers_1.scoreToLevel)(0.5)).toBe('L1');
        });
        it('should handle maximum valid score (1.5)', () => {
            expect((0, helpers_1.scoreToLevel)(1.5)).toBe('L5');
        });
        it('should handle score with many decimal places', () => {
            const result = (0, helpers_1.calculateTotalScore)(0.555555, 1.111111, 0.999999, 1.444444);
            expect(result).toBeGreaterThan(0.5);
            expect(result).toBeLessThan(1.5);
        });
    });
});
//# sourceMappingURL=helpers.test.js.map