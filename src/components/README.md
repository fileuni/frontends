# Components Conventions

This directory is feature-first.

There are two categories of code under `src/components/`:

1) Shared UI building blocks (cross-feature)
- `src/components/ui/`: UI primitives used everywhere (Button, Input, Modal, Toast, etc.).
- `src/components/common/`: Small reusable components that are not domain-specific (form fields, password widgets, captcha widgets, etc.).
- `src/components/editors/`: Reusable editor wrappers (Monaco, etc.).
- `src/components/modals/`: Cross-feature modals (e.g. About).

2) Domain (feature) modules

Each domain module lives at `src/components/<domain>/` and may contain ONLY these subfolders:

- `components/`: Domain-specific React components.
- `hooks/`: Domain-specific hooks.
- `store/`: Domain-specific Zustand stores (scoped to the domain).
- `types/`: Domain-specific types.
- `api/`: Domain-specific API wrappers (thin layer on top of `src/lib/api.ts`).

Notes:

- If a component is reused by multiple domains, it MUST live in one of:
  `src/components/ui/`, `src/components/common/`, `src/components/editors/`, `src/components/modals/`.
- Global app-wide state MUST live in `src/stores/` (not inside a domain module).
- Shared utilities MUST live in `src/lib/`.
- Keep `apps/` isolated: app entry points live in `src/apps/` and should compose domains from here.

Naming:

- Domain folder names use kebab-case (e.g. `file-manager`, `system-config`).
- Component files use PascalCase (e.g. `FileManagerView.tsx`).

Imports:

- Prefer absolute imports via `@/`.
- Do not create a new generic `shared/` directory. Use the shared folders listed above.
