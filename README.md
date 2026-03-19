# frontends

Bun + Astro 5 + React 19 + Tailwind CSS 4 + shadcn/ui frontend modules.

## Structure

| Module | Description |
|--------|-------------|
| `ui/` | Unified WebUI + Tauri launcher, single static dist, served via `/ui` and loaded in Tauri WebView |
| `shared/` | Common components, stores, utilities for both WebUI and launcher |

## Key Files

| File | Description |
|------|-------------|
| `ui/openapi.json` | Project API definition (OpenAPI spec). Critical for frontend integration. Run `bun run gen-api` to generate TypeScript types from this file. |

## Key Constraints

- Runtime: Bun only; Node.js not supported
- Rendering: SSG only; SSR not supported
- Types: `any` strictly forbidden; use `bun run gen-api` to generate types from OpenAPI
- i18n: Missing keys fallback to English, then display `[key_name]`
