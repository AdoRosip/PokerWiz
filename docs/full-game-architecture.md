# Full-Game Architecture

This document is the Phase 0 architecture baseline. It replaces the earlier preflop-only mental model with a system designed to grow into full-game support without requiring a rewrite.

## 1. Core Decision

PokerWiz will use a hybrid model:

- runtime decisions come from local strategy packs
- strategy packs are produced offline from solver outputs
- unsupported spots are explicit runtime outcomes
- future selective solving or learned approximation is an extension, not the default path

This is the optimal long-term choice because:

- preflop lookup is well served by precomputed packs
- postflop state space is too large for a static everything-pack strategy
- full exact local solving is too expensive and too variable to be the default desktop UX
- reproducibility, speed, and testability matter more than pretending every spot is solved on demand

## 2. Final Stack

### Runtime

- Desktop shell: `Electron`
- Renderer: `React + TypeScript + Vite`
- Runtime app/domain logic: `TypeScript`

### Offline Tooling

- Data pipeline: `Python`
- Pack building and validation: `Python`
- Optional future heavy services: separate from desktop runtime

### Storage

- Development packs: `JSON`
- Active Phase 1 backend: `JSON`
- Production packs: `SQLite` when pack size or runtime pressure justifies it
- Optional high-performance artifacts: compact binary indexes side-by-side with SQLite

Decision:

- the repository abstraction may anticipate future backends
- the project should not maintain two real runtime backends during Phase 1

## 3. System Modules

The codebase should converge toward these modules.

Important constraint:

- this is the target architecture, not a mandate to keep refactoring Phase 1 around package boundaries
- during Phase 1, only make physical/module changes that materially help the current preflop work

### `desktop-ui`

Responsibilities:

- user flows
- study UX
- input capture
- result rendering
- browsing and training workflows

Non-responsibilities:

- no poker normalization logic
- no strategy matching logic
- no pack parsing

### `desktop-shell`

Responsibilities:

- Electron lifecycle
- preload bridge
- local filesystem pack access
- IPC entrypoints

### `app-services`

Responsibilities:

- orchestrate runtime use cases
- translate UI requests into domain commands
- call engine and repository services
- provide typed responses and errors

### `game-domain`

Responsibilities:

- full-hand state model
- rules for positions, streets, actions, stacks, pot configuration, boards, and betting state
- canonical node identity rules
- validation rules

This module must be future-proof for preflop through river.

### `preflop-engine`

Responsibilities:

- preflop normalization
- preflop node mapping
- preflop lookup
- preflop explanation generation

This remains a specialized package under the broader domain model.

### `pack-repository`

Responsibilities:

- pack manifests
- versioning
- exact lookup
- approximate lookup
- unsupported-state reporting
- storage backend abstraction for JSON, SQLite, or binary

Phase 1 note:

- JSON is the only active backend
- SQLite is deferred

### `tools/solver-import`

Responsibilities:

- parse raw solver outputs
- normalize labels and metadata
- transform raw exports into canonical intermediate records

### `tools/pack-builder`

Responsibilities:

- convert canonical intermediate records into app-native packs
- build dictionaries and indexes
- emit pack manifests and metadata

### `tools/pack-validate`

Responsibilities:

- schema validation
- regression tests
- missing-node checks
- EV/frequency sanity checks

This is now a Phase 1 requirement, not only a future pipeline concern.

## 4. Generalized Domain Model

The runtime model must no longer be “preflop request only.” It should generalize to all streets.

### Game Configuration

- table format: `6max`, later `9max`
- game type: cash, tournament, sit and go
- variant: NLHE initially
- blind structure
- antes
- rake profile
- stack model

### Hand State

- hand id
- current street: `preflop | flop | turn | river`
- hero seat
- active players
- effective stack / stack vector
- pot size and side pots if needed later
- board cards
- hole cards for hero
- action history across all streets
- betting reopened state
- player-to-act

### Actions

- fold
- check
- call
- bet
- raise
- all-in

Action records must include:

- street
- acting player
- amount in chips or big blinds where relevant
- order in the line

### Node Identity

Node identity must be canonical and stable, but street-aware.

Examples:

- preflop: `6max_cash_100bb_BTN_vs_CO_open_2.5bb`
- flop: `6max_cash_100bb_BTN_vs_CO_open_2.5bb_flop_As7d2c_ip_cbet_33`
- turn: later extension of the same line

The important rule is:

- the app stores canonical node ids for lookup
- the runtime derives node ids from structured state
- the UI never constructs keys directly

## 5. Strategy Pack Design

The pack model must support multiple families, not one monolithic file.

### Pack Families

Examples:

- `preflop.6max.cash.100bb.rakeA.tree1`
- `flop.srp.100bb.rakeA.tree1.familyA`

### Pack Contents

Each pack should include:

- `schema_version`
- `pack_version`
- `game_family`
- `tree_family`
- `rake_profile`
- `stack_profile`
- `coverage_description`
- `records`
- optional dictionaries/indexes

### Record Responsibilities

At minimum:

- canonical node id
- hand/combo/board abstraction id
- action frequencies
- EVs if available
- hand resolution level
- source metadata
- coverage metadata

### Runtime Match Policy

Priority:

1. exact node
2. exact abstraction family within tolerance
3. explicit approximation
4. unsupported

The system must never silently invent precision.

## 6. Solver Pipeline Strategy

The solver pipeline is separate from the app runtime.

### Source Of Truth

Solver-generated outputs from approved offline solving workflows.

### Pipeline Stages

1. define canonical tree family
2. solve offline
3. export raw outputs
4. normalize into app intermediate schema
5. validate
6. build packs
7. publish versioned pack artifacts

Implementation timing:

- Phase 1 includes lightweight validation and manifest generation
- Phase 2 owns the fuller import / normalization / regeneration workflow

### Why Separate The Pipeline

- reproducibility
- regression testing
- pack version control
- cleaner runtime
- easier replacement of solver vendor/tool later

## 7. Coverage Strategy

“Support all cases” must be interpreted as a coverage program, not a literal promise of exact runtime solutions for every arbitrary state.

Coverage tiers:

### Tier 1: Exact

- pack contains exact node and abstraction

### Tier 2: Approximate

- node is not exact
- nearest supported abstraction is used inside explicit tolerance
- response carries approximation metadata

### Tier 3: Unsupported

- valid hand state but no acceptable pack match exists
- runtime returns structured unsupported result

## 8. UX Implications

The UX must expose fidelity, not hide it.

For every recommendation, the user should be able to see:

- exact vs approximate vs unsupported
- which pack family answered
- which abstraction was used
- why a node was unsupported if relevant

This is critical once the app expands beyond preflop.

## 9. Initial Repo Target Structure

This is the target structure after architecture cleanup, not necessarily the exact current repo state.

```text
/desktop-shell
/desktop-ui
/packages
  /app-services
  /game-domain
  /preflop-engine
  /pack-repository
/tools
  /solver-import
  /pack-builder
  /pack-validate
/data
  /dev
  /packs
/docs
```

## 10. Phase 0 Completion Criteria

Phase 0 is complete when:

- the long-term architecture is documented
- the generalized domain model is documented
- the pack roadmap is documented
- the module boundaries are documented
- the next implementation step is narrowed to Phase 1 only

No further large feature additions should be treated as architecture work once these artifacts are in place.
