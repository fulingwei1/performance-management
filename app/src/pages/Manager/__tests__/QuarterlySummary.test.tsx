/** @vitest-environment jsdom */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QuarterlySummary } from '../QuarterlySummary';

const navigateMock = vi.fn();

const authMock = vi.hoisted(() => ({
  user: {
    id: 'm001',
    name: '部门经理',
    role: 'manager',
    department: '研发部',
    subDepartment: '软件组',
  },
}));

const apiMocks = vi.hoisted(() => ({
  getSubordinates: vi.fn(),
  generateQuarterlySummary: vi.fn(),
}));

const hrStoreMocks = vi.hoisted(() => ({
  saveQuarterlySummary: vi.fn(),
  fetchQuarterlySummary: vi.fn(),
  getQuarterlySummary: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => authMock,
}));

vi.mock('@/stores/hrStore', () => ({
  useHRStore: (selector: any) => selector(hrStoreMocks),
}));

vi.mock('@/services/api', () => ({
  employeeApi: {
    getSubordinates: apiMocks.getSubordinates,
  },
  aiApi: {
    generateQuarterlySummary: apiMocks.generateQuarterlySummary,
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
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
  }),
};

describe('QuarterlySummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('localStorage', mockLocalStorage);
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ success: true, data: { versions: ['旧硬编码接口返回'] } }),
    })));
    localStorage.clear();
    localStorage.setItem('token', 'test-token');
    navigateMock.mockClear();
    hrStoreMocks.fetchQuarterlySummary.mockResolvedValue(null);
    hrStoreMocks.getQuarterlySummary.mockReturnValue(null);
    apiMocks.getSubordinates.mockResolvedValue({
      success: true,
      data: [
        { id: 'e001', name: '员工一' },
        { id: 'e002', name: '员工二' },
        { id: 'e003', name: '员工三' },
      ],
    });
    apiMocks.generateQuarterlySummary.mockResolvedValue({
      success: true,
      data: { versions: ['本季度团队完成多个重点项目，整体表现稳定。'] },
    });
  });

  it('AI生成季度总结时走统一 API 服务并使用真实下属人数', async () => {
    render(<QuarterlySummary />);

    fireEvent.click(screen.getByRole('button', { name: /AI 帮我写/ }));

    await waitFor(() => {
      expect(apiMocks.getSubordinates).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(apiMocks.generateQuarterlySummary).toHaveBeenCalledWith(expect.objectContaining({
        teamSize: 3,
        topPerformers: [],
        keyProjects: [],
      }));
    });

    expect(global.fetch).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByDisplayValue('本季度团队完成多个重点项目，整体表现稳定。')).toBeInTheDocument();
    });
  });
});
