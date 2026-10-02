# Flow asset activation QA

Scope: activate the six generated assets on the existing functional Flow shell and publish that shell as the Cloudflare homepage. The original embedded guides and search engine remain intact.

Source visual truth: `docs/flow/references/selected.webp` (1536 × 1093).
Browser evidence: `docs/flow/references/active-desktop.webp` (1348 × 2299 full page), `active-mobile.webp` (390 × 844), `active-comparison.webp`, and `active-header-comparison.webp`.

Desktop viewport: 1363 × 936 CSS pixels, density 1. The browser full-page capture is 1348 pixels wide after its scrollbar normalization. The source is scaled uniformly to that width for comparison. Both show the initial empty-search state. The comparison uses the top source-height + 190 pixels of the implementation to include the requested extra province form. Intentional differences: English-only Flow branding, independent province search, retained music/channel controls, complete guide hub, and separate generated artwork instead of the baked-in mockup.

Mobile viewport: a real 390 × 844 iframe; content width is 375 pixels after the scrollbar. No source mobile mock exists, so this is a responsive usability check. Source and implementation were opened; full composition and focused header/title comparison were inspected together.

## Findings and revisions

- Fixed P1: provisional artwork replaced by generated dark desktop/mobile hero and transparent English wordmark. All displayed images decoded; no source placeholder remains active.
- Fixed P2: guide/compass placement now matches the reference: guide on right, compass on left, illustrations beside their copy.
- Fixed P2: transparent divider padding made the ornament too small. Scaled and positioned its native canvas and removed the solid background that obscured the hero. The final comparison shows the central gold leaf at the boundary.
- Fixed P2: supporting guide surfaces retained the warm palette. Applied Flow surfaces, borders and cyan accents; updated the homepage footer brand/channel.
- Fixed capture mismatch: earlier evidence retained scroll/focus state and a fixed-header overlay. Reopened a clean initial state and recaptured after the fixes.

## Required fidelity surfaces

- Fonts: embedded Vazirmatn retained, readable Persian shaping, two-line heading, green/cyan emphasis. Mobile copy and controls remain legible.
- Spacing: right copy, left hero, stacked searches, two support entries, English top-right logo. Province form intentionally lengthens the mockup. Mobile uses image above copy and one support column.
- Colors: midnight navy, cream text, cyan controls, emerald emphasis, gold divider. Visible focus outline retained.
- Images: native dimensions and aspect ratios retained. Responsive picture selects mobile hero. Wordmark, compass, book and divider retain verified alpha. Bird composition uses the approved generated asset rather than claiming pixel-identical reproduction.
- Copy: original search/guide content and provenance retained; requested search labels and English header present. Article content is not rewritten during activation.

## Browser behavior verified

- Major query مهندسی کامپیوتر returns the matching result.
- Province query گیلان returns Gilan without changing the major query; opening it shows the complete existing reader/images and hides homepage art/support entries.
- Returning from reader restores homepage controls.
- Desktop form order and input widths measured. Mobile input widths 201 and 291 pixels, without horizontal document overflow.
- Desktop wordmark, hero, divider, book and compass loaded; mobile hero loaded from responsive source.
- Console checked: unrelated cloud-extension metadata errors only; no app-origin errors observed in the checked flow.

## Build and publication checks

Lint, typecheck, unit tests, production build and Cloudflare deploy dry run passed locally. Original public/index.html SHA-256 remains ebb69da2b9154a4ad1ca578bf6bb9409aba4846715260cd7d706964b35dfdee2. Cloudflare publishes generated Flow HTML at /; Next development opens the same generated content through /flow-preview.html. CI also covers browser asset loading, independent queries, responsive source selection, Workers asset integrity, canonical redirect and missing-page 404s.

P3 follow-up: ornamental polish or reader-specific art can be iterated separately. Actual Cloudflare publication is verified separately from repository activation.

final result: passed
