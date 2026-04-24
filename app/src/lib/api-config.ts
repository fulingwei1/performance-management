const isProd = import.meta.env.PROD;

const normalizeApiBaseUrl = (value?: string) => {
  const trimmed = (value || '').trim().replace(/\/+$/, '');

  if (isProd && trimmed && trimmed.includes('localhost')) {
    console.warn('Production build detected localhost API URL, falling back to /api proxy');
    return '/api';
  }

  if (!trimmed) {
    return isProd ? '/api' : 'http://localhost:3001/api';
  }

  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

export const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

export const buildApiUrl = (path: string) => {
  const normalizedPath = path.replace(/^\/api/, '');
  const safePath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  return `${API_BASE_URL}${safePath}`;
};
