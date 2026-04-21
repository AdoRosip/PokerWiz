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
- Development pack format: `JSON`
- Production pack formats: `SQLite` plus optional compact binary artifacts

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
- repository abstraction cleanup
- broader preflop dataset coverage

Stop point:

- preflop feels stable as a standalone study product

### Phase 2: Build The Pack Pipeline

Goal:

- stop hand-editing packs
- create a reproducible offline data workflow

Deliverables:

- raw solver import format
- normalization scripts
- pack builder
- pack validator
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

Active phase: `Phase 0`

Only Phase 0 should be worked in the immediate next steps.

## Immediate Next Work

1. finalize architecture and full-hand domain modeling
2. define runtime module boundaries
3. define strategy-pack roadmap and storage plan
4. define how solver outputs become app-native packs

Anything beyond that should be treated as a later phase, not folded into the current task by default.
