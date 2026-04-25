/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PeerReviewManagement } from '../PeerReviewManagement';

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

describe('PeerReviewManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', mockLocalStorage);
    localStorage.clear();
    localStorage.setItem('token', 'hr-token');
  });

  it('创建互评周期时使用统一 API 地址并携带认证头', async () => {
    const fetchMock = vi.fn((url: string, options?: RequestInit) => {
      if (url.includes('/peer-reviews/cycles') && options?.method === 'POST') {
        return Promise.resolve(jsonResponse({ success: true, data: { id: 1 } }));
      }

      return Promise.resolve(jsonResponse({ success: true, data: [] }));
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<PeerReviewManagement />);

    await screen.findByText('暂无互评周期');
    fireEvent.click(screen.getByRole('button', { name: /创建互评周期/ }));
    fireEvent.change(screen.getByPlaceholderText('例如: 2026-Q1同事互评'), { target: { value: '2026-Q1同事互评' } });
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2026-01-01' } });
    fireEvent.change(dateInputs[1], { target: { value: '2026-03-31' } });
    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/peer-reviews/cycles', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer hr-token' })
    })));
  });
});
