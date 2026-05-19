import { usePi } from "./lib/use-pi";
import { Shell } from "./components/dock/Shell";
import "./components/ExtensionHost";

export function App() {
  const isReady = usePi((s) => s.isReady);
  const connectionError = usePi((s) => s.connectionError);
  const retryConnect = usePi((s) => s.retryConnect);

  if (!isReady) {
    return (
      <div className="loading-screen">
        {!connectionError && <div className="loading-spinner" />}
        <p>{connectionError ? "Connection Error" : "Starting Pi..."}</p>
        {connectionError && <p className="loading-error">{connectionError}</p>}
        {connectionError && (
          <button
            className="btn btn-send"
            style={{ marginTop: 16 }}
            onClick={retryConnect}
          >
            Retry
          </button>
        )}
      </div>
    );
  }

  return <Shell />;
}
