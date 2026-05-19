import React from "react";

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[pi-gui] Render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="loading-screen">
        <p>Something broke in the UI.</p>
        <p className="loading-error">{this.state.error.message}</p>
        <button
          className="btn btn-send"
          style={{ marginTop: 16 }}
          onClick={() => this.setState({ error: null })}
        >
          Reset
        </button>
      </div>
    );
  }
}
