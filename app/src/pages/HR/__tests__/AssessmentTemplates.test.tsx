/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AssessmentTemplates } from '../AssessmentTemplates';

const apiMocks = vi.hoisted(() => ({
  getTemplates: vi.fn(),
  deleteTemplate: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  assessmentTemplateApi: {
    getAll: apiMocks.getTemplates,
    delete: apiMocks.deleteTemplate,
  },
}));

vi.mock('../TemplateEditor', () => ({
  TemplateEditor: () => <div data-testid="template-editor" />,
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

describe('AssessmentTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('confirm', vi.fn(() => true));

    apiMocks.getTemplates.mockResolvedValue({
      success: true,
      data: [
        {
          id: 'tpl-001',
          name: '工程类模板',
          description: '工程团队考核模板',
          departmentType: 'engineering',
          isDefault: false,
          status: 'active',
          createdAt: '2026-04-01T00:00:00.000Z',
          metrics: [{ id: 'm1', metricName: '交付质量', metricCode: 'DELIVERY', weight: 100, category: '业务结果', evaluationType: 'qualitative' }],
        },
      ],
    });
    apiMocks.deleteTemplate.mockResolvedValue({ success: true });
  });

  it('加载、筛选和删除考核模板都走统一 API 服务，不直接 fetch 或手写 token', async () => {
    render(<AssessmentTemplates />);

    await screen.findByText('工程类模板');
    expect(apiMocks.getTemplates).toHaveBeenCalledWith({ departmentType: undefined, includeMetrics: true });
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '筛选工程类模板' }));

    await waitFor(() => {
      expect(apiMocks.getTemplates).toHaveBeenLastCalledWith({ departmentType: 'engineering', includeMetrics: true });
    });
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '删除模板 工程类模板' }));

    await waitFor(() => {
      expect(apiMocks.deleteTemplate).toHaveBeenCalledWith('tpl-001');
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
