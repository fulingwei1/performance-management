import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);

    const message = `${error?.message || ''}\n${error?.stack || ''}`;
    const isDynamicImportCacheError = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(message);

    if (isDynamicImportCacheError) {
      const buildMarker = Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))
        .map((script) => script.src)
        .find((src) => src.includes('/assets/index-')) || 'unknown-build';
      const reloadKey = `error-boundary:${buildMarker}`;

      if (sessionStorage.getItem('pm:auto-reloaded-after-chunk-error') !== reloadKey) {
        sessionStorage.setItem('pm:auto-reloaded-after-chunk-error', reloadKey);
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
          <h1>应用加载失败</h1>
          <h2 style={{ color: 'red' }}>错误信息:</h2>
          <pre style={{ background: '#f0f0f0', padding: '10px', overflow: 'auto' }}>
            {this.state.error?.toString()}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button onClick={() => window.location.reload()}>
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
