# frontends

Single Bun + Astro + React frontend project for FileUni.

This project builds a single static dist that is used by:

- WebUI served by the backend at `/ui`
- Tauri GUI (WebView loads the same dist)

## Structure

| Path | Description |
|------|-------------|
| `src/` | Application source (WebUI + Tauri launcher + shared UI) |
| `src/apps/` | App variants (e.g. `webui/`, `launcher/`) |
| `src/features/` | Feature modules (domain-specific UI + logic) |
| `src/components/` | Reusable UI components (shared) |
| `src/lib/` | Shared utilities and service wrappers |
| `src/stores/` | Global Zustand stores |
| `src/i18n/` | i18n resources (`en/`, `zh/`) |
| `public/` | Static assets copied into dist |
| `openapi.json` | Backend OpenAPI snapshot for type generation |
| `openapi-config-set.json` | Setup-wizard OpenAPI snapshot for type generation |

## Commands

```bash
bun install
bun run dev
bun run dev:tauri
bun run check
bun run build
bun run gen-api
```

## Constraints

- Runtime: Bun only; Node.js not supported
- Rendering: SSG only; SSR not supported
- Types: `any` is forbidden; use `bun run gen-api` to generate types from OpenAPI
- Tauri isolation: keep Tauri-only imports under `src/apps/launcher/` (or future app-specific folders) and load them via dynamic import
