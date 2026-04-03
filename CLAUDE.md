# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (Vite + React)
```bash
npm run dev        # Start dev server at https://localhost:5173
npm run build      # Production build → dist/
npm run preview    # Preview production build
```

### API (Azure Functions v4)
```bash
cd api && npm start    # Start Functions runtime at http://localhost:7071
```

### Running locally (both together)
Start **two terminals** — Functions first, then Vite. The Vite proxy forwards `/api/*` to `http://localhost:7071`.

## Architecture

### Frontend
Single-file React app at `src/app.js` — no CSS framework, all inline styles. Vite is configured to treat `.js` files as JSX (`esbuild.loader: 'jsx'`). Entry point is `src/main.jsx`.

**Routing** is state-driven inside `App()` — no React Router. The `view` state switches between: `home`, `journey`, `catalog`, `detail`, `dashboard`, `client`.

**Theme** — `TH` object at the top of `app.js` holds full light/dark palettes. All components receive `t` (current theme object) and `dk` (dark mode boolean) as props.

**Use case data** — loaded from `src/data/ucs_data.json` as `INIT_UCS`. On login, `public/data.json` is fetched and merged (remote entries take priority; local-only entries are appended).

**Authentication** — password gate before rendering the app. Admin PIN grants write access (CRUD on use cases, file uploads).

**File uploads** — `handleFile` in `App()` calls `/api/GetSasToken` for Azure Blob SAS URLs, with a fallback to `URL.createObjectURL()` if the API is unavailable (local dev without Functions running).

**Persistence** — admin saves/deletes trigger `pushDataJson()` which fires a GitHub Actions repository dispatch (`event_type: sync-data`) to update `public/data.json` in the repo.

### API (`api/src/functions/`)
Azure Functions v4 (Node.js). Three functions:
- `GetSasToken.js` — generates short-lived SAS URLs for Azure Blob Storage uploads (upload SAS: 15 min, read SAS: 24 hr). Requires `STORAGE_ACCOUNT`, `STORAGE_KEY`, `STORAGE_CONTAINER` env vars.
- `GetUseCases.js` — stub (not yet implemented)
- `SaveUseCases.js` — stub (not yet implemented)

There is also a legacy v1-style function at `api/GetSasToken/index.js` — this is superseded by the v4 version above.

Local environment variables for the API go in `api/local.settings.json` (gitignored).

### Deployment
Deployed to **Azure Static Web Apps** (auto-deploys on push to `main` via `.github/workflows/azure-static-web-apps-*.yml`). The `api/` folder is the Functions backend. `swa-cli.config.json` configures the local SWA emulator.

Production env vars (`STORAGE_ACCOUNT`, `STORAGE_KEY`, `STORAGE_CONTAINER`) must be set in Azure Portal → Static Web App → Configuration.

### Key files
- `src/app.js` — entire frontend (700 lines)
- `src/data/ucs_data.json` — 26 AI use case records
- `public/data.json` — runtime data (fetched on login, updated via GitHub dispatch)
- `vite.config.js` — JSX-in-.js support + proxy `/api` → port 7071
- `api/local.settings.json` — local secrets (gitignored)
