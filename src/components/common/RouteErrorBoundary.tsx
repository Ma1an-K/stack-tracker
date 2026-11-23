import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const RELOAD_FLAG = 'st:chunk-reload';

/** A lazy route chunk that no longer exists (an installed PWA left open across a deploy). */
function isChunkLoadError(error: unknown) {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading chunk .* failed/i.test(msg);
}

interface Props {
  children: ReactNode;
  /** Changing this (e.g. the pathname) clears a shown error. */
  resetKey?: string;
}

interface State {
  error: unknown;
}

/**
 * Wraps the lazily loaded signed-in screens. A failed chunk import reloads the
 * page once (guarded in sessionStorage so it can never loop); anything else, or
 * a second failure, shows a calm "Something went wrong" state with a Reload.
 */
export class RouteErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Screen failed to render:', error, info.componentStack);
    if (!isChunkLoadError(error)) return;
    try {
      if (!sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.setItem(RELOAD_FLAG, '1');
        window.location.reload();
      }
    } catch {
      /* storage blocked: fall through to the manual Reload state */
    }
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  private rearm?: number;

  componentDidMount() {
    // Once the app has run cleanly for a while, re-arm the one-time reload for
    // the next deploy. A failure right after the guarded reload never loops.
    this.rearm = window.setTimeout(() => {
      try {
        if (!this.state.error) sessionStorage.removeItem(RELOAD_FLAG);
      } catch {
        /* ignore */
      }
    }, 10000);
  }

  componentWillUnmount() {
    window.clearTimeout(this.rearm);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold/30 bg-gold/10">
          <AlertTriangle className="h-6 w-6 text-gold" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl text-foreground">Something went wrong</h1>
        <p className="mt-2 max-w-xs text-sm text-muted-foreground">
          This screen didn't load. It is usually a new version of the app arriving; reloading fixes it.
        </p>
        <Button className="mt-6" onClick={() => window.location.reload()}>
          <RotateCw aria-hidden="true" />
          Reload
        </Button>
      </div>
    );
  }
}
