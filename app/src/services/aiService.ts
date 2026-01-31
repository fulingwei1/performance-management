// AI辅助服务 - 生成评分建议
// 注意：这是一个本地模拟实现，未来可以替换为真实的AI API调用

export interface AISuggestion {
  summary: string;
  strengths: string[];
  improvements: string[];
  suggestedScores: {
    taskCompletion: number;
    initiative: number;
    projectFeedback: number;
    qualityImprovement: number;
  };
  reasoning: string;
}

// AI建议生成
export function generateAISuggestion(summary: string, plan: string): AISuggestion {
  const strengths = [
    '工作态度积极主动，能够按时完成任务',
    '技术能力扎实，解决问题的效率较高',
    '团队协作意识强，与同事配合默契',
    '学习能力强，能够快速掌握新技术',
    '责任心强，对工作质量要求严格'
  ];

  const improvements = [
    '可以进一步提高沟通表达能力',
    '建议加强时间管理能力',
    '需要提升跨部门协作效率',
    '可以更多地参与技术创新',
    '建议加强文档编写规范'
  ];

  // 根据内容长度随机选择建议
  const randomStrengths = strengths.sort(() => Math.random() - 0.5).slice(0, 2);
  const randomImprovements = improvements.sort(() => Math.random() - 0.5).slice(0, 2);

  // 生成建议分数
  const suggestedScores = {
    taskCompletion: [1.0, 1.2, 1.2, 1.5][Math.floor(Math.random() * 4)],
    initiative: [1.0, 1.2, 1.2, 1.5][Math.floor(Math.random() * 4)],
    projectFeedback: [1.0, 1.0, 1.2, 1.2][Math.floor(Math.random() * 4)],
    qualityImprovement: [1.0, 1.0, 1.2, 1.2][Math.floor(Math.random() * 4)]
  };

  return {
    summary: `基于员工提交的工作总结，该员工本月表现${summary.length > 50 ? '较为突出' : '基本达标'}，${plan.length > 30 ? '下月计划清晰明确' : '下月计划需进一步完善'}。`,
    strengths: randomStrengths,
    improvements: randomImprovements,
    suggestedScores,
    reasoning: `建议综合得分 ${(suggestedScores.taskCompletion * 0.4 + suggestedScores.initiative * 0.3 + suggestedScores.projectFeedback * 0.2 + suggestedScores.qualityImprovement * 0.1).toFixed(2)}，主要依据员工的工作完成情况和态度表现。`
  };
}
