import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logError } from '@/lib/errorLog';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Render error:', error, info.componentStack);
    logError({ kind: 'crash', action: 'render', error });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="flex min-h-screen flex-col items-center justify-center bg-background p-6 text-center text-foreground">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
            <AlertTriangle className="h-6 w-6 text-gold" aria-hidden="true" />
          </div>
          <h1 className="font-display text-2xl text-foreground">Something went wrong</h1>
          <Button className="mt-6" onClick={() => window.location.reload()}>
            <RotateCw aria-hidden="true" />
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
