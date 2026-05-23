import { memoryStore } from '../../config/database';
import { resolveTaskTemplateForEmployee } from '../../services/taskTemplateResolver.service';
import type { PerformanceRankingConfigV1 } from '../../services/performanceRankingConfig.service';

const baseConfig: PerformanceRankingConfigV1 = {
  version: 1,
  participation: {
    mode: 'include',
    enabledUnitKeys: ['工程技术中心'],
    includedUnitKeys: ['工程技术中心'],
    excludedUnitKeys: [],
    includedEmployeeIds: [],
    excludedEmployeeIds: [],
  },
  groupRank: {
    defaultStrategy: { type: 'by_high_low' },
    perUnit: {},
  },
  templateAssignments: {},
  mergeRankGroups: [],
};

function putTemplate(input: {
  id: string;
  name: string;
  departmentType?: string;
  isDefault?: boolean;
  roles?: string[];
  levels?: string[];
  positions?: string[];
  priority?: number;
}) {
  memoryStore.assessmentTemplates!.set(input.id, {
    id: input.id,
    name: input.name,
    description: '',
    department_type: input.departmentType || 'engineering',
    is_default: input.isDefault || false,
    status: 'active',
    applicable_roles: input.roles || ['employee'],
    applicable_levels: input.levels || [],
    applicable_positions: input.positions || [],
    priority: input.priority || 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as any);
}

describe('resolveTaskTemplateForEmployee', () => {
  beforeEach(() => {
    memoryStore.assessmentTemplates = new Map();
    memoryStore.templateMetrics = new Map();

    putTemplate({
      id: 'template-elec-default',
      name: '电气部门标准模板',
      isDefault: true,
    });
    putTemplate({
      id: 'template-mech-junior-001',
      name: '机械设计初级工程师考核模板',
      levels: ['junior'],
      positions: ['助理机械工程师', '初级机械工程师', '结构一组', '结构二组', '结构三组'],
      priority: 50,
    });
    putTemplate({
      id: 'template-debug-junior-001',
      name: '调试初级工程师考核模板',
      levels: ['junior'],
      positions: ['测试部', '新能源组', '现场支持'],
      priority: 50,
    });
    putTemplate({
      id: 'template-elec-junior-001',
      name: '电气初级工程师考核模板',
      levels: ['junior'],
      positions: ['PLC 部', 'PLC一组', 'PLC二组', 'PLC三组', 'PLC四组'],
      priority: 50,
    });
    putTemplate({
      id: 'template-sales-mgr-001',
      name: '销售部门销售经理考核模板',
      departmentType: 'sales',
      roles: ['manager'],
      levels: ['senior', 'manager'],
      positions: ['销售经理', '大客户经理', '营销中心总监'],
      priority: 60,
    });
    putTemplate({
      id: 'template-pm-senior-001',
      name: '高级项目经理考核模板',
      roles: ['manager'],
      levels: ['senior'],
      positions: ['高级项目经理', '项目总监', '项目主管'],
      priority: 50,
    });
  });

  it('prefers an employee position and level template over an inherited parent unit template', async () => {
    const resolved = await resolveTaskTemplateForEmployee({
      role: 'employee',
      level: 'junior',
      position: '助理机械工程师',
      department: '工程技术中心',
      subDepartment: '机械部',
    }, {
      ...baseConfig,
      templateAssignments: {
        工程技术中心: 'template-elec-default',
      },
    });

    expect(resolved).toMatchObject({
      id: 'template-mech-junior-001',
      name: '机械设计初级工程师考核模板',
      source: 'auto_match',
    });
  });

  it('keeps an employee template override above auto matching', async () => {
    const resolved = await resolveTaskTemplateForEmployee({
      id: 'e001',
      role: 'employee',
      level: 'junior',
      position: '助理机械工程师',
      department: '工程技术中心',
      subDepartment: '机械部',
    }, {
      ...baseConfig,
      templateAssignments: {
        'employee:e001': 'template-elec-default',
      },
    });

    expect(resolved).toMatchObject({
      id: 'template-elec-default',
      source: 'employee_override',
    });
  });

  it('does not let a department template override a more specific employee auto match', async () => {
    const resolved = await resolveTaskTemplateForEmployee({
      id: 'e002',
      role: 'employee',
      level: 'junior',
      position: '助理机械工程师',
      department: '工程技术中心',
      subDepartment: '机械部',
    }, {
      ...baseConfig,
      templateAssignments: {
        '工程技术中心/机械部': 'template-elec-default',
      },
    });

    expect(resolved).toMatchObject({
      id: 'template-mech-junior-001',
      source: 'auto_match',
    });
  });

  it('uses an inherited parent unit template as fallback when no position template matches', async () => {
    const resolved = await resolveTaskTemplateForEmployee({
      role: 'employee',
      level: 'junior',
      position: '未知岗位',
      department: '工程技术中心',
      subDepartment: '未知组',
    }, {
      ...baseConfig,
      templateAssignments: {
        工程技术中心: 'template-elec-default',
      },
    });

    expect(resolved).toMatchObject({
      id: 'template-elec-default',
      source: 'unit_config',
    });
  });

  it('uses sub-department clues when HR position is only a generic engineer title', async () => {
    const config = {
      ...baseConfig,
      templateAssignments: {
        工程技术中心: 'template-elec-default',
      },
    };

    await expect(resolveTaskTemplateForEmployee({
      role: 'employee',
      level: 'junior',
      position: '工程师',
      department: '工程技术中心',
      subDepartment: 'PLC 部/PLC四组',
    }, config)).resolves.toMatchObject({
      id: 'template-elec-junior-001',
      source: 'auto_match',
    });

    await expect(resolveTaskTemplateForEmployee({
      role: 'employee',
      level: 'junior',
      position: '工程师',
      department: '工程技术中心',
      subDepartment: '测试部/新能源组',
    }, config)).resolves.toMatchObject({
      id: 'template-debug-junior-001',
      source: 'auto_match',
    });

    await expect(resolveTaskTemplateForEmployee({
      role: 'employee',
      level: 'junior',
      position: '工程师',
      department: '工程技术中心',
      subDepartment: '新能源技术部/结构一组',
    }, config)).resolves.toMatchObject({
      id: 'template-mech-junior-001',
      source: 'auto_match',
    });
  });

  it('does not let employee level block department and subgroup template matching', async () => {
    const config = {
      ...baseConfig,
      templateAssignments: {
        工程技术中心: 'template-elec-default',
      },
    };

    await expect(resolveTaskTemplateForEmployee({
      role: 'employee',
      level: 'intermediate',
      position: '工程师',
      department: '工程技术中心',
      subDepartment: 'PLC 部/PLC四组',
    }, config)).resolves.toMatchObject({
      id: 'template-elec-junior-001',
      source: 'auto_match',
    });

    await expect(resolveTaskTemplateForEmployee({
      role: 'manager',
      level: 'senior',
      position: '组长',
      department: '工程技术中心',
      subDepartment: '测试部/白色家电组',
    }, config)).resolves.toMatchObject({
      id: 'template-elec-default',
      source: 'unit_config',
    });
  });

  it('does not assign role-only manager templates when the manager position does not match', async () => {
    await expect(resolveTaskTemplateForEmployee({
      role: 'manager',
      level: 'senior',
      position: '副经理',
      department: '工程技术中心',
      subDepartment: 'PLC 部/PLC四组',
    }, {
      ...baseConfig,
      templateAssignments: {
        工程技术中心: 'template-elec-default',
      },
    })).resolves.toMatchObject({
      id: 'template-elec-default',
      source: 'unit_config',
    });
  });
});
