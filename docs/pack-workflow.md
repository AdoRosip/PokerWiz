# Pack Workflow

This document is the practical operator guide for the Phase 2 pack pipeline.

The intended path is:

1. raw solver-style export
2. canonical import document
3. app-native strategy pack
4. validation and deterministic metadata artifacts

Manual editing of `data/dev/strategy-pack.v1.json` is no longer the preferred growth path.

## Supported Input Paths

Current raw adapter families:

- `flat_preflop_export_v1`
- `tabular_preflop_export_v1`
- `simple_csv_profile_v1`

Current canonical handoff:

- `canonical_preflop_import_json`

## End-To-End Workflow

### 1. Normalize Raw Source Data

Choose the adapter that matches the source shape.

Flat JSON export:

```powershell
npm.cmd run normalize:solver:flat
```

Tabular TSV export:

```powershell
npm.cmd run normalize:solver:tabular
```

Named simple CSV profile:

```powershell
npm.cmd run normalize:solver:simple-csv-profile
```

Each normalizer writes a canonical import document into `data/dev/`.

### 2. Convert Canonical Import Into A Strategy Pack

```powershell
npm.cmd run import:solver
```

You can also pass explicit input and output paths:

```powershell
npm.cmd run import:solver data\dev\preflop-simple-csv-profile.sample.canonical.json data\dev\preflop-simple-csv-profile.sample.pack.json
```

### 3. Validate The Pack

```powershell
npm.cmd run validate:pack
```

Validation should pass before treating the generated pack as trustworthy.

### 4. Generate Deterministic Metadata Artifacts

Manifest:

```powershell
npm.cmd run build:manifest
```

Phase 1 status:

```powershell
npm.cmd run build:phase1-status
```

Phase 2 status:

```powershell
npm.cmd run build:phase2-status
```

## Adding A New Adapter

Use this sequence:

1. define the raw source contract in `shared/contracts.ts`
2. add a dedicated normalizer under `tools/solver-import/`
3. normalize into `PreflopSolverImportDocument`
4. add fixture input under `data/dev/`
5. add a normalizer test under `tests/`
6. document the adapter assumptions in `docs/solver-import-contract.md`
7. add an npm script in `package.json`

Rules:

- keep adapters narrow and explicit
- do not claim support for a vendor export unless we have a fixture and a passing test
- normalize all source-specific quirks before the canonical import step

## Interpreting Validation Failures

Common failure classes:

- duplicate row identity
  - the same `scenario_key + hand_resolution + hand_key` appears more than once
- scenario metadata mismatch
  - row fields disagree with the scenario key
- action-family mismatch
  - actions do not make sense for the line signature
- passive/aggressive sizing misuse
  - passive actions include `size_bb`, or aggressive actions omit it
- scenario-level sizing inconsistency
  - the same aggressive action key uses different sizes inside one scenario
- source-tree policy mismatch
  - the source document hints a different stack bucket or open size than the rows imply

When a validation error appears:

1. fix the raw or canonical source document first
2. rerun the relevant normalizer if the error started from raw input
3. rerun `npm.cmd run import:solver`
4. rerun `npm.cmd run validate:pack`

## Review Artifacts

The main reviewable artifacts are:

- canonical import JSON
- generated pack JSON
- manifest JSON
- phase status JSON

These are intended to make pipeline output inspectable and reproducible during reviews.
