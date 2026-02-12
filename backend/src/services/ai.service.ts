/**
 * AI服务层 - 支持Kimi API + OpenClaw备用
 */

import axios from 'axios';

// AI提供商类型
type AIProvider = 'kimi' | 'openclaw';

// AI请求参数
interface AIRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

// AI响应
interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
  provider?: AIProvider;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/**
 * Kimi API调用
 */
async function callKimiAPI(request: AIRequest): Promise<AIResponse> {
  const kimiApiKey = process.env.KIMI_API_KEY || process.env.MOONSHOT_API_KEY;
  
  console.log('[DEBUG] KIMI_API_KEY exists:', !!process.env.KIMI_API_KEY);
  console.log('[DEBUG] MOONSHOT_API_KEY exists:', !!process.env.MOONSHOT_API_KEY);
  console.log('[DEBUG] kimiApiKey length:', kimiApiKey?.length || 0);
  
  if (!kimiApiKey) {
    throw new Error('Kimi API Key not configured');
  }

  try {
    const response = await axios.post(
      'https://api.moonshot.cn/v1/chat/completions',
      {
        model: 'moonshot-v1-8k',
        messages: [
          ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
          { role: 'user', content: request.prompt }
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${kimiApiKey}`
        },
        timeout: 30000 // 30秒超时
      }
    );

    const choice = response.data.choices?.[0];
    if (!choice) {
      throw new Error('Invalid Kimi API response');
    }

    return {
      success: true,
      content: choice.message.content,
      provider: 'kimi',
      usage: response.data.usage ? {
        promptTokens: response.data.usage.prompt_tokens,
        completionTokens: response.data.usage.completion_tokens,
        totalTokens: response.data.usage.total_tokens
      } : undefined
    };
  } catch (error: any) {
    console.error('Kimi API Error:', error.response?.data || error.message);
    throw new Error(`Kimi API failed: ${error.response?.data?.error?.message || error.message}`);
  }
}

/**
 * OpenClaw备用方案（通过环境变量或预设）
 */
async function callOpenClawAPI(request: AIRequest): Promise<AIResponse> {
  // TODO: 实现OpenClaw调用（可选）
  throw new Error('OpenClaw fallback not implemented yet');
}

/**
 * AI生成建议（主函数，带自动failover）
 */
export async function generateAISuggestion(request: AIRequest): Promise<AIResponse> {
  try {
    // 优先使用Kimi API
    return await callKimiAPI(request);
  } catch (error: any) {
    console.warn('Kimi API failed, attempting fallback...', error.message);
    
    // 备用方案：OpenClaw
    try {
      return await callOpenClawAPI(request);
    } catch (fallbackError: any) {
      console.error('All AI providers failed', fallbackError.message);
      return {
        success: false,
        error: `AI服务暂时不可用: ${error.message}`
      };
    }
  }
}

/**
 * 提示词模板
 */
export const prompts = {
  /**
   * 员工自评 - 本月工作总结
   */
  employeeSelfSummary: (data: {
    name: string;
    level: string;
    department: string;
    goals?: any[];
    projects?: string[];
    lastMonthComment?: string;
  }) => {
    const goalsText = data.goals && data.goals.length > 0
      ? data.goals.map(g => `- ${g.name}: 目标${g.target || '无'}，实际完成${g.actual || '未填写'}`).join('\n')
      : '无目标数据';

    const projectsText = data.projects && data.projects.length > 0
      ? data.projects.join('、')
      : '无项目数据';

    return {
      systemPrompt: '你是一个专业的绩效管理助手，帮助员工撰写月度工作总结。要求客观、专业、积极。',
      prompt: `请根据以下数据为员工生成本月工作总结：

员工信息：
- 姓名：${data.name}
- 岗位：${data.level}
- 部门：${data.department}

本月目标完成情况：
${goalsText}

参与项目：
${projectsText}

${data.lastMonthComment ? `上月经理评价：\n${data.lastMonthComment}\n` : ''}

要求：
1. 总结字数200-300字
2. 包含：主要工作内容、目标完成情况、亮点成果
3. 语气：客观、专业、积极
4. 生成3个不同风格的版本，用JSON格式返回：{"versions": ["版本1", "版本2", "版本3"]}`
    };
  },

  /**
   * 员工自评 - 下月工作计划
   */
  employeeNextMonthPlan: (data: {
    name: string;
    level: string;
    department: string;
    goals?: any[];
    currentSummary?: string;
  }) => {
    const goalsText = data.goals && data.goals.length > 0
      ? data.goals.map(g => `- ${g.name}: ${g.description || ''}`).join('\n')
      : '无目标数据';

    return {
      systemPrompt: '你是一个专业的绩效管理助手，帮助员工规划下月工作计划。',
      prompt: `请根据以下数据为员工生成下月工作计划：

员工信息：
- 姓名：${data.name}
- 岗位：${data.level}
- 部门：${data.department}

年度目标：
${goalsText}

${data.currentSummary ? `本月工作总结：\n${data.currentSummary}\n` : ''}

要求：
1. 计划字数150-200字
2. 包含：重点任务、具体行动、预期成果
3. 与年度目标保持一致
4. 生成3个版本，JSON格式：{"versions": ["版本1", "版本2", "版本3"]}`
    };
  },

  /**
   * 经理评价 - 综合评价
   */
  managerComment: (data: {
    employeeName: string;
    employeeLevel: string;
    department: string;
    selfSummary: string;
    scores: {
      taskCompletion: number;
      initiative: number;
      projectFeedback: number;
      qualityImprovement: number;
    };
    goalProgress?: any[];
    historyScores?: any[];
    teamAverage?: number;
    rank?: string;
  }) => {
    const scoresText = `
- 任务完成度：${data.scores.taskCompletion.toFixed(1)}（权重40%）
- 主动性：${data.scores.initiative.toFixed(1)}（权重30%）
- 项目反馈：${data.scores.projectFeedback.toFixed(1)}（权重20%）
- 质量改善：${data.scores.qualityImprovement.toFixed(1)}（权重10%）
`;

    const totalScore = (
      data.scores.taskCompletion * 0.4 +
      data.scores.initiative * 0.3 +
      data.scores.projectFeedback * 0.2 +
      data.scores.qualityImprovement * 0.1
    ).toFixed(2);

    const historyText = data.historyScores && data.historyScores.length > 0
      ? data.historyScores.map(h => `${h.month}: ${h.score}`).join(', ')
      : '无历史数据';

    const teamCompareText = data.teamAverage
      ? `团队平均分：${data.teamAverage.toFixed(2)}，该员工${data.rank || '排名未知'}`
      : '无团队对比数据';

    return {
      systemPrompt: '你是一位经验丰富的部门经理，需要对员工进行客观、公正的月度绩效评价。',
      prompt: `请对员工进行月度绩效评价：

员工信息：
- 姓名：${data.employeeName}
- 岗位：${data.employeeLevel}
- 部门：${data.department}

员工自评：
${data.selfSummary}

本月得分：
${scoresText}
综合得分：${totalScore}

历史表现：
${historyText}

团队对比：
${teamCompareText}

请生成：
1. 综合评价（150-200字）- 包含优点、改进建议
2. 推荐的评价关键词（3-5个正面 + 1-2个待改进）
3. 具体改进建议

JSON格式返回：
{
  "comment": "综合评价文本",
  "positiveKeywords": ["关键词1", "关键词2", "关键词3"],
  "negativeKeywords": ["待改进1"],
  "suggestions": "具体改进建议"
}`
    };
  },

  /**
   * 经理评价 - 下月工作安排
   */
  managerWorkArrangement: (data: {
    employeeName: string;
    employeeLevel: string;
    department: string;
    goalProgress?: any[];
    currentComment?: string;
  }) => {
    return {
      systemPrompt: '你是一位部门经理，需要为员工安排下月工作任务和目标。',
      prompt: `请为员工安排下月工作：

员工信息：
- 姓名：${data.employeeName}
- 岗位：${data.employeeLevel}
- 部门：${data.department}

${data.currentComment ? `本月评价：\n${data.currentComment}\n` : ''}

要求：
1. 工作安排100-150字
2. 包含：重点任务、期望目标、提升方向
3. 语气：专业、鼓励、具体
4. 生成3个版本，JSON格式：{"versions": ["版本1", "版本2", "版本3"]}`
    };
  },

  /**
   * 总经理 - 公司战略撰写
   */
  companyStrategy: (data: {
    companyName?: string;
    industry?: string;
    year: number;
    currentStrategy?: string;
  }) => {
    return {
      systemPrompt: '你是一位资深的企业战略顾问，擅长制定清晰、可执行的公司战略。',
      prompt: `请为${data.companyName || '公司'}制定${data.year}年度战略：

行业背景：
${data.industry || '自动化测试设备行业'}

${data.currentStrategy ? `当前战略参考：\n${data.currentStrategy}\n` : ''}

要求：
1. 战略陈述应简洁有力（200-300字）
2. 包含：战略方向、核心目标、关键举措
3. 符合行业趋势和公司发展阶段
4. 可执行、可衡量
5. 生成3个不同风格的版本，JSON格式：{"versions": ["版本1", "版本2", "版本3"]}`
    };
  },

  /**
   * 总经理 - 公司年度重点工作
   */
  companyKeyWorks: (data: {
    companyName?: string;
    year: number;
    strategy?: string;
    departments?: string[];
  }) => {
    const deptList = data.departments && data.departments.length > 0
      ? data.departments.join('、')
      : '研发、销售、生产、人力资源等部门';

    return {
      systemPrompt: '你是一位企业运营专家，擅长将战略目标分解为具体的年度重点工作。',
      prompt: `请基于公司战略，制定${data.year}年度重点工作清单：

${data.strategy ? `公司战略：\n${data.strategy}\n` : ''}

公司部门：
${deptList}

要求：
1. 列出5-8项年度重点工作
2. 每项工作应包含：工作名称 + 简短说明（50字内）
3. 工作应跨部门、具有战略意义
4. 可衡量、有明确负责方向
5. 生成3个不同版本，JSON格式：
{
  "versions": [
    {
      "works": [
        {"name": "工作名称", "description": "工作说明"},
        ...
      ]
    }
  ]
}`
    };
  },

  /**
   * 总经理 - 部门年度重点工作
   */
  departmentKeyWorks: (data: {
    department: string;
    year: number;
    companyStrategy?: string;
    companyKeyWorks?: string[];
  }) => {
    const companyWorksText = data.companyKeyWorks && data.companyKeyWorks.length > 0
      ? data.companyKeyWorks.map((w, i) => `${i + 1}. ${w}`).join('\n')
      : '暂无公司重点工作';

    return {
      systemPrompt: '你是一位部门管理专家，擅长将公司战略分解为部门具体行动计划。',
      prompt: `请为${data.department}制定${data.year}年度重点工作：

${data.companyStrategy ? `公司战略：\n${data.companyStrategy}\n` : ''}

公司年度重点工作：
${companyWorksText}

要求：
1. 列出3-5项部门重点工作
2. 与公司战略和重点工作高度对齐
3. 符合部门职能特点
4. 每项工作包含：名称 + 说明（50字内）
5. 生成3个版本，JSON格式：
{
  "versions": [
    {
      "works": [
        {"name": "工作名称", "description": "工作说明"},
        ...
      ]
    }
  ]
}`
    };
  },

  /**
   * 经理 - 季度团队总结
   */
  quarterlySummary: (data: {
    managerName: string;
    department: string;
    quarter: string;
    teamSize: number;
    avgScore?: number;
    topPerformers?: string[];
    keyProjects?: string[];
  }) => {
    const topPerformersText = data.topPerformers && data.topPerformers.length > 0
      ? data.topPerformers.join('、')
      : '暂无数据';

    const projectsText = data.keyProjects && data.keyProjects.length > 0
      ? data.keyProjects.join('、')
      : '暂无项目数据';

    return {
      systemPrompt: '你是一位资深的部门经理，擅长撰写团队季度总结报告。',
      prompt: `请撰写${data.quarter}季度团队总结：

部门信息：
- 经理：${data.managerName}
- 部门：${data.department}
- 团队规模：${data.teamSize}人
- 平均绩效：${data.avgScore ? data.avgScore.toFixed(2) : '未统计'}

优秀员工：
${topPerformersText}

重点项目：
${projectsText}

要求：
1. 总结字数300-400字
2. 包含：整体表现、亮点成果、存在问题、改进措施
3. 语气：客观、专业、鼓舞士气
4. 生成3个版本，JSON格式：{"versions": ["版本1", "版本2", "版本3"]}`
    };
  },

  /**
   * 目标拆解 - 基于公司战略/部门目标拆解个人OKR/KPI
   */
  goalDecomposition: (data: {
    name: string;
    role: 'employee' | 'manager' | 'gm';
    level: string;
    department: string;
    companyStrategy?: string;
    companyKeyWorks?: string[];
    departmentKeyWorks?: string[];
    currentGoals?: any[];
  }) => {
    const strategyText = data.companyStrategy || '暂无公司战略';
    const companyWorksText = data.companyKeyWorks && data.companyKeyWorks.length > 0
      ? data.companyKeyWorks.map((w, i) => `${i + 1}. ${w}`).join('\n')
      : '暂无年度重点工作';
    const deptWorksText = data.departmentKeyWorks && data.departmentKeyWorks.length > 0
      ? data.departmentKeyWorks.map((w, i) => `${i + 1}. ${w}`).join('\n')
      : '暂无部门重点工作';

    return {
      systemPrompt: '你是一位专业的目标管理顾问，擅长帮助员工和经理将公司战略和部门目标拆解为个人OKR/KPI。',
      prompt: `请帮助${data.role === 'employee' ? '员工' : '经理'}拆解个人年度目标：

个人信息：
- 姓名：${data.name}
- 职位：${data.level}
- 部门：${data.department}
- 角色：${data.role === 'employee' ? '员工' : '经理'}

📋 公司战略（2026年）：
${strategyText}

🎯 公司年度重点工作：
${companyWorksText}

🏢 ${data.department} 部门重点工作：
${deptWorksText}

要求：
1. 根据上述战略和重点工作，为该${data.role === 'employee' ? '员工' : '经理'}生成3-5个个人年度目标
2. 每个目标应包含：
   - 目标名称（简洁明了）
   - 目标描述（具体措施）
   - 目标值（可量化的数字）
   - 单位（如：件、%、小时等）
   - 权重（所有目标权重总和为100%）
3. 目标应该：
   - 与公司战略和部门重点高度对齐
   - 符合${data.role === 'employee' ? '员工' : '经理'}的岗位职责
   - 具体可衡量（SMART原则）
   - 有挑战性但可达成

请用以下JSON格式返回：
{
  "goals": [
    {
      "name": "目标名称",
      "description": "具体描述和实施措施",
      "targetValue": 100,
      "unit": "件",
      "weight": 30,
      "alignedTo": "对齐的公司/部门目标名称"
    }
  ],
  "explanation": "简要说明为什么选择这些目标"
}`
    };
  }
};

/**
 * 调用日志（可选，用于统计和审计）
 */
export interface AIUsageLog {
  userId: string;
  feature: 'self_summary' | 'next_month_plan' | 'manager_comment' | 'work_arrangement';
  provider: AIProvider;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number; // 预估成本（人民币）
  createdAt: Date;
}

// Kimi API定价（参考）
const KIMI_PRICING = {
  input: 0.001, // ¥0.001 / 1K tokens
  output: 0.001  // ¥0.001 / 1K tokens
};

/**
 * 计算成本
 */
export function calculateCost(usage: { promptTokens: number; completionTokens: number }): number {
  const inputCost = (usage.promptTokens / 1000) * KIMI_PRICING.input;
  const outputCost = (usage.completionTokens / 1000) * KIMI_PRICING.output;
  return inputCost + outputCost;
}
