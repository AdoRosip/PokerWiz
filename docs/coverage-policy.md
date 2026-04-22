# Coverage Policy

This document defines what PokerWiz means by `exact`, `approximated`, and `unsupported`.

It exists to keep dataset growth disciplined. The runtime must never imply solver precision that the current pack does not actually contain.

## Core Rule

The app does not attempt to represent every literally possible poker state as an exact row.

Instead, PokerWiz works by:

- defining canonical supported tree families
- generating strategy packs for those families
- mapping user input into those families
- returning exact lookup when covered
- returning explicit approximation when acceptable
- returning unsupported when fidelity would otherwise be invented

## Coverage Units

Coverage is measured at three levels:

### 1. Pack Family

Example:

- `6max_cash`
- `100bb`
- specific rake profile
- specific sizing tree

This is the broadest supported environment.

### 2. Scenario Node

Example:

- `6max_cash_100bb_BTN_vs_CO_open_2.5bb`
- `6max_cash_100bb_SB_vs_BTN_open_2.5bb`

This is the canonical decision node within a supported family.

### 3. Hand Resolution

Example:

- hand class: `A5s`
- later combo level: `As5s`

This is the resolution of the strategy row within the node.

## Result States

### Exact

The response is `exact` when:

- the pack family matches
- the scenario node matches exactly
- the requested hand is covered at the available resolution

For preflop v1, this usually means:

- same format
- same stack bucket
- same hero position
- same action family
- same canonical sizing node
- same hand-class row

### Approximated

The response is `approximated` when:

- the request is valid
- there is no exact node
- there is a clearly related supported node within approved tolerance
- the runtime declares the approximation explicitly

Examples:

- open size `2.2bb` mapped to supported `2.5bb`
- nearby stack bucket mapped under a defined bucket policy

Approximations must remain conservative. If the runtime cannot justify the approximation clearly, it must return `unsupported`.

### Unsupported

The response is `unsupported` when:

- the request is valid
- the node is not covered exactly
- no acceptable approximation exists

Unsupported is not an error in product terms. It is a valid runtime outcome that preserves honesty.

## Invalid Versus Unsupported

These must remain separate.

### Invalid

The request itself is not valid poker input or not valid for the current app scope.

Examples:

- duplicate hole cards
- action order impossible for seat order
- limp tree in a version that does not support limp trees
- out-of-range sizing input

Invalid requests should return real validation errors.

### Unsupported

The request is valid poker input, but the current strategy pack cannot answer it honestly.

Examples:

- a valid multiway squeeze node with no matching row
- a valid postflop line before postflop support exists

## What “Complete Preflop Coverage” Means

Complete does not mean every arbitrary exact state in real poker.

For PokerWiz preflop, a node family is considered complete only within a defined abstraction:

- fixed game family, such as `6max_cash`
- fixed stack bucket
- fixed rake profile
- fixed sizing tree
- fixed action-family definition
- all target hand classes populated for that node

That is the realistic definition of completeness.

## Practical Expansion Policy

The pack should grow by coherent node family, not random isolated rows.

Preferred order:

1. high-frequency first-in nodes
2. high-frequency facing-open nodes
3. common multiway preflop nodes
4. higher raise-level nodes

Within each node family:

- cover premiums
- cover strong continues
- cover mixed classes
- cover clear folds
- then expand toward full hand-class coverage

## UI Requirements

The UI should eventually expose:

- exact / approximated / unsupported
- pack family used
- node coverage status
- approximation warnings when relevant

Unsupported nodes should be presented as uncovered, not broken.

## Current Phase 1 Interpretation

During the current preflop hardening phase:

- exact means exact supported node plus hand-class row
- approximated means nearest supported node under current lookup rules
- unsupported means the request is valid but the dev pack lacks an acceptable row

This policy should remain the reference point for future pack-building and UI fidelity work.
