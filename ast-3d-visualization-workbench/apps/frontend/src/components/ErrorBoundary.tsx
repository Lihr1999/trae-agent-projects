import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[Viewport3D ErrorBoundary]', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1a1a2e',
            color: '#e0e0e0',
            fontFamily: 'monospace',
            padding: '2rem',
            gap: '1rem',
          }}
        >
          <h2 style={{ margin: 0, color: '#f44336' }}>3D Viewport Error</h2>
          <p style={{ margin: 0, maxWidth: '500px', textAlign: 'center', opacity: 0.8 }}>
            The 3D visualization encountered an error and could not render.
          </p>
          <pre
            style={{
              backgroundColor: '#0d0d1a',
              padding: '1rem',
              borderRadius: '4px',
              maxWidth: '600px',
              overflow: 'auto',
              fontSize: '0.8rem',
              color: '#ff8a80',
              border: '1px solid #333',
            }}
          >
            {this.state.error?.message ?? 'Unknown error'}
          </pre>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: '0.5rem',
              padding: '0.5rem 1.5rem',
              backgroundColor: '#42a5f5',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.9rem',
            }}
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
