# Flow foundation verification

Stage: preliminary shell and asset prompts, as requested. This is not the final visual implementation handoff.

Source visual truth: `docs/flow/references/selected.webp` (1536 × 1093) and `docs/flow/references/revised.webp` (1430 × 1100).

Browser-rendered evidence: `docs/flow/references/foundation-desktop.webp` and `docs/flow/references/foundation-mobile.webp`.

State: midnight theme, independent major and province forms, supplied source artwork. No final asset substitution or production activation yet.

Viewport: desktop 1363 × 936; mobile tested inside a real 390 × 844 iframe. Captures are evidence of the initial layout and interactions, not a matched-viewport final fidelity comparison. A normalized full-view and focused-region comparison is deferred until the six final assets exist.

## Verified preliminary behavior

- Major search for `مهندسی کامپیوتر` produced the matching major result.
- Province search for `گیلان` produced the correct province result and opened the existing complete Gilan guide with its embedded images.
- Province search did not overwrite the major input.
- Both original form elements, input IDs and search engines were reused.
- The English-only supplied logo is visible with alt text `Flow`; the Persian brand word was removed from the header lockup.
- Province form is below the major form: desktop y=653.97 vs major y=472.97, both 60px high.
- Desktop input widths: major 503.44px, province 581.23px. Mobile input widths: major 201px, province 291px; neither collapses to zero width.
- App-origin console errors were not observed in the checked search flow. Cloud browser extension metadata errors are unrelated to this application.

## Findings and iteration history

- [Fixed P0] The legacy ID selectors set input width to zero for the original flex layout. New grid layout exposed that assumption. Added scoped ID-level width overrides and verified the corrected widths in the browser.
- [Fixed P2] The old hero width was capped at 1040px and moved the artwork into the middle of the page. Added an explicit 100% width and scoped the homepage hero rules so embedded article heroes are not affected.
- [Fixed P1] New homepage styling could override the legacy reader-hide rule. Added explicit major/province reading-state rules for the homepage and new support area.
- [Pending P1, intentionally next stage] Artwork currently uses the original bright bird poster; the selected reference needs a dedicated dark desktop composition and a separate mobile composition.
- [Pending P1, intentionally next stage] The supplied full logo poster is a temporary source, not the final compact transparent English wordmark.
- [Pending P1, intentionally next stage] Compass, book and botanical divider assets are prompt-ready but not yet generated. The manifest remains `productionReady: false`.
- [Pending P2] The legacy internal readers, guide cards and footer still contain Aris presentation. Full visual unification belongs to the implementation pass after assets; the original content and provenance are preserved.

## Required fidelity surfaces

- Fonts: embedded Vazirmatn reused; final typography comparison pending.
- Layout: two independent forms and mobile widths checked; matched-viewport final comparison pending.
- Colors: Flow tokens defined; legacy content below the initial shell still needs theme unification.
- Images: supplied references loaded successfully; six final assets still pending.
- Copy: original selection content retained; Flow header and both search labels applied.

## Next gate

Generate assets using `docs/flow/ASSET_PROMPTS_FA.md`, inspect them, activate them in the manifest, unify remaining presentation, then run final browser interaction checks and normalized image comparison. Do not switch the production homepage based on this foundation QA record.

final result: blocked
