'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center">
          <AlertTriangle className="w-10 h-10 text-red-400 mb-3" />
          <h3 className="text-sm font-semibold text-gray-800 mb-1">Une erreur est survenue</h3>
          <p className="text-xs text-gray-500 mb-4 max-w-sm">
            {this.state.error?.message ?? 'Erreur inattendue. Veuillez réessayer.'}
          </p>
          <button
            onClick={this.reset}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition"
          >
            <RefreshCw size={12} />
            Réessayer
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
