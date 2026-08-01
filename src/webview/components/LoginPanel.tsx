import { useState, useRef, useEffect, useCallback } from "react";
import { usePi } from "../lib/use-pi";
import { Icon } from "./ember";

// ── Login Panel ─────────────────────────────────────────────────────────────
//
// Renders the login flow as an overlay on top of the chat area.
// Steps: provider_select → auth_type_select → prompt/notify → done
//
// Driven by the login state in pi-store. Backend sends events:
//   pi:providers     — list of available providers
//   pi:login_prompt  — ask user for input (API key, manual code, selection)
//   pi:login_notify  — status update (auth URL, device code, progress)
//   pi:login_done    — login completed (ok or error)

export function LoginPanel() {
  const login = usePi((s) => s.login);
  const providers = usePi((s) => s.providers);
  const model = usePi((s) => s.model);
  const availableModels = usePi((s) => s.availableModels);
  const _loginStart = usePi((s) => s._loginStart);
  const _loginSelectProvider = usePi((s) => s._loginSelectProvider);
  const _loginSelectAuthType = usePi((s) => s._loginSelectAuthType);
  const _loginCancel = usePi((s) => s._loginCancel);
  const _loginReset = usePi((s) => s._loginReset);

  // Auto-trigger login when no model and no providers configured
  const autoTriggered = useRef(false);
  useEffect(() => {
    if (!model && availableModels.length === 0 && providers.length > 0 && !login.active && !autoTriggered.current) {
      autoTriggered.current = true;
      _loginStart();
    }
  }, [model, availableModels.length, providers.length, login.active, _loginStart]);

  if (!login.active && login.step !== "done") return null;

  return (
    <div className="login-overlay" onClick={(e) => e.stopPropagation()}>
      <div className="login-panel">
        {login.step === "provider_select" && (
          <ProviderSelect
            providers={providers}
            onSelect={(id) => _loginSelectProvider(id)}
            onCancel={_loginCancel}
          />
        )}
        {login.step === "auth_type_select" && (
          <AuthTypeSelect
            providerId={login.providerId}
            providerName={login.providerName}
            providers={providers}
            onSelect={(authType) => _loginSelectAuthType(authType)}
            onCancel={_loginCancel}
          />
        )}
        {login.step === "prompt" && login.prompt && (
          <PromptView
            prompt={login.prompt}
            onSubmit={(value) => usePi.getState()._loginRespond(value)}
            onCancel={_loginCancel}
          />
        )}
        {login.step === "notify" && (
          <NotifyView
            notify={login.notify}
            providerName={login.providerName}
            onCancel={_loginCancel}
          />
        )}
        {login.step === "done" && (
          <div className="login-done">
            <Icon.Check width={20} height={20} />
            <span>Login successful</span>
            <button className="btn btn-send" onClick={_loginReset} style={{ marginTop: 12 }}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Provider Selection ─────────────────────────────────────────────────────

function ProviderSelect({ providers, onSelect, onCancel }: {
  providers: ReturnType<typeof usePi.getState>["providers"];
  onSelect: (id: string) => void;
  onCancel: () => void;
}) {
  const [filter, setFilter] = useState("");
  const filtered = providers.filter((p) =>
    p.name.toLowerCase().includes(filter.toLowerCase()) ||
    p.id.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="login-step">
      <div className="login-header">
        <h2>Select a provider</h2>
        <button className="login-close" onClick={onCancel} aria-label="Cancel">✕</button>
      </div>
      <input
        className="login-filter"
        type="text"
        placeholder="Filter providers…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        autoFocus
      />
      <div className="login-list" role="listbox">
        {filtered.map((p) => (
          <button
            key={p.id}
            className="login-list-item"
            role="option"
            onClick={() => onSelect(p.id)}
          >
            <span className="login-list-name">{p.name}</span>
            {p.configured && (
              <span className="login-list-badge">
                <Icon.Check width={10} height={10} /> configured
              </span>
            )}
            <span className="login-list-methods">
              {p.authTypes.map((t) => t === "api_key" ? "API key" : "OAuth").join(" · ")}
            </span>
          </button>
        ))}
        {filtered.length === 0 && (
          <div className="login-empty">No providers found</div>
        )}
      </div>
    </div>
  );
}

// ── Auth Type Selection ─────────────────────────────────────────────────────

function AuthTypeSelect({ providerId, providerName, providers, onSelect, onCancel }: {
  providerId: string | null;
  providerName: string | null;
  providers: ReturnType<typeof usePi.getState>["providers"];
  onSelect: (authType: string) => void;
  onCancel: () => void;
}) {
  const provider = providers.find((p) => p.id === providerId);

  return (
    <div className="login-step">
      <div className="login-header">
        <h2>{providerName ?? providerId}</h2>
        <button className="login-close" onClick={onCancel} aria-label="Cancel">✕</button>
      </div>
      <p className="login-subtitle">Choose authentication method:</p>
      <div className="login-auth-types">
        {provider?.authTypes.includes("api_key") && (
          <button className="login-auth-btn" onClick={() => onSelect("api_key")}>
            <Icon.Key width={16} height={16} />
            <span>API Key</span>
            <span className="login-auth-desc">Enter an API key manually</span>
          </button>
        )}
        {provider?.authTypes.includes("oauth") && (
          <button className="login-auth-btn" onClick={() => onSelect("oauth")}>
            <Icon.Globe width={16} height={16} />
            <span>Sign In</span>
            <span className="login-auth-desc">Authenticate via browser</span>
          </button>
        )}
        {provider?.configured && (
          <button className="login-auth-btn login-auth-logout" onClick={() => {
            if (providerId) {
              Neutralino?.extensions.dispatch("pi-backend", "pi:input", {
                type: "logout",
                payload: { providerId },
              });
              onCancel();
            }
          }}>
            <Icon.X width={16} height={16} />
            <span>Log Out</span>
            <span className="login-auth-desc">Remove saved credentials</span>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Prompt View (API key entry, manual code, select) ───────────────────────

function PromptView({ prompt, onSubmit, onCancel }: {
  prompt: NonNullable<ReturnType<typeof usePi.getState>["login"]["prompt"]>;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = useCallback(() => {
    if (value.trim()) {
      onSubmit(value.trim());
    }
  }, [value, onSubmit]);

  if (prompt.prompt.type === "select") {
    return (
      <div className="login-step">
        <div className="login-header">
          <h2>{prompt.prompt.message}</h2>
        </div>
        <div className="login-list" role="listbox">
          {prompt.prompt.options?.map((opt) => (
            <button
              key={opt.value}
              className="login-list-item"
              role="option"
              onClick={() => onSubmit(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  const isSecret = prompt.prompt.type === "secret";
  const placeholder = prompt.prompt.placeholder || (isSecret ? "Enter API key" : "Enter code");

  return (
    <div className="login-step">
      <div className="login-header">
        <h2>{prompt.prompt.message}</h2>
      </div>
      <div className="login-input-row">
        <input
          ref={inputRef}
          className="login-input"
          type={isSecret ? "password" : "text"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && value.trim()) onSubmit(value.trim());
            if (e.key === "Escape") onCancel();
          }}
        />
        <button className="btn btn-send" onClick={handleSubmit} disabled={!value.trim()}>
          Submit
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

// ── Notify View (auth URL, device code, progress) ─────────────────────────

function NotifyView({ notify, providerName, onCancel }: {
  notify: ReturnType<typeof usePi.getState>["login"]["notify"];
  providerName: string | null;
  onCancel: () => void;
}) {
  if (!notify) {
    return (
      <div className="login-step">
        <div className="login-header">
          <h2>Connecting to {providerName}…</h2>
        </div>
        <div className="login-spinner" />
        <button className="btn btn-ghost" onClick={onCancel} style={{ marginTop: 16 }}>Cancel</button>
      </div>
    );
  }

  switch (notify.type) {
    case "auth_url":
      return (
        <div className="login-step">
          <div className="login-header">
            <h2>Authenticate with {providerName}</h2>
          </div>
          {notify.instructions && <p className="login-instructions">{notify.instructions}</p>}
          {notify.url && (
            <a className="login-auth-link" href={notify.url} target="_blank" rel="noopener noreferrer">
              <Icon.Globe width={14} height={14} />
              {notify.url}
            </a>
          )}
          {notify.links?.map((link) => (
            <a key={link.url} className="login-auth-link" href={link.url} target="_blank" rel="noopener noreferrer">
              {link.text}
            </a>
          ))}
          <div className="login-spinner" style={{ marginTop: 16 }} />
          <p className="login-progress">Waiting for authentication…</p>
          <button className="btn btn-ghost" onClick={onCancel} style={{ marginTop: 12 }}>Cancel</button>
        </div>
      );

    case "device_code":
      return (
        <div className="login-step">
          <div className="login-header">
            <h2>Device Code Authentication</h2>
          </div>
          {notify.verificationUrl && (
            <p className="login-instructions">
              Visit:{" "}
              <a href={notify.verificationUrl} target="_blank" rel="noopener noreferrer">
                {notify.verificationUrl}
              </a>
            </p>
          )}
          {notify.userCode && (
            <div className="login-device-code">
              <span className="login-device-label">Your code:</span>
              <code>{notify.userCode}</code>
            </div>
          )}
          <div className="login-spinner" style={{ marginTop: 16 }} />
          <p className="login-progress">Waiting for authentication…</p>
          <button className="btn btn-ghost" onClick={onCancel} style={{ marginTop: 12 }}>Cancel</button>
        </div>
      );

    case "info":
      return (
        <div className="login-step">
          <div className="login-header">
            <h2>{providerName}</h2>
          </div>
          <p className="login-instructions">{notify.message}</p>
          {notify.links?.map((link) => (
            <a key={link.url} className="login-auth-link" href={link.url} target="_blank" rel="noopener noreferrer">
              {link.text}
            </a>
          ))}
          <div className="login-spinner" style={{ marginTop: 16 }} />
          <button className="btn btn-ghost" onClick={onCancel} style={{ marginTop: 12 }}>Cancel</button>
        </div>
      );

    case "progress":
    default:
      return (
        <div className="login-step">
          <div className="login-header">
            <h2>{providerName}</h2>
          </div>
          <div className="login-spinner" />
          <p className="login-progress">{notify.message || "Working…"}</p>
          <button className="btn btn-ghost" onClick={onCancel} style={{ marginTop: 16 }}>Cancel</button>
        </div>
      );
  }
}