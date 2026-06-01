# Pinguin

Pinguin is a beta desktop GUI for the
[Pi coding agent](https://github.com/earendil-works/pi). It uses a lightweight
Neutralinojs desktop shell, a React webview, and the Pi SDK.

## Beta Status

Pinguin is an early beta. Core chat, model selection, slash commands, statistics,
markdown viewing, dock layout persistence, and project-local GUI extensions are
available. Some Pi terminal features are still missing. See
[`docs/TODO.md`](docs/TODO.md) for the current gap list.

The supported beta distribution is a source install. Standalone application
downloads are planned after the backend packaging is complete.

## Prerequisites

- Node.js 20.19 or newer
- npm
- Credentials supported by Pi, configured through Pi's normal `~/.pi/agent`
  configuration

## Install

```bash
git clone https://github.com/waltartist/Pinguin.git
cd Pinguin
npm install
npm start
```

The source-install beta starts a local Vite server on an available port.

## Development

```bash
npm install
npm run dev:all
```

Development mode also selects an available local Vite port automatically.

Useful checks:

```bash
npm run typecheck
npm run build:webview
npm run check
```

`npm run build` builds the webview used by the source-install beta. Portable
application packaging is intentionally deferred until the Node backend can be
bundled into the release archives.

## Pi Dependency

Pinguin installs `@earendil-works/pi-coding-agent` locally as a normal npm
dependency. Users do not need a separate global Pi installation. Pi sessions,
settings, and provider credentials remain in Pi's normal user configuration
directory.

## GUI Extensions

Add trusted `.ts` or `.tsx` extensions to `gui-extensions/`. Pinguin compiles
and reloads them while the application is running. See
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
