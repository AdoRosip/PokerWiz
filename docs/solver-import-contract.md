# Solver Import Contract

This document defines the first canonical import seam for future solver data.

The goal is not to support every solver's raw export format directly inside the runtime. The goal is to define one stable intermediate document that upstream adapters can target.

## Why This Exists

The project has already reached the point where manual editing of app-native strategy rows is no longer a sustainable long-term path.

We now separate three concerns:

1. raw solver exports
2. canonical import documents
3. app-native strategy packs

Phase 1 implemented `2 -> 3` and added a narrow `1 -> 2` adapter for one explicit flat export family.

That work is now complete enough to serve as the handoff into Phase 2 pipeline work.

## Canonical Import Document

Type:

- `PreflopSolverImportDocument`

Location:

- [`shared/contracts.ts`](../shared/contracts.ts)

The canonical document contains:

- dataset metadata
- solver/source metadata
- tree metadata
- normalized preflop rows

Each row contains:

- `scenario_key`
- `line_signature`
- `stack_bucket`
- `hero_position`
- `hand_key`
- `hand_resolution`
- `actions`
- optional `tags`
- optional `source_label`

## Current Scope

Phase 1 supports:

- loading a canonical import JSON file
- validating duplicate row identity and basic row integrity
- validating scenario-key consistency against row metadata
- validating import action metadata before pack conversion
- converting canonical rows into the app-native `StrategyPack`
- validating the converted pack using the existing pack validator
- normalizing one flat raw export family into the canonical import document

Phase 1 still does not yet support:

- direct Monker/Simple/Pio raw export parsing
- multiple raw export adapters
- automatic scenario-key generation from raw exports
- EV/frequency reconciliation across multiple source files

## Current CLI

Command:

```powershell
npm.cmd run import:solver
```

Default sample input:

- [`data/dev/preflop-solver-import.sample.json`](../data/dev/preflop-solver-import.sample.json)

Converter implementation:

- [`tools/solver-import/import-preflop-solver.ts`](../tools/solver-import/import-preflop-solver.ts)

Flat raw export normalizer:

- [`tools/solver-import/normalize-flat-preflop-export.ts`](../tools/solver-import/normalize-flat-preflop-export.ts)

Default flat sample input:

- [`data/dev/preflop-flat-export.sample.json`](../data/dev/preflop-flat-export.sample.json)

Normalization command:

```powershell
npm.cmd run normalize:solver:flat
```

## Design Rule

Solver-specific adapters should normalize into this contract first.

That keeps:

- runtime contracts stable
- pack validation reusable
- future pipeline work incremental instead of ad hoc

## First Supported Raw Export Family

The first raw export family is intentionally narrow:

- document type: `PreflopFlatSolverExportDocument`
- source format tag: `flat_preflop_export_v1`

Each raw row supplies:

- shared scenario metadata
- `action_frequencies` as a keyed map
- optional `action_evs_bb`
- optional `action_sizes_bb`

This is designed to mimic a simple tabular export shape without hard-coding the app to any one commercial solver.

The current pipeline is now:

1. flat raw export
2. canonical import document
3. app-native strategy pack
