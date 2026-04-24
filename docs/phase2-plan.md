# Phase 2 Plan

This document is the concrete execution checklist for `Phase 2`.

Phase 2 is not about expanding the product surface. It is about making the pack pipeline reproducible, inspectable, and safe enough to support larger strategy datasets without falling back to ad hoc manual editing.

## Phase 2 Goal

Build a reproducible offline pack pipeline that can:

1. ingest raw solver-style source data
2. normalize it into one canonical import contract
3. validate it structurally and semantically
4. convert it into app-native strategy packs
5. generate deterministic artifacts that are easy to regress and review

## Out Of Scope

Phase 2 does not include:

- postflop runtime support
- SQLite runtime backend work
- major UI redesign
- wide new preflop family expansion unless needed for pipeline verification
- claiming broad compatibility with commercial solver exports we have not actually profiled

## Working Principles

- canonical import remains the stable seam
- raw adapters stay narrow and explicit
- validation should fail early and clearly
- deterministic outputs matter more than convenience shortcuts
- manual pack editing should stop being the primary path

## Workstreams

### 1. Canonical Import Hardening

Goal:

- make `PreflopSolverImportDocument` a trustworthy handoff boundary

Completed so far:

- row identity validation
- scenario-key validation
- action-family validation
- passive/aggressive sizing validation
- scenario-level action-size consistency
- scenario-level descriptor consistency

Remaining:

- stronger duplicate/normalization assumptions where justified
- clearer machine-readable validation summaries if needed

Exit signal:

- canonical imports fail fast on structural or semantic contradictions

### 2. Raw Adapter Layer

Goal:

- support a small number of explicit raw source shapes that normalize into the canonical contract

Completed so far:

- generic flat JSON export adapter
- generic tabular TSV export adapter

Remaining:

- adapter-specific fixtures and tests
- profile-specific parsing notes in docs

Exit signal:

- at least one named adapter works end to end with sample source data

### 3. Artifact Builder Layer

Goal:

- make output generation deterministic and reviewable

Completed so far:

- canonical import -> strategy pack conversion
- manifest generation
- Phase 1 status generation

Remaining:

- improve artifact-generation workflow if more outputs become necessary

Exit signal:

- pack and metadata artifacts can be rebuilt repeatedly with stable output

### 4. Validation And Regression

Goal:

- make pipeline correctness testable beyond “the script ran”

Completed so far:

- pack validator
- import validation
- manifest tests
- adapter tests

Remaining:

- profile-level regression fixtures
- optional golden artifact comparisons if they become worth the maintenance cost

Exit signal:

- a broken adapter or inconsistent source document is caught before pack generation is trusted

### 5. Operator Workflow

Goal:

- make the pipeline usable by a human without chat context

Completed so far:

- CLI commands exist
- sample input and output artifacts exist

Remaining:

- document how to add a new adapter
- document how to interpret validation failures

Exit signal:

- a contributor can add or run a source adapter from docs alone

## Ordered Execution

This is the recommended order for the rest of Phase 2.

### Step 1. Finish Canonical Import Hardening

Focus:

- document-level validation rules
- scenario/tree consistency rules
- keep current validators green

Status:

- complete

### Step 2. Add The First Named Solver-Profile Adapter

Focus:

- one explicit adapter with documented assumptions
- no vague “supports vendor X” claims
- sample fixture + tests + docs

Status:

- complete

### Step 3. Tighten Artifact Workflow

Focus:

- make generated outputs easy to inspect and reproduce
- add only the artifacts that actually improve review and regression confidence

Status:

- complete

### Step 4. Document Operator Workflow

Focus:

- how to go from raw export -> canonical import -> pack -> manifest
- how to add a new adapter
- how to debug validation failures

Status:

- complete

### Step 5. Phase 2 Closeout

Focus:

- create a Phase 2 status artifact or closeout checklist
- confirm reproducible pipeline, not just working scripts

Status:

- complete

## Exit Criteria

Phase 2 is complete when:

- canonical import validation is strong enough to reject broken source data early
- at least one named solver-profile adapter exists and is tested
- raw source -> canonical import -> pack is reproducible and documented
- manifest/status generation remains deterministic
- manual pack editing is no longer the intended main path for future growth

## Closeout

Phase 2 is complete.

Closeout artifacts now include:

- canonical import validation with document-level tree-policy checks
- generic raw adapters for flat JSON and tabular TSV exports
- named solver-profile adapter `simple_csv_profile_v1`
- operator workflow documentation in [`docs/pack-workflow.md`](pack-workflow.md)
- generated Phase 2 status artifact via `npm.cmd run build:phase2-status`

The next active phase should be `Phase 3: Expand Preflop Coverage`.
