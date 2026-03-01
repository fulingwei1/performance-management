import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PeerReviewManagement from '../PeerReviewManagement';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock window.confirm
global.confirm = vi.fn(() => true);

const mockCycles = [
  { id: 1, name: '2026-Q1互评', description: '季度互评', start_date: '2026-01-01', end_date: '2026-03-31', review_type: 'peer', status: 'active' },
  { id: 2, name: '2025-Q4互评', description: '', start_date: '2025-10-01', end_date: '2025-12-31', review_type: 'upward', status: 'closed' },
];

const mockRelationships = [
  { id: 1, reviewer_id: 1, reviewee_id: 2, relationship_type: 'peer', status: 'completed' },
  { id: 2, reviewer_id: 3, reviewee_id: 1, relationship_type: 'peer', status: 'pending' },
];

const mockEmployees = [
  { id: 1, name: '张三', department: '技术部' },
  { id: 2, name: '李四', department: '市场部' },
  { id: 3, name: '王五', department: '技术部' },
];

function setupFetchMock(overrides: Record<string, any> = {}) {
  mockFetch.mockImplementation((url: string, opts?: any) => {
    if (url.includes('/cycles') && (!opts || opts.method !== 'POST')) {
      return Promise.resolve({ json: () => Promise.resolve(overrides.cycles ?? { success: true, data: mockCycles }) });
    }
    if (url.includes('/relationships') && (!opts || opts.method !== 'POST') && !opts?.method) {
      return Promise.resolve({ json: () => Promise.resolve(overrides.relationships ?? { success: true, data: mockRelationships }) });
    }
    if (url.includes('/hr/employees')) {
      return Promise.resolve({ json: () => Promise.resolve({ success: true, data: mockEmployees }) });
    }
    if (url.includes('/cycles') && opts?.method === 'POST') {
      return Promise.resolve({ json: () => Promise.resolve(overrides.createCycle ?? { success: true }) });
    }
    if (url.includes('/relationships') && opts?.method === 'POST') {
      return Promise.resolve({ json: () => Promise.resolve(overrides.createRel ?? { success: true }) });
    }
    if (url.includes('/relationships') && opts?.method === 'DELETE') {
      return Promise.resolve({ json: () => Promise.resolve({ success: true }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: true, data: [] }) });
  });
}

describe('PeerReviewManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetchMock();
  });

  it('renders page title and description', async () => {
    render(<PeerReviewManagement />);
    expect(screen.getByText('360度互评管理')).toBeInTheDocument();
    expect(screen.getByText(/管理互评周期/)).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<PeerReviewManagement />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders 4 stat cards after loading', async () => {
    render(<PeerReviewManagement />);
    await waitFor(() => {
      expect(screen.getByText('进行中的周期')).toBeInTheDocument();
      expect(screen.getByText('评价关系总数')).toBeInTheDocument();
      expect(screen.getByText('完成率')).toBeInTheDocument();
      expect(screen.getByText('待评价')).toBeInTheDocument();
    });
  });

  it('renders cycle list after data loads', async () => {
    render(<PeerReviewManagement />);
    await waitFor(() => {
      expect(screen.getByText('2026-Q1互评')).toBeInTheDocument();
      expect(screen.getByText('2025-Q4互评')).toBeInTheDocument();
    });
  });

  it('shows empty state when no cycles', async () => {
    setupFetchMock({ cycles: { success: true, data: [] } });
    render(<PeerReviewManagement />);
    await waitFor(() => {
      expect(screen.getByText('暂无互评周期')).toBeInTheDocument();
      expect(screen.getByText('创建第一个互评周期')).toBeInTheDocument();
    });
  });

  it('opens create cycle modal when button clicked', async () => {
    const user = userEvent.setup();
    render(<PeerReviewManagement />);
    
    await user.click(screen.getByText('创建互评周期'));
    await waitFor(() => {
      expect(screen.getByText('周期名称 *')).toBeInTheDocument();
    });
  });

  it('closes create cycle modal on cancel', async () => {
    const user = userEvent.setup();
    render(<PeerReviewManagement />);
    
    await user.click(screen.getByText('创建互评周期'));
    await waitFor(() => expect(screen.getByText('周期名称 *')).toBeInTheDocument());
    
    await user.click(screen.getByText('取消'));
    await waitFor(() => {
      expect(screen.queryByText('周期名称 *')).not.toBeInTheDocument();
    });
  });

  it('submits create cycle form', async () => {
    const user = userEvent.setup();
    render(<PeerReviewManagement />);
    
    await user.click(screen.getByText('创建互评周期'));
    await waitFor(() => expect(screen.getByText('周期名称 *')).toBeInTheDocument());
    
    await user.type(screen.getByPlaceholderText('例如: 2026-Q1同事互评'), '新周期');
    
    // Fill date inputs by finding them via type="date"
    const dateInputs = document.querySelectorAll('input[type="date"]');
    await user.clear(dateInputs[0] as HTMLInputElement);
    await user.type(dateInputs[0] as HTMLInputElement, '2026-04-01');
    await user.clear(dateInputs[1] as HTMLInputElement);
    await user.type(dateInputs[1] as HTMLInputElement, '2026-06-30');
    
    await user.click(screen.getByRole('button', { name: '创建' }));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/cycles'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });

  it('calls fetch for cycles on mount', async () => {
    render(<PeerReviewManagement />);
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/cycles'));
    });
  });

  it('opens configure relationships modal', async () => {
    const user = userEvent.setup();
    render(<PeerReviewManagement />);
    
    await waitFor(() => expect(screen.getByText('2026-Q1互评')).toBeInTheDocument());
    
    const configButtons = screen.getAllByText('配置关系');
    await user.click(configButtons[0]);
    
    await waitFor(() => {
      expect(screen.getByText('配置评价关系')).toBeInTheDocument();
    });
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValue(new Error('Network error'));
    render(<PeerReviewManagement />);
    
    // Should not crash, should show empty state
    await waitFor(() => {
      expect(screen.getByText('暂无互评周期')).toBeInTheDocument();
    });
  });
});
