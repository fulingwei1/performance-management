/** @vitest-environment jsdom */
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TodoSection } from '../TodoSection';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

describe('TodoSection', () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it('优先使用后端待办项携带的真实链接跳转', async () => {
    render(
      <TodoSection
        role="employee"
        fetchSummary={async () => ({
          success: true,
          data: {
            work_summary: {
              count: 1,
              dueDate: null,
              status: 'pending',
              items: [
                {
                  id: 'todo-1',
                  title: '提交 2026-03 月度工作总结',
                  link: '/employee/summary?month=2026-03',
                  dueDate: null,
                },
              ],
            },
          },
        })}
      />,
    );

    fireEvent.click(await screen.findByText('待填写工作总结'));

    expect(navigateMock).toHaveBeenCalledWith('/employee/summary?month=2026-03');
  });
});
