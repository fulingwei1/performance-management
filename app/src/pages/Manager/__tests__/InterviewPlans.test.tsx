/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InterviewPlans } from '../InterviewPlans';

const authMock = vi.hoisted(() => ({
  user: {
    id: '1001',
    name: '部门经理',
    role: 'manager',
    department: '研发部',
  },
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => authMock,
}));

const apiMocks = vi.hoisted(() => ({
  getPlans: vi.fn(),
  createPlan: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  interviewRecordApi: {
    getPlans: apiMocks.getPlans,
    createPlan: apiMocks.createPlan,
  },
}));

describe('InterviewPlans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getPlans.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          title: 'Q1绩效面谈',
          interview_type: 'regular',
          scheduled_date: '2026-04-27',
          scheduled_time: '10:00',
          employee_id: 2001,
          manager_id: 1001,
          status: 'scheduled',
        },
      ],
    });
    apiMocks.createPlan.mockResolvedValue({ success: true, data: { id: 2 } });
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, data: [] }),
    })));
    vi.stubGlobal('alert', vi.fn());
  });

  it('通过统一 API 加载和创建面谈计划，不直接请求 localhost/fetch', async () => {
    const { container } = render(<InterviewPlans />);

    await waitFor(() => {
      expect(apiMocks.getPlans).toHaveBeenCalledWith({ manager_id: '1001' });
    });
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '已安排' }));
    await waitFor(() => {
      expect(apiMocks.getPlans).toHaveBeenLastCalledWith({ manager_id: '1001', status: 'scheduled' });
    });
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /创建面谈计划/ }));

    fireEvent.change(container.querySelector('input[type="text"]')!, {
      target: { value: '季度绩效面谈' },
    });
    fireEvent.change(container.querySelector('input[type="number"]')!, {
      target: { value: '2001' },
    });
    fireEvent.change(container.querySelector('input[type="date"]')!, {
      target: { value: '2026-04-30' },
    });

    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    await waitFor(() => {
      expect(apiMocks.createPlan).toHaveBeenCalledWith(expect.objectContaining({
        title: '季度绩效面谈',
        manager_id: '1001',
        employee_id: 2001,
        scheduled_date: '2026-04-30',
      }));
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
