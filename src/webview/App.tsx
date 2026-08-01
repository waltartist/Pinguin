import { usePi } from "./lib/use-pi";
import { Shell } from "./components/dock/Shell";
import { LoginPanel } from "./components/LoginPanel";
import { SessionPanel } from "./components/SessionPanel";
import "./components/ExtensionHost";

export function App() {
  const isReady = usePi((s) => s.isReady);
  const connectionError = usePi((s) => s.connectionError);
  const retryConnect = usePi((s) => s.retryConnect);
  const model = usePi((s) => s.model);
  const login = usePi((s) => s.login);
  const sessionView = usePi((s) => s.sessionView);
  const _loginStart = usePi((s) => s._loginStart);

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

  return (
    <>
      <Shell />
      {login.active && <LoginPanel />}
      {sessionView.kind !== "closed" && <SessionPanel />}
      {!model && !login.active && sessionView.kind === "closed" && (
        <div className="no-model-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="no-model-panel">
            <h2>No model configured</h2>
            <p>Set up a provider to start chatting with Pi.</p>
            <button className="btn btn-send" onClick={() => _loginStart()}>
              Set up a provider
            </button>
          </div>
        </div>
      )}
    </>
  );
}