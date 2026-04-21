# Architecture

The authoritative long-term architecture now lives in:

- [`docs/plan.md`](plan.md)
- [`docs/full-game-architecture.md`](full-game-architecture.md)

This file remains as a short index.

## Current Architectural Decision

PokerWiz is being built as a hybrid pack-driven study system:

- `Electron + React + TypeScript` for the desktop runtime
- local lookup from versioned strategy packs at runtime
- offline solver-data generation through a separate tooling pipeline
- future selective solve / approximation support for uncovered spots

## Current Phase

Active phase: `Phase 0`

Phase 0 work is limited to:

- architecture definition
- full-hand domain modeling
- pack strategy
- module boundaries

## Next Documents To Read

- [`docs/plan.md`](plan.md): execution phases and stop points
- [`docs/full-game-architecture.md`](full-game-architecture.md): module design, generalized domain model, and pack strategy
