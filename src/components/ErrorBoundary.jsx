import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', padding: '40px',
          textAlign: 'center', fontFamily: 'Inter, sans-serif'
        }}>
          <h1 style={{ fontSize: '48px', marginBottom: '16px' }}>Oops</h1>
          <p style={{ color: '#666', fontSize: '16px', marginBottom: '24px' }}>
            Something went wrong. Please refresh the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px', background: '#000', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '14px',
              cursor: 'pointer', fontWeight: 600
            }}
          >
            REFRESH PAGE
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
