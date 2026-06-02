import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface ViewErrorBoundaryProps {
  viewId?: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ViewErrorBoundary extends Component<ViewErrorBoundaryProps, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[Molecule] View render error', this.props.viewId, error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted-foreground"
          data-testid={this.props.viewId ? `view-error-${this.props.viewId}` : 'view-error'}
        >
          <p className="font-medium text-destructive">View failed to load</p>
          <p className="max-w-xs text-xs">{this.state.error.message}</p>
          <button
            type="button"
            className="rounded border border-border px-2 py-1 text-xs hover:bg-foreground/5"
            onClick={() => this.setState({ error: null })}
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
