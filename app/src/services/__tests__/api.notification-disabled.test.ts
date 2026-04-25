import { describe, it, expect, beforeEach, vi } from 'vitest';
import { notificationApi } from '../api';

const jsonResponse = (status: number, body: Record<string, unknown>) => ({
  ok: status >= 200 && status < 300,
  status,
  headers: { get: () => 'application/json' },
  json: async () => body,
  text: async () => JSON.stringify(body),
});

describe('notificationApi disabled feature fallback', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    const storage = new Map<string, string>([['token', 'test-token']]);
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => storage.set(key, value)),
      removeItem: vi.fn((key: string) => storage.delete(key)),
      clear: vi.fn(() => storage.clear()),
    });
  });

  it('消息中心停用返回 410 时不向调用方抛错，改为空消息降级', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(410, { success: false, message: '消息中心模块已停用' })
    );
    vi.stubGlobal('fetch', fetchMock);
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(notificationApi.getUnreadCount()).resolves.toEqual({
      success: true,
      data: { count: 0 },
      disabled: true,
      message: '消息中心模块已停用',
    });
    await expect(notificationApi.getMyNotifications()).resolves.toEqual({
      success: true,
      data: [],
      disabled: true,
      message: '消息中心模块已停用',
    });
    await expect(notificationApi.markAsRead('n-001')).resolves.toMatchObject({
      success: true,
      disabled: true,
    });
    await expect(notificationApi.markAllAsRead()).resolves.toMatchObject({
      success: true,
      disabled: true,
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/notifications/unread-count'), expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/notifications'), expect.any(Object));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/notifications/n-001/read'), expect.objectContaining({ method: 'PUT' }));
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining('/notifications/read-all'), expect.objectContaining({ method: 'PUT' }));
  });
});
