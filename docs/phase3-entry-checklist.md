# Phase 3 Entry Checklist

This checklist captures the immediate fixes identified at the end of Phase 2 before broader Phase 3 preflop expansion continues.

The goal is not to stop Phase 3 work. The goal is to fix the highest-value correctness and UX issues now so future coverage work is built on cleaner semantics.

## Must Fix Before Broad Phase 3 Expansion

Completed:

1. `strict_gto_frequencies` no longer behaves like a silent alias; it now emits strict-mode notes and warnings, and the UI reflects that the full mix is primary
2. scenario mapping no longer uses silent sizing fallbacks for aggressive actions
3. the study UI no longer offers `open` after aggression has already occurred
4. aggressive player-action semantics are now centralized instead of duplicated across runtime and UI

## Should Fix Early In Phase 3

Completed:

1. normalization now uses the shared position-order helper
2. the unnecessary `sawLimp` flag has been removed
3. hand-class-only coverage reporting is now documented in the repository code
4. `empty_scenarios_observed` has been removed until explicit empty-scenario tracking exists

Remaining:

None. The remaining Phase 3 entry items from the Phase 2 review have been addressed.

## Deferred For Later Phase 3 Or Beyond

1. model `ScenarioDescriptor` as a discriminated union
2. redesign tabular export row types so document-level metadata is less repetitive
3. add golden artifact regression checks once pipeline churn slows down
4. strengthen early metadata validation during simple CSV parsing
5. lift the `simple_csv_profile_v1` four-slot action cap when a richer adapter is actually needed

## Current Implementation Order

1. start the next documented Phase 3 coverage wave
2. decide whether to address any deferred adapter-shape items before a richer import source actually needs them

## Exit Signal

This checklist is done when the Phase 2 review issues that affect current correctness or user-facing semantics are either:

- implemented, or
- explicitly deferred with a documented reason

Status:

- complete
