'use client'

import { Component, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'

type Props = { children: ReactNode }
type State = { hasError: boolean; error?: Error }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: any) {
    // Log to console — in production, send to Sentry/LogRocket
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
          <div className="max-w-md text-center">
            <AlertCircle className="h-12 w-12 text-red-800 mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2" style={{ color: '#B22222', fontFamily: 'Georgia, serif' }}>
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground mb-4">
              {this.state.error?.message || 'An unexpected error occurred. Please try refreshing the page.'}
            </p>
            <Button
              onClick={() => {
                this.setState({ hasError: false })
                window.location.reload()
              }}
            >
              Refresh Page
            </Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
