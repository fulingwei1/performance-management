import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InterviewPlans from '../InterviewPlans';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 1, name: '经理A', role: 'manager' }
  }))
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockPlans = [
  { id: 1, title: 'Q1绩效面谈', description: '季度面谈', status: 'scheduled', interview_type: 'regular', scheduled_date: '2026-03-05', scheduled_time: '10:00', duration_minutes: 60, employee_id: 2 },
  { id: 2, title: '试用期面谈', description: '', status: 'completed', interview_type: 'probation', scheduled_date: '2026-02-20', scheduled_time: '14:00', duration_minutes: 45, employee_id: 3 },
  { id: 3, title: '晋升评估', description: '', status: 'cancelled', interview_type: 'promotion', scheduled_date: '2026-01-15', duration_minutes: 90, employee_id: 4 },
];

function setupFetch(overrides: any = {}) {
  mockFetch.mockImplementation((url: string, opts?: any) => {
    if (opts?.method === 'POST') {
      return Promise.resolve({ json: () => Promise.resolve(overrides.create ?? { success: true }) });
    }
    if (url.includes('/plans')) {
      return Promise.resolve({ json: () => Promise.resolve(overrides.plans ?? { success: true, data: mockPlans }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: true, data: [] }) });
  });
}

describe('InterviewPlans', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
  });

  it('renders page title', async () => {
    render(<InterviewPlans />);
    expect(screen.getByText('面谈计划')).toBeInTheDocument();
    expect(screen.getByText(/安排和管理/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<InterviewPlans />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders 4 stat cards', async () => {
    render(<InterviewPlans />);
    await waitFor(() => {
      expect(screen.getAllByText('已安排').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('本周')).toBeInTheDocument();
      expect(screen.getAllByText('已完成').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('已取消').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders plan list', async () => {
    render(<InterviewPlans />);
    await waitFor(() => {
      expect(screen.getByText('Q1绩效面谈')).toBeInTheDocument();
      expect(screen.getByText('试用期面谈')).toBeInTheDocument();
      expect(screen.getAllByText('晋升评估').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows empty state when no plans', async () => {
    setupFetch({ plans: { success: true, data: [] } });
    render(<InterviewPlans />);
    await waitFor(() => {
      expect(screen.getByText('暂无面谈计划')).toBeInTheDocument();
    });
  });

  it('renders filter buttons', async () => {
    render(<InterviewPlans />);
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '全部' })).toBeInTheDocument();
      // The stat cards also show these labels, so use getAllByText
      expect(screen.getAllByText('已安排').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('filter buttons trigger API refetch', async () => {
    const user = userEvent.setup();
    render(<InterviewPlans />);
    
    await waitFor(() => expect(screen.getByText('Q1绩效面谈')).toBeInTheDocument());
    
    const initialCallCount = mockFetch.mock.calls.length;
    
    // Click filter - use getAllByText and find the button
    const scheduledButtons = screen.getAllByText('已安排');
    const filterButton = scheduledButtons.find(el => el.tagName === 'BUTTON' || el.closest('button'));
    if (filterButton) {
      const btn = filterButton.closest('button') || filterButton;
      await user.click(btn);
    }
    
    await waitFor(() => {
      expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  it('opens create plan modal', async () => {
    const user = userEvent.setup();
    render(<InterviewPlans />);
    
    await user.click(screen.getByText('创建面谈计划'));
    
    await waitFor(() => {
      expect(screen.getByText('面谈主题 *')).toBeInTheDocument();
      expect(screen.getByText('面谈类型 *')).toBeInTheDocument();
    });
  });

  it('closes create plan modal on cancel', async () => {
    const user = userEvent.setup();
    render(<InterviewPlans />);
    
    await user.click(screen.getByText('创建面谈计划'));
    await waitFor(() => expect(screen.getByText('面谈主题 *')).toBeInTheDocument());
    
    await user.click(screen.getByText('取消'));
    await waitFor(() => {
      expect(screen.queryByText('面谈主题 *')).not.toBeInTheDocument();
    });
  });

  it('submits create plan form', async () => {
    const user = userEvent.setup();
    render(<InterviewPlans />);
    
    await user.click(screen.getByText('创建面谈计划'));
    await waitFor(() => expect(screen.getByText('面谈主题 *')).toBeInTheDocument());
    
    await user.type(screen.getByPlaceholderText('例如: Q1绩效面谈'), '新面谈');
    await user.type(screen.getByPlaceholderText('输入员工ID'), '5');
    
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    await user.clear(dateInput);
    await user.type(dateInput, '2026-04-01');
    
    await user.click(screen.getByRole('button', { name: '创建' }));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/plans'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('calls API with manager_id filter', async () => {
    render(<InterviewPlans />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('manager_id=1'));
    });
  });
});
