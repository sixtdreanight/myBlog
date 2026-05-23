# Changelog

## v0.1.2 (2026-05-24)

### Security Fixes
- **XSS**: `SearchButton.tsx` — replaced `dangerouslySetInnerHTML` with text rendering for Pagefind excerpts
- **Injection**: `WebAnalytics.tsx` — `JSON.stringify()` for template variables (measurementId, projectId)
- **Dependency**: pinned `@waline/client` version (removed `^`)

### New Features
- **CSP**: Content-Security-Policy header added to `Layout.astro`
- **Security headers**: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`
- **URL validation**: `sourceUrl` in content collection now validated (accepts URLs + placeholder text)
- **CSS injection**: `rehypeTableBlock.js` align value allowlist (`left`/`right`/`center`)
- **Embed validation**: `remarkEmbed.js` ID format validation for YouTube/Bilibili/CodePen
- **HTTPS**: Waline emoji URL changed to explicit `https://`, Bilibili embed to `https://`

## v0.1.1 (2026-05-23)
- Security audit fixes (see GitHub Release)

## v0.1.0 (2026-05-16)
- Initial release
