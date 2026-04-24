/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import GoalDashboard from '../GoalDashboard';

const navigateMock = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/services/api', () => ({
  goalDashboardApi: {
    getTeamProgress: vi.fn(async () => ({
      success: true,
      data: {
        stats: { totalObjectives: 1, onTrack: 0, atRisk: 1, critical: 0 },
        objectives: [
          {
            id: 'obj-1',
            title: '滞后目标',
            ownerName: '张三',
            progress: 40,
          },
        ],
        byEmployee: [{ employeeName: '张三', avgProgress: 40 }],
      },
    })),
    getProgressTrend: vi.fn(async () => ({ success: true, data: [] })),
  },
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
  Tooltip: () => <div />,
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Legend: () => <div />,
}));

describe('GoalDashboard', () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it('查看关注目标时跳转到真实存在的团队目标页面', async () => {
    render(<GoalDashboard />);

    await waitFor(() => expect(screen.getByText('滞后目标')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '查看详情' }));

    expect(navigateMock).toHaveBeenCalledWith('/manager/team-objectives');
  });
});
