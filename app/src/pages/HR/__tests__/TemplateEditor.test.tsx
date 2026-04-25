/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TemplateEditor } from '../TemplateEditor';

const apiMocks = vi.hoisted(() => ({
  createTemplate: vi.fn(),
  updateTemplate: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  assessmentTemplateApi: {
    create: apiMocks.createTemplate,
    update: apiMocks.updateTemplate,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('TemplateEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('保存已有考核模板时走统一 API 服务，不直接 fetch 或手写 token', async () => {
    apiMocks.updateTemplate.mockResolvedValue({ success: true });
    const onSave = vi.fn();

    render(
      <TemplateEditor
        viewMode={false}
        onSave={onSave}
        onCancel={vi.fn()}
        template={{
          id: 'tpl-001',
          name: '工程类模板',
          description: '工程部门绩效模板',
          departmentType: 'engineering',
          isDefault: false,
          status: 'active',
          metrics: [
            {
              id: 'metric-001',
              metricName: '项目交付',
              metricCode: 'DELIVERY',
              category: 'performance',
              weight: 100,
              evaluationType: 'qualitative',
              sortOrder: 0,
            },
          ],
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(apiMocks.updateTemplate).toHaveBeenCalledWith('tpl-001', expect.objectContaining({
        name: '工程类模板',
        departmentType: 'engineering',
        metrics: [expect.objectContaining({ metricCode: 'DELIVERY', weight: 100 })],
      }));
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
