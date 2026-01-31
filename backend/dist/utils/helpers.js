"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleLabels = exports.levelLabels = exports.levelToScore = exports.scoreToLevel = exports.calculateTotalScore = exports.generateId = exports.getCurrentQuarter = exports.getCurrentMonth = exports.getGroupType = exports.groupConfig = void 0;
// 分组配置
exports.groupConfig = {
    highLevels: ['senior', 'intermediate'],
    lowLevels: ['junior', 'assistant']
};
// 判断员工属于高分组还是低分组
const getGroupType = (level) => {
    return exports.groupConfig.highLevels.includes(level) ? 'high' : 'low';
};
exports.getGroupType = getGroupType;
// 获取当前月份 YYYY-MM
const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};
exports.getCurrentMonth = getCurrentMonth;
// 获取当前季度 YYYY-QX
const getCurrentQuarter = () => {
    const now = new Date();
    const quarter = Math.floor(now.getMonth() / 3) + 1;
    return `${now.getFullYear()}-Q${quarter}`;
};
exports.getCurrentQuarter = getCurrentQuarter;
// 生成唯一ID
const generateId = (prefix) => {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
exports.generateId = generateId;
// 计算总分
const calculateTotalScore = (taskCompletion, initiative, projectFeedback, qualityImprovement) => {
    const total = taskCompletion * 0.4 +
        initiative * 0.3 +
        projectFeedback * 0.2 +
        qualityImprovement * 0.1;
    return parseFloat(total.toFixed(2));
};
exports.calculateTotalScore = calculateTotalScore;
// 分数转等级
const scoreToLevel = (score) => {
    if (score >= 1.4)
        return 'L5';
    if (score >= 1.15)
        return 'L4';
    if (score >= 0.9)
        return 'L3';
    if (score >= 0.65)
        return 'L2';
    return 'L1';
};
exports.scoreToLevel = scoreToLevel;
// 等级转分数
const levelToScore = (level) => {
    const map = {
        'L5': 1.5,
        'L4': 1.2,
        'L3': 1.0,
        'L2': 0.8,
        'L1': 0.5
    };
    return map[level] || 1.0;
};
exports.levelToScore = levelToScore;
// 等级标签
exports.levelLabels = {
    senior: '高级工程师',
    intermediate: '中级工程师',
    junior: '初级工程师',
    assistant: '助理工程师'
};
// 角色标签
exports.roleLabels = {
    employee: '员工',
    manager: '部门经理',
    gm: '总经理',
    hr: '人力资源'
};
//# sourceMappingURL=helpers.js.map