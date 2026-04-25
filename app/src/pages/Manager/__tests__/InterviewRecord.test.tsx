/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InterviewRecord } from '../InterviewRecord';

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
  getRecords: vi.fn(),
  createRecord: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  interviewRecordApi: {
    getRecords: apiMocks.getRecords,
    createRecord: apiMocks.createRecord,
  },
}));

describe('InterviewRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getRecords.mockResolvedValue({
      success: true,
      data: [
        {
          id: 1,
          employee_id: 2001,
          manager_id: 1001,
          interview_date: '2026-04-25',
          overall_rating: 4.5,
          achievements: '完成核心项目',
          manager_feedback: '表现优秀',
        },
      ],
    });
    apiMocks.createRecord.mockResolvedValue({ success: true, data: { id: 2 } });
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, data: [] }),
    })));
    vi.stubGlobal('alert', vi.fn());
  });

  it('通过统一 API 加载和创建面谈记录，不直接请求 localhost/fetch', async () => {
    const { container } = render(<InterviewRecord />);

    await waitFor(() => {
      expect(apiMocks.getRecords).toHaveBeenCalledWith({ manager_id: '1001' });
    });
    expect(global.fetch).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /新建面谈记录/ }));

    fireEvent.change(container.querySelector('input[type="number"]')!, {
      target: { value: '2001' },
    });
    fireEvent.change(screen.getByPlaceholderText('本周期的主要成就和亮点'), {
      target: { value: '完成核心项目' },
    });
    fireEvent.change(screen.getByPlaceholderText('对员工的整体反馈和建议'), {
      target: { value: '表现优秀，继续保持' },
    });

    fireEvent.click(screen.getByRole('button', { name: '保存记录' }));

    await waitFor(() => {
      expect(apiMocks.createRecord).toHaveBeenCalledWith(expect.objectContaining({
        manager_id: '1001',
        employee_id: 2001,
        achievements: '完成核心项目',
        manager_feedback: '表现优秀，继续保持',
      }));
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
