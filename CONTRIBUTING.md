# Contributing Guide

## Where to Submit

| Type | Location |
|------|----------|
| Bug Reports | [Main Repo Issues](https://github.com/fileuni/fileuni/issues/new/choose) |
| Feature Requests / Improvements | [Main Repo Discussions (Ideas)](https://github.com/fileuni/fileuni/discussions/new?category=ideas) |
| Documentation Gaps | [Main Repo Discussions (Documentation)](https://github.com/fileuni/fileuni/discussions/new?category=documentation) |
| Code | Pull Request |

> **Do not open feature or improvement issues in this repository.** Proposals must start in main-repo Discussions and are scheduled only after maintainers verify necessity, feasibility, and no security/performance regressions.

---

## PR Requirements

### Description Must Include
1. **Motivation** - Why is this change needed?
2. **Key Changes** - Main improvements and technical implementation
3. **Compliance** - How does it follow project conventions?

### Mandatory Checks
- [ ] `bun run check` - **Zero errors, zero warnings**
- [ ] `bun run format` - Formatted
- [ ] **Zero `any` types** - Use auto-generated types

---

## Code Standards

| Rule | Requirement |
|------|-------------|
| Types | **Zero `any`** - Run `bun run gen-api` after backend changes |
| API Client | Use `openapi-fetch` from `src/lib/api.ts` |
| i18n | All `t('key')` must exist in ALL language files (zh/en) |
| UI | Modals must close on `Esc` key |

### Type-Safe API Example

```typescript
import { client } from '@/lib/api';

const { data } = await client.GET('/api/files/{id}', {
  params: { path: { id: '123' } }
});
```

---

Thank you for contributing!
