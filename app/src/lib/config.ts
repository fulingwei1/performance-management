import type { EmployeeLevel } from '@/types';

// 员工级别定义
export const employeeLevels: Record<EmployeeLevel, { label: string; color: string }> = {
  senior: { label: '高级工程师', color: '#8B5CF6' },
  intermediate: { label: '中级工程师', color: '#3B82F6' },
  junior: { label: '初级工程师', color: '#10B981' },
  assistant: { label: '助理工程师', color: '#F59E0B' }
};

// 分组配置
export const groupConfig = {
  highLevels: ['senior', 'intermediate'] as EmployeeLevel[],
  lowLevels: ['junior', 'assistant'] as EmployeeLevel[],
  crossDeptGroups: ['机械部', '测试部', 'PLC'] // 跨部门排名的部门
};

/** 考核范围配置（由人力资源部在「考核范围设置」中维护，接口返回） */
export type AssessmentScopeConfig = {
  rootDepts: string[];
  subDeptsByRoot: Record<string, string[]>;
};

/** 判断员工是否在考核范围内（需传入从接口获取的 scope） */
export function isInAssessmentScope(
  emp: { department?: string; subDepartment?: string },
  scope: AssessmentScopeConfig
): boolean {
  // 如果考核范围未配置（空配置），则所有员工都参与考核
  if (!scope || (!scope.rootDepts?.length && !Object.keys(scope.subDeptsByRoot ?? {}).length)) return true;
  const dept = (emp.department ?? '').trim();
  const sub = (emp.subDepartment ?? '').trim();
  if (scope.rootDepts?.includes(dept)) return true;
  const subs = scope.subDeptsByRoot?.[dept];
  if (subs && subs.includes(sub)) return true;
  return false;
}

// 评分维度定义
export const scoreDimensions = [
  {
    key: 'taskCompletion',
    name: '承担任务量及任务完成情况',
    weight: 0.4,
    description: '评估员工承担任务的数量、难度及完成情况'
  },
  {
    key: 'initiative',
    name: '主动性态度与遵守纪律',
    weight: 0.3,
    description: '评估员工工作主动性、责任心及纪律遵守情况'
  },
  {
    key: 'projectFeedback',
    name: '参与项目经理的反馈情况',
    weight: 0.2,
    description: '评估员工在项目中的配合度及反馈质量'
  },
  {
    key: 'qualityImprovement',
    name: '工作质量意识与工作改进',
    weight: 0.1,
    description: '评估员工工作质量及持续改进意识'
  }
];

// 等级定义
export const scoreLevels = [
  { level: 'L5', score: 1.5, label: '优秀', color: '#10B981' },
  { level: 'L4', score: 1.2, label: '良好', color: '#3B82F6' },
  { level: 'L3', score: 1.0, label: '合格', color: '#F59E0B' },
  { level: 'L2', score: 0.8, label: '待改进', color: '#F97316' },
  { level: 'L1', score: 0.5, label: '不合格', color: '#EF4444' }
];

// 各维度各等级的具体表现标准
export const dimensionCriteria: Record<string, Record<string, { title: string; behaviors: string[] }>> = {
  // 承担任务量及任务完成情况 (40%)
  taskCompletion: {
    L5: {
      title: '远超预期',
      behaviors: [
        '主动承担超出岗位职责的高难度任务',
        '所有任务提前完成且质量优异',
        '任务完成率100%，无返工',
        '能独立解决复杂技术难题',
        '为团队贡献创新解决方案'
      ]
    },
    L4: {
      title: '超出预期',
      behaviors: [
        '积极承担额外任务，不推诿',
        '任务按时或提前完成，质量良好',
        '任务完成率95%以上',
        '能处理大部分技术问题',
        '偶尔需要少量指导'
      ]
    },
    L3: {
      title: '符合预期',
      behaviors: [
        '按要求完成分配的任务',
        '任务基本按时完成',
        '任务完成率90%左右',
        '能处理常规技术问题',
        '需要适当指导和支持'
      ]
    },
    L2: {
      title: '有待提升',
      behaviors: [
        '任务完成有延迟现象',
        '任务完成率80%左右',
        '常规问题处理需要帮助',
        '工作中有明显疏漏',
        '需要较多指导和跟进'
      ]
    },
    L1: {
      title: '不符合要求',
      behaviors: [
        '经常无法按时完成任务',
        '任务完成率低于70%',
        '工作质量问题频发',
        '缺乏基本的问题解决能力',
        '需要持续监督才能推进工作'
      ]
    }
  },
  
  // 主动性态度与遵守纪律 (30%)
  initiative: {
    L5: {
      title: '积极主动、堪称表率',
      behaviors: [
        '主动发现并解决潜在问题',
        '积极分享知识，帮助同事成长',
        '严格遵守各项规章制度',
        '主动承担团队责任',
        '面对困难保持积极态度，影响团队'
      ]
    },
    L4: {
      title: '主动积极',
      behaviors: [
        '工作不需要催促，主动推进',
        '愿意帮助同事解决问题',
        '遵守纪律，偶有小疏忽能及时改正',
        '主动汇报工作进展',
        '面对挑战态度积极'
      ]
    },
    L3: {
      title: '基本主动',
      behaviors: [
        '能按要求完成工作',
        '需要提醒时能及时响应',
        '基本遵守规章制度',
        '配合团队工作安排',
        '工作态度较为稳定'
      ]
    },
    L2: {
      title: '被动执行',
      behaviors: [
        '工作需要多次提醒催促',
        '对额外工作有抵触情绪',
        '偶有违反纪律现象',
        '工作汇报不够及时主动',
        '遇到困难容易放弃'
      ]
    },
    L1: {
      title: '消极怠工',
      behaviors: [
        '工作拖延，需要持续监督',
        '明显抵触工作安排',
        '多次违反规章制度',
        '缺乏责任心',
        '负面情绪影响团队氛围'
      ]
    }
  },
  
  // 参与项目经理的反馈情况 (20%)
  projectFeedback: {
    L5: {
      title: '高度认可',
      behaviors: [
        '项目经理评价极高，点名表扬',
        '跨部门协作获得一致好评',
        '主动推动项目进展，贡献突出',
        '沟通高效，问题反馈及时准确',
        '是项目成功的关键贡献者'
      ]
    },
    L4: {
      title: '评价良好',
      behaviors: [
        '项目经理评价正面',
        '跨部门协作顺畅',
        '能有效支持项目推进',
        '沟通及时，信息准确',
        '是可靠的项目成员'
      ]
    },
    L3: {
      title: '评价一般',
      behaviors: [
        '项目经理无明显负面反馈',
        '能配合完成项目任务',
        '跨部门沟通基本顺畅',
        '问题反馈基本及时',
        '项目参与度正常'
      ]
    },
    L2: {
      title: '有待改善',
      behaviors: [
        '项目经理反馈有改进空间',
        '跨部门协作偶有摩擦',
        '沟通不够及时或不够清晰',
        '对项目进度有一定影响',
        '需要加强项目意识'
      ]
    },
    L1: {
      title: '评价较差',
      behaviors: [
        '项目经理多次反馈问题',
        '跨部门协作困难',
        '沟通不畅，信息传递有误',
        '影响项目进度和质量',
        '缺乏项目责任意识'
      ]
    }
  },
  
  // 工作质量意识与工作改进 (10%)
  qualityImprovement: {
    L5: {
      title: '追求卓越',
      behaviors: [
        '持续优化工作流程和方法',
        '主动学习新技术新工具',
        '工作零缺陷或接近零缺陷',
        '带动团队质量意识提升',
        '有显著的改进成果和创新'
      ]
    },
    L4: {
      title: '注重质量',
      behaviors: [
        '工作细致，很少出错',
        '主动复盘总结经验',
        '能发现并改进工作中的问题',
        '乐于接受反馈并改进',
        '有持续学习的意愿和行动'
      ]
    },
    L3: {
      title: '质量达标',
      behaviors: [
        '工作质量基本稳定',
        '能按规范要求执行',
        '发现问题能及时纠正',
        '接受反馈态度正面',
        '有一定的改进意识'
      ]
    },
    L2: {
      title: '质量波动',
      behaviors: [
        '工作中偶有质量问题',
        '同类错误有重复发生',
        '改进意识不够强',
        '对反馈接受度一般',
        '需要加强质量管控'
      ]
    },
    L1: {
      title: '质量堪忧',
      behaviors: [
        '工作质量问题频发',
        '同类错误反复出现',
        '缺乏质量意识',
        '对反馈有抵触情绪',
        '看不到改进的意愿和行动'
      ]
    }
  }
};

// 获取某维度某等级的具体标准
export function getDimensionCriteria(dimensionKey: string, level: string) {
  return dimensionCriteria[dimensionKey]?.[level];
}

// 360度评分维度
export const peerReviewDimensions = [
  { key: 'collaboration', name: '协作态度', description: '评估协作配合的积极性' },
  { key: 'professionalism', name: '专业能力', description: '评估专业技能水平' },
  { key: 'communication', name: '沟通效率', description: '评估沟通协作效率' }
];

// 获取员工级别标签
export function getLevelLabel(level: EmployeeLevel): string {
  return employeeLevels[level]?.label || level;
}

// 获取员工级别颜色
export function getLevelColor(level: EmployeeLevel): string {
  return employeeLevels[level]?.color || '#6B7280';
}

// 判断员工属于高分组还是低分组
export function getGroupType(level: EmployeeLevel): 'high' | 'low' {
  return groupConfig.highLevels.includes(level) ? 'high' : 'low';
}
