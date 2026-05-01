/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DifferentiatedScoring } from '../DifferentiatedScoring';

const authMock = vi.hoisted(() => ({
  user: {
    id: '1001',
    name: '部门经理',
    role: 'manager',
    department: '研发部',
  },
}));

const apiMocks = vi.hoisted(() => ({
  getEmployees: vi.fn(),
  getDepartmentTree: vi.fn(),
  getDefaultTemplate: vi.fn(),
  getTemplateById: vi.fn(),
  resolveLevelTemplate: vi.fn(),
  createOrUpdateMonthlyAssessment: vi.fn(),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => authMock,
}));

vi.mock('@/components/help/DifferentiatedScoringHelp', () => ({
  DifferentiatedScoringHelp: () => <div data-testid="scoring-help" />,
}));

vi.mock('@/services/api', () => ({
  employeeApi: {
    getAll: apiMocks.getEmployees,
  },
  organizationApi: {
    getDepartmentTree: apiMocks.getDepartmentTree,
  },
  assessmentTemplateApi: {
    getById: apiMocks.getTemplateById,
    getDefault: apiMocks.getDefaultTemplate,
  },
  levelTemplateRuleApi: {
    resolve: apiMocks.resolveLevelTemplate,
  },
  monthlyAssessmentApi: {
    createOrUpdate: apiMocks.createOrUpdateMonthlyAssessment,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('DifferentiatedScoring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      json: async () => ({ success: true, data: [] }),
    })));

    apiMocks.getEmployees.mockResolvedValue({
      success: true,
      data: [
        {
          id: '2001',
          name: '张三',
          department: '研发部',
          position: '工程师',
          managerId: '1001',
        },
      ],
    });
    apiMocks.getDepartmentTree.mockResolvedValue({
      success: true,
      data: [
        {
          name: '研发部',
          department_type: 'engineering',
          children: [],
        },
      ],
    });
    apiMocks.resolveLevelTemplate.mockResolvedValue({
      success: false,
      data: null,
    });
    apiMocks.getDefaultTemplate.mockResolvedValue({
      success: true,
      data: {
        id: 'tpl-001',
        name: '工程类默认模板',
        departmentType: 'engineering',
        metrics: [
          {
            id: 'metric-001',
            metricName: '项目交付',
            metricCode: 'DELIVERY',
            weight: 100,
            category: '业务结果',
            description: '按期高质量交付项目',
            evaluationType: 'qualitative',
          },
        ],
      },
    });
    apiMocks.createOrUpdateMonthlyAssessment.mockResolvedValue({
      success: true,
      message: '评分已创建',
    });
  });

  it('加载员工、模板和保存评分都走统一 API 服务，不直接 fetch 或手写 token', async () => {
    render(<DifferentiatedScoring />);

    await waitFor(() => {
      expect(apiMocks.getEmployees).toHaveBeenCalledTimes(1);
    });
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByText('张三'));

    await waitFor(() => {
      expect(apiMocks.getDepartmentTree).toHaveBeenCalledTimes(1);
    });
    expect(apiMocks.getDefaultTemplate).toHaveBeenCalledWith('engineering');
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(await screen.findByRole('button', { name: /L4/ }));
    fireEvent.change(screen.getByPlaceholderText('请输入具体评价...'), {
      target: { value: '交付质量稳定' },
    });
    fireEvent.click(screen.getByRole('button', { name: /保存评分/ }));

    await waitFor(() => {
      expect(apiMocks.createOrUpdateMonthlyAssessment).toHaveBeenCalledWith(expect.objectContaining({
        employeeId: '2001',
        templateId: 'tpl-001',
        templateName: '工程类默认模板',
        departmentType: 'engineering',
        totalScore: 1.2,
        scores: [expect.objectContaining({
          metricName: '项目交付',
          metricCode: 'DELIVERY',
          weight: 100,
          level: 'L4',
          score: 1.2,
          comment: '交付质量稳定',
        })],
      }));
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
