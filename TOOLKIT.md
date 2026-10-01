# Toolkit Relationship

This repository is **starter-web**, the general websites and web applications starter in `mrst10578/pro-web-toolkit`.

## Source of truth

The central toolkit owns:

- starter identity and maturity in `starters/catalog.yml`
- Feature Pack definitions in `feature-packs/`
- Feature Pack registry in `feature-packs/catalog.yml`
- declared starter × pack compatibility in `docs/feature-pack-compatibility.md`
- cross-cutting architecture and maintenance policy

This starter owns its runnable application baseline, tests, CI, and starter-specific engineering rules.

## Composition rule

Do **not** copy every optional provider into this repository. Add only the Feature Packs required by the current project brief.

Feature Pack integration is a project-time composition step. The starter must continue to boot and verify without unrelated providers.

## Coupling rule

There is intentionally no Git submodule, package dependency, runtime dependency, or cross-repository write dependency on `pro-web-toolkit`.

The connection is contractual and registry-based:

`pro-web-toolkit → starter catalog → this repository`

and

`this repository → starter.yml / TOOLKIT.md → pro-web-toolkit`

This keeps generated client repositories independent after creation.

## Version and maturity

- Starter: `starter-web`
- Version: `0.1.0`
- Status: `experimental`
- Toolkit: `mrst10578/pro-web-toolkit`

Promotion to `ready` requires repeated successful use or equivalent strong evidence under the toolkit maintenance policy.

## Template reminder

This repository is intended to become a GitHub Template Repository. The repository setting is deliberately tracked separately from application code.
