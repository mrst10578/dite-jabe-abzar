# Flow capacity explorer implementation

Spec: `docs/superpowers/specs/2026-10-04-capacity-explorer-design.md`.
Implement inline on `feat/capacity-explorer`, preserving canonical homepage HTML.

## Task 1: Snapshot pipeline and capacity model

- Add failing Vitest tests in `scripts/capacity-snapshot.test.mjs` for RFC4180
  CSV parsing, exact row preservation, amendment-only group classification,
  shared majors across groups, and rejection of inconsistent source totals.
- Add `scripts/capacity-snapshot.mjs`: `parseCsv(text)` and
  `buildSnapshot(sourceRoot, outputRoot, source)`; source has repository, commit,
  and commitDate. Run standalone as `npm run data:capacity` using
  `CAPACITY_SOURCE_ROOT` to choose a pinned local checkout.
- Add `public/capacity/model.js`: Persian normalization/sort, filtered totals
  preserving absent values, and group detection from booklet provenance.
- Generate deterministic catalog/major shards and preserve final source CSVs.
  Record SHA-256 and byte count for every file in `manifest.json`.
- Verification: `npm run test` passes; every source row and seat survives.

## Task 2: Independent native page

- Add failing browser tests in `tests/e2e/capacity.spec.ts` for the group gate,
  alphabetic majors, dependent university choices, multiple universities,
  descending years, missing data, source breakdown, retry, and group reset.
- Add `public/capacity/index.html`, `capacity.css`, and `app.js` using the shared
  model, Flow tokens/artwork, safe text rendering, and accessible controls.
- Generate the existing embedded font in `scripts/build-capacity.mjs` and
  validate manifest hashes/counts during the build. No implicit data refresh.
- Replace the capacity placeholder in `scripts/flow-home.mjs` with a link to
  `/capacity/`. Include capacity build/verification in `build-static.mjs`.
- Verification: browser tests prove values match the snapshot and that old
  network responses cannot replace the current major/group's results.

## Task 3: Final snapshot, verification and publication

- Run `npm run data:capacity` after implementing the page. Record commit
  `e48c51abb5511b9d36a5594f96dfff3817f4192a` and 33,326 source rows.
- Document update steps and snapshot provenance in README and a capacity report.
- Run lint, typecheck, unit tests, production build, E2E, Workers dry-run/routing.
- Obtain a fresh whole-change review, fix significant findings with regression
  tests, then push/merge the reviewed change through GitHub.
- Verify the deployed `/capacity/`, snapshot manifest, shards and homepage link.

## Review focus

Group inference for correction-only records; duplicate counts from aggregate
files; chemistry appearing in two groups; missing capacity vs zero; stale fetches
after group/major changes; source snapshot changes during sync; route behavior on
Workers vs Next development; snapshot hash drift during ordinary builds.
