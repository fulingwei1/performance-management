/** @vitest-environment jsdom */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PeerReviewManage } from '../PeerReviewManage';

const peerReviewApiMock = vi.hoisted(() => ({
  getCycles: vi.fn(),
  getStatistics: vi.fn(),
  getDepartmentStats: vi.fn(),
  allocateReviews: vi.fn(),
}));

vi.mock('@/services/api', () => ({
  default: {
    peerReview: peerReviewApiMock,
  },
  peerReviewApi: peerReviewApiMock,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'm001',
      name: '部门经理',
      role: 'manager',
      department: '研发部',
      subDepartment: '软件组',
    },
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}));

describe('PeerReviewManage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    peerReviewApiMock.getCycles.mockResolvedValue({
      success: true,
      data: [{ id: 12, name: '2026-04 360度互评', status: 'active' }],
    });
    peerReviewApiMock.getStatistics.mockResolvedValue({
      success: true,
      data: [
        {
          reviewee_id: 101,
          total_reviews: 3,
          completed_reviews: 2,
          avg_total_score: 4.25,
        },
      ],
    });
    peerReviewApiMock.getDepartmentStats.mockResolvedValue({ success: true, data: [] });
    peerReviewApiMock.allocateReviews.mockResolvedValue({ success: true, data: { allocated: 0 } });
  });

  it('加载经理互评概览时使用真实周期和统计接口，不调用后端不存在的旧接口', async () => {
    render(<PeerReviewManage />);

    await waitFor(() => {
      expect(peerReviewApiMock.getCycles).toHaveBeenCalledWith({ status: 'active' });
    });
    await waitFor(() => {
      expect(peerReviewApiMock.getStatistics).toHaveBeenCalledWith(12);
    });

    expect(peerReviewApiMock.getDepartmentStats).not.toHaveBeenCalled();
    expect(peerReviewApiMock.allocateReviews).not.toHaveBeenCalled();
    expect(await screen.findByText('员工 #101')).toBeInTheDocument();
  });

  it('点击详情按钮会打开员工互评统计详情', async () => {
    render(<PeerReviewManage />);

    expect(await screen.findByText('员工 #101')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /详情/ }));

    expect(await screen.findByText('收到评价')).toBeInTheDocument();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    expect(screen.getByText('4.25')).toBeInTheDocument();
  });
});
