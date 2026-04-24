import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ErrorBoundary'

if ('serviceWorker' in navigator && import.meta.env.DEV) {
  window.addEventListener('load', async () => {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch (error) {
      console.warn('SW cleanup failed:', error);
    }

    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        const staleKeys = cacheKeys.filter((key) => key.startsWith('performance-management-'));
        await Promise.all(staleKeys.map((key) => caches.delete(key)));
      } catch (error) {
        console.warn('Cache cleanup failed:', error);
      }
    }
  });
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      (registration) => {
        console.log('SW registered:', registration.scope);
      },
      (error) => {
        console.log('SW registration failed:', error);
      }
    );
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
