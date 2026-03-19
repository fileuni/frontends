# frontends/ui - Unified UI (WebUI + Tauri Launcher)

Bun + Astro 5 + React 19 + Tailwind CSS 4 + shadcn/ui.

## Special Characteristics

- Single static dist used by both:
  - Server WebUI served at `/ui` (embedded via `rust_embed::RustEmbed`)
  - Tauri GUI launcher (WebView loads the same dist)
- Entry routing is decided at runtime (Web vs Tauri) in `src/RootApp.tsx`
- API types are generated from backend OpenAPI

## Key Paths

| Path | Description |
|------|-------------|
| `src/RootApp.tsx` | Single entry that switches between WebUI and Tauri launcher |
| `src/launcher/Launcher.tsx` | Tauri launcher UI (IPC via `@tauri-apps/api`) |
| `src/lib/api.ts` | Type-safe API client via `openapi-fetch` (Web runtime) |
| `openapi.json` | Backend OpenAPI snapshot for type generation |
| `openapi-config-set.json` | Setup-wizard (config-set) OpenAPI snapshot |

## Technical Constraints

- Rendering: SSG only; SSR not supported
- Types: Run `bun run gen-api` after backend API changes; manual type definitions forbidden
- i18n: Missing keys fallback to English, then display `[key_name]`
- Tauri Isolation: Keep Tauri-only imports under `src/launcher/` to avoid shipping native APIs to browsers
