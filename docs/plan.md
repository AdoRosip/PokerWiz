# Execution Plan

This file is the working delivery plan for PokerWiz. It is intentionally staged so the project does not drift into building everything at once.

## Product Direction

PokerWiz will be a local-first poker study application built around:

- a desktop runtime for fast manual analysis and study workflows
- a pack-driven decision engine for exact or approximate local lookup
- an offline solver-data pipeline that produces app-native strategy packs
- a future hybrid path for selective solving or learned approximation in unsupported spots

The app is not being designed as a local real-time solver for every arbitrary spot. The runtime will primarily consume precomputed strategy packs generated offline.

## Final Long-Term Technical Decision

- Desktop shell: `Electron`
- Renderer UI: `React + TypeScript + Vite`
- Runtime application logic: `TypeScript`
- Offline data tooling: `Python`
- Active pack format in Phase 1: `JSON`
- Deferred production pack direction: `SQLite` plus optional compact binary artifacts when justified by pack size or runtime pressure

## Execution Constraints

These are active project decisions, not just suggestions.

### Module Discipline

- Keep the long-term module boundaries documented
- Do not keep refactoring purely to match the target module map during Phase 1
- Physical separation should happen only when it materially improves current work

### Backend Discipline

- JSON is the only active runtime pack backend in Phase 1
- Do not build or maintain a real SQLite runtime path yet
- Revisit SQLite only when pack size, memory use, or load time justify it

### Validation Discipline

- Basic pack validation is a Phase 1 requirement
- Phase 1 must not rely on manual inspection alone for pack quality
- Phase 2 still owns the full import / normalization / regeneration pipeline

## Phases

### Phase 0: Foundation And Architecture

Goal:

- lock the long-term architecture
- define the full-hand domain model
- define module boundaries
- define the pack roadmap

Deliverables:

- architecture document
- generalized game-state draft
- repository/module plan
- pack format roadmap

Stop point:

- no new product features until the system shape is agreed

### Phase 1: Harden Preflop Runtime

Goal:

- turn the current preflop prototype into a reliable baseline

Deliverables:

- stronger unsupported-state UX
- clearer exact/approximate/unsupported reporting
- robust node-key rules
- realistic validation rules
- basic pack validation and manifest tooling
- repository abstraction cleanup
- broader preflop dataset coverage

Stop point:

- preflop feels stable as a standalone study product

Status:

- complete

### Phase 2: Build The Pack Pipeline

Goal:

- stop hand-editing packs
- create a reproducible offline data workflow

Deliverables:

- raw solver import format
- normalization scripts
- pack builder
- regression suite
- versioned pack manifests

Stop point:

- packs can be regenerated and verified end to end

### Phase 3: Expand Preflop Coverage

Goal:

- cover real 6-max cash preflop families rather than a small sample

Deliverables:

- supported baseline tree families
- rake profile support
- open/call/3bet/4bet/5bet families
- multiway policy
- pack browser support for preflop

Stop point:

- preflop coverage is broad enough to serve as a serious study tool

### Phase 4: Generalize To Full-Hand State

Goal:

- make the codebase ready for flop/turn/river support without trying to implement everything at once

Deliverables:

- street-aware state model
- board model
- cross-street action history model
- pot and SPR modeling
- street-aware node identity
- generalized repository interfaces

Stop point:

- preflop code is no longer a dead-end architecture

### Phase 5: Postflop v1

Recommended first slice:

- single-raised pots
- flop only
- limited board families
- fixed stack/rake/tree family

Deliverables:

- flop node model
- flop pack format
- runtime lookup and fidelity reporting
- UX for navigating flop recommendations

Stop point:

- one postflop family works end to end

### Phase 6: Turn And River Expansion

Goal:

- extend supported families street by street

Deliverables:

- turn node model
- river node model
- line continuation support
- expanded pack families
- approximation policies for incomplete coverage

### Phase 7: Selective Solve / Approximation

Goal:

- intelligently handle valid but uncovered spots

Possible deliverables:

- nearest-node interpolation
- board-family approximation
- optional custom-solve workflow
- learned approximation layer trained on internal solver corpus

## Current Active Phase

Active phase: `Phase 2`

Phase 1 closeout is complete. Current work should now move into reproducible pack-pipeline work rather than more ad hoc preflop hardening.

## Progress Tracking

Resume source of truth:

- [`docs/progress.md`](progress.md)

## Immediate Next Work

1. define the next real solver-specific raw adapter beyond the generic flat export family
2. add stronger import-side semantic validation beyond key-shape consistency where it materially improves fidelity
3. keep future dataset work moving toward import/build tooling instead of manual editing
4. keep validation, manifest generation, and Phase 1 status generation green as required quality gates
5. expand coverage only when it directly helps pipeline verification or closes a real priority-family hole

Postflop modeling remains out of scope until the pack pipeline is reproducible enough to support future full-game work cleanly.

## Phase 1 Priority Coverage

Reference:

- [`docs/preflop-priority-coverage.md`](preflop-priority-coverage.md)

The working rule is to deepen high-frequency preflop families before expanding into lower-value branches.
