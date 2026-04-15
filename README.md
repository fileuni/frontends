# frontends

Single Bun + Astro + React frontend project for FileUni.

This project builds a single static dist that is used by:

- WebUI served by the backend at `/`
- Tauri GUI (WebView loads the same dist)

## Structure

| Path | Description |
|------|-------------|
| `src/` | Application source (WebUI + Tauri launcher + shared UI) |
| `src/apps/` | App variants (e.g. `webui/`, `launcher/`) |
| `src/components/` | Domain modules (business-feature first; includes shared UI under `components/ui/`, `components/common/`) |
| `src/lib/` | Shared utilities and service wrappers |
| `src/stores/` | Global Zustand stores |
| `src/i18n/` | i18n resources (`en/`, `zh/`) |
| `public/` | Static assets copied into dist |
| `openapi.json` | Local backend OpenAPI snapshot for type generation (ignored by git) |
| `openapi-config-set.json` | Local settings-center OpenAPI snapshot for type generation (ignored by git) |

## Commands

```bash
bun install
bun run dev
bun run dev:tauri
bun run lint
bun run typecheck
bun run check
bun run build
bun run verify
bun run test:tauri-mock
bun run gen-api
```

## Quality Gates

- `bun run lint`
  - Runs ESLint on `src/**/*.{ts,tsx,astro}`
  - Enforces React hooks, key a11y rules, button typing, stable list keys, and selected safety rules
- `bun run typecheck`
  - Runs `tsc --noEmit` with strict frontend settings
- `bun run check`
  - Runs `astro check`
- `bun run build`
  - Builds the production static bundle
- `bun run verify`
  - Runs `lint`, `typecheck`, `check`, and `build` in sequence
- `bun run test:tauri-mock`
  - Runs Vitest-based Tauri mock tests for launcher bridge and key desktop-only UI flows

## Recommended Workflow

Use this order during frontend work:

```bash
bun run lint:fix
bun run typecheck
bun run check
bun run build
```

Before opening a PR or creating a commit for frontend changes, run:

```bash
bun run verify
```

## Constraints

- Runtime: Bun only; Node.js not supported
- Rendering: SSG only; SSR not supported
- Types: `any` is forbidden; use `bun run gen-api` to generate types from OpenAPI
- TypeScript: strict mode, exact optional property types, unchecked indexed access checks, and index-signature access checks are enabled
- Lint: hooks and a11y gates are required; `button` elements must declare `type`, and array index keys are forbidden
- Tauri isolation: keep Tauri-only imports under `src/apps/launcher/` (or future app-specific folders) and load them via dynamic import
