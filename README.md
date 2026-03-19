# frontends

Single Bun + Astro + React frontend project for FileUni.

This project builds a single static dist that is used by:

- WebUI served by the backend at `/ui`
- Tauri GUI (WebView loads the same dist)

## Structure

| Path | Description |
|------|-------------|
| `src/` | Application source (WebUI + Tauri launcher + shared UI) |
| `src/shared/` | Shared components/stores/utils (do not import Tauri APIs here) |
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
- Tauri isolation: keep Tauri-only imports under `src/launcher/` (or future app-specific folders) and load them via dynamic import
