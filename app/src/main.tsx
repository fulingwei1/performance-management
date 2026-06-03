import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './ErrorBoundary'

const CHUNK_RELOAD_KEYS = [
  'pm:auto-reloaded-after-chunk-error',
  'pm:chunk-reload-key',
]

window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault()
  const buildMarker = Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))
    .map((script) => script.src)
    .find((src) => src.includes('/assets/index-')) || 'unknown-build'
  const reloadKey = `vite-preload:${buildMarker}`

  if (sessionStorage.getItem('pm:chunk-reload-key') !== reloadKey) {
    sessionStorage.setItem('pm:chunk-reload-key', reloadKey)
    window.location.reload()
  }
})

window.addEventListener('load', () => {
  window.setTimeout(() => {
    CHUNK_RELOAD_KEYS.forEach((key) => sessionStorage.removeItem(key))
  }, 3000)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
