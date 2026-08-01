# Pinguin

Pinguin is a beta desktop GUI for the
[Pi coding agent](https://github.com/earendil-works/pi). It uses a lightweight
Neutralinojs desktop shell, a React webview, and the Pi SDK.

## Beta Status

Pinguin is an early beta. The chat view — streaming transcript, model
selection, slash commands, thinking blocks, tool call rendering, and
project-local GUI extensions — is the primary interface. Some Pi terminal
features are still missing. See [`docs/TODO.md`](docs/TODO.md) for the
current gap list.

The supported beta distribution is a source install. Standalone application
downloads are planned after the backend packaging is complete.

## Prerequisites

- Node.js 22.19 or newer
- npm
- Credentials supported by Pi, configured through Pi's normal `~/.pi/agent`
  configuration

## First-Time Setup

On first launch, Pinguin detects that no model is configured and shows a
**provider setup** screen. Select a provider (Anthropic, OpenAI, GitHub
Copilot, etc.) and choose an authentication method:

- **API Key** — paste an API key from your provider dashboard.
- **Sign In** — authenticate via your browser (OAuth flow for providers like
  GitHub Copilot, OpenAI Codex, etc.).

Credentials are saved to Pi's normal `~/.pi/agent/auth.json` and persist across
restarts. Use `/login` to add or switch providers at any time, and `/model`
to select a model after setup.

## Install

```bash
git clone https://github.com/waltartist/Pinguin.git
cd Pinguin
npm install
npm run build:webview
npm start
```

`npm run build:webview` compiles the React frontend into `resources/`.
`npm start` launches the Neutralino desktop window.

## Development

```bash
npm install
npm run dev:all
```

Development mode starts a Vite dev server with hot-module replacement and
launches the Neutralino shell pointing at it. It selects an available local
Vite port automatically.

Useful checks:

```bash
npm run typecheck
npm run build:webview
npm run check
```

`npm run build` builds the webview and platform-specific Neutralino archives.
Portable application packaging is intentionally deferred until the Node backend
can be bundled into the release archives.

## Pi Dependency

Pinguin installs `@earendil-works/pi-coding-agent` locally as a normal npm
dependency. Users do not need a separate global Pi installation. Pi sessions,
settings, and provider credentials remain in Pi's normal user configuration
directory (`~/.pi/agent`).

The project-root `SYSTEM.md` is loaded automatically as the Pi system prompt
when Pinguin creates a session, so the bundled Pi instance follows Pinguin's
UI conventions and extension API.

## GUI Extensions

Add trusted `.ts` or `.tsx` extensions to `gui-extensions/`. Pinguin compiles
and reloads them while the application is running. Extensions can add dock
panels that appear alongside the chat view. See
[`docs/extension-api.md`](docs/extension-api.md).

GUI extensions execute as trusted local frontend code. Review extension source
before adding it.

## Known Limitations

- Standalone downloadable application archives are not ready yet.
- GUI extensions are currently loaded only from this repository's
  `gui-extensions/` directory.
- Some Pi terminal features do not yet have GUI equivalents.

## License

MIT. See [`LICENSE`](LICENSE).