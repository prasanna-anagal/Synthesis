import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('Unhandled UI error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', padding: '24px',
          background: '#fafafa', color: '#111827', textAlign: 'center',
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, background: '#fef2f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16, border: '1px solid #fecaca',
          }}>
            <AlertTriangle size={28} color="#dc2626" />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 8 }}>
            Something went wrong
          </h2>
          <p style={{ color: '#6b7280', fontSize: '0.875rem', maxWidth: 400, marginBottom: 24, lineHeight: 1.5 }}>
            {this.state.error?.message || 'An unexpected application error occurred.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '10px 20px', borderRadius: 8, background: '#6366f1',
              color: '#fff', border: 'none', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <RefreshCw size={14} /> Reload Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
