import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InterviewRecord from '../InterviewRecord';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 1, name: '经理A', role: 'manager' }
  }))
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const today = new Date();
const thisMonthDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-15`;

const mockRecords = [
  { id: 1, employee_id: 2, interview_date: thisMonthDate, duration_minutes: 60, overall_rating: 4.0, achievements: '完成重大项目', manager_feedback: '表现优秀', challenges: '时间管理', strengths: '技术能力强', improvements: '沟通待加强', notes: '' },
  { id: 2, employee_id: 3, interview_date: '2025-12-15', duration_minutes: 45, overall_rating: 3.5, achievements: '稳定输出', manager_feedback: '持续进步', challenges: '', strengths: '', improvements: '', notes: '' },
];

function setupFetch(overrides: any = {}) {
  mockFetch.mockImplementation((url: string, opts?: any) => {
    if (opts?.method === 'POST') {
      return Promise.resolve({ json: () => Promise.resolve(overrides.create ?? { success: true }) });
    }
    if (url.includes('/records')) {
      return Promise.resolve({ json: () => Promise.resolve(overrides.records ?? { success: true, data: mockRecords }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: true, data: [] }) });
  });
}

describe('InterviewRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
  });

  it('renders page title', async () => {
    render(<InterviewRecord />);
    expect(screen.getByText('面谈记录')).toBeInTheDocument();
    expect(screen.getByText(/记录和管理/)).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<InterviewRecord />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders 3 stat cards', async () => {
    render(<InterviewRecord />);
    await waitFor(() => {
      expect(screen.getByText('总记录数')).toBeInTheDocument();
      expect(screen.getByText('本月面谈')).toBeInTheDocument();
      expect(screen.getByText('平均评分')).toBeInTheDocument();
    });
  });

  it('displays correct stat values', async () => {
    render(<InterviewRecord />);
    await waitFor(() => {
      // Total: 2, This month: 1, Average: (4.0+3.5)/2 = 3.8
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3.8')).toBeInTheDocument();
    });
  });

  it('renders record list', async () => {
    render(<InterviewRecord />);
    await waitFor(() => {
      expect(screen.getByText('面谈记录列表')).toBeInTheDocument();
      expect(screen.getByText(/员工 #2 的面谈/)).toBeInTheDocument();
      expect(screen.getByText(/员工 #3 的面谈/)).toBeInTheDocument();
    });
  });

  it('shows empty state when no records', async () => {
    setupFetch({ records: { success: true, data: [] } });
    render(<InterviewRecord />);
    await waitFor(() => {
      expect(screen.getByText('暂无面谈记录')).toBeInTheDocument();
      expect(screen.getByText('创建第一条面谈记录')).toBeInTheDocument();
    });
  });

  it('opens create record modal', async () => {
    const user = userEvent.setup();
    render(<InterviewRecord />);
    
    await waitFor(() => expect(screen.getByText('面谈记录列表')).toBeInTheDocument());
    
    // Click the button in the header (not the empty state link)
    const createButton = screen.getByRole('button', { name: /新建面谈记录/ });
    await user.click(createButton);
    
    await waitFor(() => {
      expect(screen.getByText('员工ID *')).toBeInTheDocument();
      expect(screen.getByText('总体评分')).toBeInTheDocument();
      expect(screen.getByText('绩效得分')).toBeInTheDocument();
      expect(screen.getByText('潜力得分')).toBeInTheDocument();
    });
  });

  it('closes create record modal on cancel', async () => {
    const user = userEvent.setup();
    render(<InterviewRecord />);
    
    await user.click(screen.getByText('新建面谈记录'));
    await waitFor(() => expect(screen.getByText('员工ID *')).toBeInTheDocument());
    
    await user.click(screen.getByText('取消'));
    await waitFor(() => {
      expect(screen.queryByText('员工ID *')).not.toBeInTheDocument();
    });
  });

  it('opens detail modal when clicking a record', async () => {
    const user = userEvent.setup();
    render(<InterviewRecord />);
    
    await waitFor(() => expect(screen.getByText(/员工 #2 的面谈/)).toBeInTheDocument());
    
    // Click the "查看详情" button for the first record
    const detailButtons = screen.getAllByText('查看详情');
    await user.click(detailButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('面谈记录详情')).toBeInTheDocument();
    });
  });

  it('submits create record form', async () => {
    const user = userEvent.setup();
    render(<InterviewRecord />);
    
    await user.click(screen.getByText('新建面谈记录'));
    await waitFor(() => expect(screen.getByText('员工ID *')).toBeInTheDocument());
    
    // Fill required fields - employee_id is the first number input in the modal
    const numberInputs = document.querySelectorAll('input[type="number"]');
    await user.type(numberInputs[0] as HTMLInputElement, '5');
    
    await user.type(screen.getByPlaceholderText(/本周期的主要成就/), '完成了目标');
    await user.type(screen.getByPlaceholderText(/对员工的整体反馈/), '继续努力');
    
    await user.click(screen.getByText('保存记录'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/records'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('calls API with manager_id on mount', async () => {
    render(<InterviewRecord />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('manager_id=1'));
    });
  });
});
