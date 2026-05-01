const isProd = import.meta.env.PROD;
const isTest = import.meta.env.MODE === 'test';

const getDefaultApiBaseUrl = () => {
  if (!isProd && !isTest) return 'http://localhost:3002/api';

  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  return `${basePath}/api`.replace(/^\/\//, '/');
};

const normalizeApiBaseUrl = (value?: string) => {
  const trimmed = (value || '').trim().replace(/\/+$/, '');

  if (isProd && trimmed && trimmed.includes('localhost')) {
    console.warn('Production build detected localhost API URL, falling back to same-origin API proxy');
    return getDefaultApiBaseUrl();
  }

  if (!trimmed) {
    return getDefaultApiBaseUrl();
  }

  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.replace(/^\/api/, '');
  const safePath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  return `${API_BASE_URL}${safePath}`;
};
