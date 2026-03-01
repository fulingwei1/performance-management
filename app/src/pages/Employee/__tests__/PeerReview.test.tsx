import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PeerReview from '../PeerReview';

// Mock authStore
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { id: 1, name: '张三', role: 'employee' }
  }))
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockActiveCycles = [
  { id: 1, name: '2026-Q1互评', start_date: '2026-01-01', end_date: '2026-03-31', status: 'active' }
];

const mockMyReviews = [
  { id: 1, reviewee_id: 2, relationship_type: 'peer', status: 'pending' },
  { id: 2, reviewee_id: 3, relationship_type: 'cross_dept', status: 'completed' },
  { id: 3, reviewee_id: 4, relationship_type: 'subordinate', status: 'pending' },
];

function setupFetch(overrides: any = {}) {
  mockFetch.mockImplementation((url: string, opts?: any) => {
    if (url.includes('/cycles')) {
      return Promise.resolve({ json: () => Promise.resolve(overrides.cycles ?? { success: true, data: mockActiveCycles }) });
    }
    if (url.includes('/relationships') && (!opts || !opts.method)) {
      return Promise.resolve({ json: () => Promise.resolve(overrides.reviews ?? { success: true, data: mockMyReviews }) });
    }
    if (url.includes('/reviews') && opts?.method === 'POST') {
      return Promise.resolve({ json: () => Promise.resolve(overrides.submit ?? { success: true }) });
    }
    return Promise.resolve({ json: () => Promise.resolve({ success: true, data: [] }) });
  });
}

describe('PeerReview (Employee)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupFetch();
  });

  it('shows loading state initially', () => {
    mockFetch.mockImplementation(() => new Promise(() => {}));
    render(<PeerReview />);
    expect(screen.getByText('加载中...')).toBeInTheDocument();
  });

  it('renders page title after loading', async () => {
    render(<PeerReview />);
    await waitFor(() => {
      expect(screen.getByText('360度互评')).toBeInTheDocument();
      expect(screen.getByText(/评价您的同事/)).toBeInTheDocument();
    });
  });

  it('renders 3 progress stat cards', async () => {
    render(<PeerReview />);
    await waitFor(() => {
      expect(screen.getByText('需要评价')).toBeInTheDocument();
      expect(screen.getAllByText('已完成').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('待完成')).toBeInTheDocument();
    });
  });

  it('displays correct stat values', async () => {
    render(<PeerReview />);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  it('renders peer review list', async () => {
    render(<PeerReview />);
    await waitFor(() => {
      expect(screen.getByText('我需要评价的同事')).toBeInTheDocument();
      expect(screen.getByText('被评价人 #2')).toBeInTheDocument();
      expect(screen.getByText('被评价人 #3')).toBeInTheDocument();
    });
  });

  it('shows completed status for finished reviews', async () => {
    render(<PeerReview />);
    await waitFor(() => {
      expect(screen.getAllByText('已完成').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows "开始评价" button for pending reviews', async () => {
    render(<PeerReview />);
    await waitFor(() => {
      const buttons = screen.getAllByText('开始评价');
      expect(buttons.length).toBe(2); // 2 pending reviews
    });
  });

  it('opens review modal when clicking "开始评价"', async () => {
    const user = userEvent.setup();
    render(<PeerReview />);
    
    await waitFor(() => expect(screen.getAllByText('开始评价').length).toBe(2));
    
    await user.click(screen.getAllByText('开始评价')[0]);
    
    await waitFor(() => {
      expect(screen.getByText('团队协作')).toBeInTheDocument();
      expect(screen.getByText('沟通能力')).toBeInTheDocument();
      expect(screen.getByText('专业能力')).toBeInTheDocument();
      expect(screen.getByText('责任心')).toBeInTheDocument();
      expect(screen.getByText('创新能力')).toBeInTheDocument();
    });
  });

  it('shows total score in review modal', async () => {
    const user = userEvent.setup();
    render(<PeerReview />);
    
    await waitFor(() => expect(screen.getAllByText('开始评价').length).toBe(2));
    await user.click(screen.getAllByText('开始评价')[0]);
    
    await waitFor(() => {
      expect(screen.getByText('综合评分')).toBeInTheDocument();
      expect(screen.getByText('3.0')).toBeInTheDocument(); // default all 3.0
    });
  });

  it('shows empty state when no active cycles', async () => {
    setupFetch({ cycles: { success: true, data: [] } });
    render(<PeerReview />);
    await waitFor(() => {
      expect(screen.getByText('暂无进行中的互评')).toBeInTheDocument();
    });
  });

  it('submits review form via API', async () => {
    const user = userEvent.setup();
    render(<PeerReview />);
    
    await waitFor(() => expect(screen.getAllByText('开始评价').length).toBe(2));
    await user.click(screen.getAllByText('开始评价')[0]);
    
    await waitFor(() => expect(screen.getByText('团队协作')).toBeInTheDocument());
    
    // Fill required field
    await user.type(screen.getByPlaceholderText(/请写出同事的优点/), '很好的同事');
    
    await user.click(screen.getByText('提交评价'));
    
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/reviews'),
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
