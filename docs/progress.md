# Progress Log

This file is the resume point for the project. It should answer two questions quickly:

1. what has been decided
2. what has been completed so far

## Current Status

- Active phase: `Phase 3`
- Current emphasis: systematic preflop coverage expansion on top of the completed pack pipeline
- Runtime backend in use: `JSON` only
- Production backend status: `SQLite deferred`

## Key Decisions

### 1. Runtime Architecture

- Keep the long-term hybrid architecture
- Runtime remains `Electron + React + TypeScript`
- Offline tooling remains separate from the runtime

### 2. Module Discipline

- Architectural boundaries stay documented
- Physical module separation should be pragmatic during Phase 1
- Do not refactor for package purity unless it materially helps the current work

### 3. Storage Strategy

- JSON is the only active pack backend in the current runtime
- SQLite is deferred until pack size or runtime performance justifies it
- Do not maintain dual runtime backends early

### 4. Validation Policy

- Validation is not deferred to Phase 2 anymore
- Basic pack validation is required in Phase 1
- Full solver-import / normalization / regeneration pipeline is now delivered through the completed Phase 2 tooling

### 5. Coverage Policy

- Depth in high-frequency preflop families is preferred over breadth in obscure families
- Priority order is:
  - RFI
  - single-open responses
  - open plus call
  - 3-bet / 4-bet

## Completed Work

### Planning And Architecture

- Phase plan documented
- Phase 2 execution plan documented
- Full-game architecture documented
- Coverage policy documented
- Preflop priority coverage documented
- Phase 1 closeout/status artifact implemented
- Phase 2 closeout/status artifact implemented

### Runtime And UI

- Electron desktop runtime in place
- React study UI split into setup and study stages
- Recommendation panel supports exact / approximate / unsupported flows
- Node coverage metadata is surfaced in the UI
- Setup-only selectors that are not yet supported are now explicitly non-interactive
- Pre-Hero action UI no longer offers `raise` before any open has occurred
- Setup screen includes:
  - current pack summary
  - lightweight coverage browser

### Engine And Repository

- Input normalization implemented
- Scenario mapping implemented for preflop v1 node families
- Unsupported valid nodes return structured unsupported results
- Pack summary API implemented
- Node coverage metadata implemented

### Dataset Coverage

Broad coverage exists now for:

- RFI:
  - `UTG`
  - `HJ`
  - `CO`
  - `BTN`
  - `SB`
- single-open response families:
  - `BTN vs CO`
  - `BTN vs HJ`
  - `BTN vs UTG`
  - `CO vs HJ`
  - `CO vs UTG`
  - `BB vs BTN`
  - `BB vs CO`
  - `BB vs HJ`
  - `BB vs UTG`
  - `BB vs SB`
  - `SB vs BTN`
  - `SB vs CO`
  - `SB vs HJ`
  - `SB vs UTG`
- selected multiway / higher-raise families:
  - `BTN vs UTG open + HJ call`
  - `BB vs BTN open + SB call`
  - `SB vs HJ open + CO 3bet`
  - `BTN vs UTG open + HJ 3bet + CO 4bet`

### Tooling

- Pack validator CLI implemented
- Deterministic pack manifest builder implemented
- Manifest artifact generation is working
- Canonical preflop solver-import contract documented
- Solver-import to strategy-pack converter implemented
- Import validation now checks scenario-key and action metadata consistency
- Canonical import validation now checks action-family semantics against line signature
- Canonical import validation now checks scenario-level action-size consistency
- Canonical import validation now checks scenario-level descriptor consistency
- First raw-to-canonical flat export normalizer implemented
- Second raw-to-canonical tabular export normalizer implemented
- First named solver-profile adapter implemented
- Operator workflow documented
- Sample canonical solver-import document added
- Sample flat raw solver export document added
- Sample tabular raw solver export document added
- Sample named simple CSV profile document added
- Phase 1 status report builder implemented
- Phase 2 status report builder implemented

## Current Metrics

At the latest verified point:

- strategy rows: `139`
- scenarios: `25`
- tests: `111 passing`
- pack validation: `passed`
- manifest generation: `passed`
- solver import conversion: `passed`
- flat raw export normalization: `passed`
- tabular raw export normalization: `passed`
- named simple csv profile normalization: `passed`
- phase 1 status report: `complete`
- phase 2 status report: `complete`
- phase 1 priority families present: `19 / 19`

## Current Commands

- build: `npm.cmd run build`
- test: `npm.cmd test`
- validate pack: `npm.cmd run validate:pack`
- build manifest: `npm.cmd run build:manifest`
- normalize flat raw export: `npm.cmd run normalize:solver:flat`
- normalize tabular raw export: `npm.cmd run normalize:solver:tabular`
- normalize named simple csv profile: `npm.cmd run normalize:solver:simple-csv-profile`
- import canonical solver document: `npm.cmd run import:solver`
- build phase 1 status: `npm.cmd run build:phase1-status`
- build phase 2 status: `npm.cmd run build:phase2-status`

## Recommended Next Steps

Current recommended next implementation step:

1. Start Phase 3 with a documented preflop coverage wave driven through the pipeline, not by reverting to blind manual expansion

## Phase Closeout Notes

Phase 1 is complete because:

- the preflop runtime is stable
- the documented Phase 1 priority families are all present in the dev pack
- validation, manifest generation, canonical import conversion, and a first raw-export normalizer are all in place

Phase 2 is complete because:

- canonical import validation now rejects broken source data at row, scenario, and document levels
- generic and named source adapters exist and are tested
- the raw source -> canonical import -> strategy pack workflow is documented
- deterministic manifest and phase-status artifacts are generated from the repo itself

## Notes For Resume

If the session stops here, the safest resume point is:

- read `docs/plan.md`
- read this file
- run:
  - `npm.cmd test`
  - `npm.cmd run validate:pack`
  - `npm.cmd run build:manifest`
  - `npm.cmd run build:phase1-status`
  - `npm.cmd run build:phase2-status`
