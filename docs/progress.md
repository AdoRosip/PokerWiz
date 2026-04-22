# Progress Log

This file is the resume point for the project. It should answer two questions quickly:

1. what has been decided
2. what has been completed so far

## Current Status

- Active phase: `Phase 2`
- Current emphasis: reproducible pack-pipeline work and solver-import expansion
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

- JSON is the only active pack backend for Phase 1
- SQLite is deferred until pack size or runtime performance justifies it
- Do not maintain dual runtime backends early

### 4. Validation Policy

- Validation is not deferred to Phase 2 anymore
- Basic pack validation is required in Phase 1
- Full solver-import / normalization / regeneration pipeline still belongs in Phase 2

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
- Full-game architecture documented
- Coverage policy documented
- Preflop priority coverage documented
- Phase 1 closeout/status artifact implemented

### Runtime And UI

- Electron desktop runtime in place
- React study UI split into setup and study stages
- Recommendation panel supports exact / approximate / unsupported flows
- Node coverage metadata is surfaced in the UI
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
- First raw-to-canonical flat export normalizer implemented
- Sample canonical solver-import document added
- Sample flat raw solver export document added
- Phase 1 status report builder implemented

## Current Metrics

At the latest verified point:

- strategy rows: `139`
- scenarios: `25`
- tests: `98 passing`
- pack validation: `passed`
- manifest generation: `passed`
- solver import conversion: `passed`
- flat raw export normalization: `passed`
- phase 1 status report: `complete`
- phase 1 priority families present: `19 / 19`

## Current Commands

- build: `npm.cmd run build`
- test: `npm.cmd test`
- validate pack: `npm.cmd run validate:pack`
- build manifest: `npm.cmd run build:manifest`
- normalize flat raw export: `npm.cmd run normalize:solver:flat`
- import canonical solver document: `npm.cmd run import:solver`
- build phase 1 status: `npm.cmd run build:phase1-status`

## Recommended Next Steps

1. Build the next real solver-specific raw adapter beyond the generic flat export family
2. Add richer semantic validation around imported action trees where it materially improves solver-data fidelity
3. Keep using the pack pipeline instead of direct manual pack editing
4. Avoid SQLite implementation until JSON shows real pain

## Phase 1 Closeout Note

Phase 1 is considered complete because:

- the preflop runtime is stable
- the documented Phase 1 priority families are all present in the dev pack
- validation, manifest generation, canonical import conversion, and a first raw-export normalizer are all in place

This does not mean the pack has full preflop hand-class coverage. It means the Phase 1 baseline and tooling goals are met, and the project should now advance through the Phase 2 pipeline path instead of continuing indefinite Phase 1 hardening.

## Notes For Resume

If the session stops here, the safest resume point is:

- read `docs/plan.md`
- read this file
- run:
  - `npm.cmd test`
  - `npm.cmd run validate:pack`
  - `npm.cmd run build:manifest`
  - `npm.cmd run build:phase1-status`
