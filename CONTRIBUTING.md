# Contributing to myBlog

Thanks for your interest in contributing!

## Getting Started

```bash
git clone https://github.com/sixtdreanight/myBlog.git --recurse-submodules
cd myBlog
pnpm install
pnpm run dev
```

## Development Workflow

1. Fork the repo and create a branch from `main`
2. Make your changes
3. Run `npx tsc --noEmit` to type-check
4. Run `pnpm run build` to verify the build
5. Add tests for new functionality
6. Commit using [Conventional Commits][conv] format
7. Push and open a pull request

## Commit Convention

```
feat: add RSS full-text support
fix: sanitize Pagefind HTML output
refactor: extract cyberpunk theme tokens
test: add component rendering tests
docs: update deployment guide
```

Types: `feat` `fix` `refactor` `test` `docs` `chore` `perf` `ci`

## Code Style

- TypeScript strict mode enabled
- Astro component conventions
- Components in `src/components/`, organized by feature
- Functions under 50 lines; files under 800 lines
- Use CSS custom properties (`--color-*`) for theming
- Animate only compositor-friendly properties (transform, opacity)

## Submodules

This project uses git submodules for content pipelines:
- `ComiRadar/` — anime events data
- `weekly-cli/` — weekly hotspot analysis

Update submodules before contributing pipeline changes:
```bash
git submodule update --init --recursive
```

## Pull Request Checklist

- [ ] TypeScript compiles without errors
- [ ] Build succeeds (`pnpm run build`)
- [ ] New tests added for new behavior
- [ ] CSS uses design tokens, not hardcoded values
- [ ] No layout-shift regressions

## Questions?

Open a [discussion](https://github.com/sixtdreanight/myBlog/discussions).

[conv]: https://www.conventionalcommits.org/
