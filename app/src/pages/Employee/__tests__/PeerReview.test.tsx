/** @vitest-environment jsdom */
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PeerReview } from '../PeerReview';

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: {
      id: 'e001',
      name: '张三',
      department: '研发部',
      subDepartment: '软件组',
      role: 'employee',
      level: 'intermediate'
    }
  })
}));

const storage: Record<string, string> = {};

const mockLocalStorage = {
  getItem: vi.fn((key: string) => storage[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    storage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete storage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
  })
};

const jsonResponse = (data: unknown) => ({
  ok: true,
  headers: { get: () => 'application/json' },
  json: async () => data
});

describe('PeerReview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', mockLocalStorage);
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
  });

  it('加载互评周期时使用统一 API 地址并携带认证头', async () => {
    const fetchMock = vi.fn((url: string) => {
      if (url.includes('/peer-reviews/cycles')) {
        return Promise.resolve(jsonResponse({ success: true, data: [{ id: 1, name: '2026-Q1互评', start_date: '2026-01-01', end_date: '2026-03-31' }] }));
      }

      if (url.includes('/peer-reviews/relationships/1')) {
        return Promise.resolve(jsonResponse({ success: true, data: [] }));
      }

      return Promise.resolve(jsonResponse({ success: true, data: [] }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<PeerReview />);

    await waitFor(() => expect(screen.getByText('360度互评')).toBeInTheDocument());
    expect(fetchMock).toHaveBeenCalledWith('/api/peer-reviews/cycles?status=active', expect.objectContaining({
      headers: expect.objectContaining({ Authorization: 'Bearer test-token' })
    }));
  });
});
