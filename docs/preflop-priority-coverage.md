# Preflop Priority Coverage

This document defines which preflop node families matter most during Phase 1.

The goal is not to spread rows evenly across every valid node. The goal is to make the current dev pack useful in the spots users will actually study most often.

## Coverage Strategy

Priority order:

1. first-in / RFI nodes by position
2. single-open, no-caller response nodes
3. open plus cold-call nodes
4. 3-bet and 4-bet response nodes

Within each node family:

- cover premiums
- cover strong value continues
- cover mixed middling classes
- cover suited wheel / blocker bluffs where relevant
- cover suited connector continues
- cover clear trash folds

The target for a mature Phase 1 family is broad hand-class coverage within the fixed abstraction, not just a few example rows.

## Phase 1 Priority Families

### Tier 1: RFI Foundation

- `6max_cash_100bb_UTG_first_in`
- `6max_cash_100bb_HJ_first_in`
- `6max_cash_100bb_CO_first_in`
- `6max_cash_100bb_BTN_first_in`
- `6max_cash_100bb_SB_first_in`

Why:

- these are foundational
- they are common study spots
- they anchor explanation logic and future range browsing

### Tier 2: High-Frequency Facing-Open Nodes

- `6max_cash_100bb_BTN_vs_CO_open_2.5bb`
- `6max_cash_100bb_BTN_vs_HJ_open_2.5bb`
- `6max_cash_100bb_BB_vs_BTN_open_2.5bb`
- `6max_cash_100bb_SB_vs_BTN_open_2.5bb`
- `6max_cash_100bb_BB_vs_CO_open_2.5bb`
- `6max_cash_100bb_SB_vs_CO_open_2.5bb`
- `6max_cash_100bb_BB_vs_HJ_open_2.5bb`
- `6max_cash_100bb_SB_vs_HJ_open_2.5bb`
- `6max_cash_100bb_BB_vs_UTG_open_2bb`
- `6max_cash_100bb_BTN_vs_UTG_open_2bb`

Why:

- these occur constantly
- they cover in-position and out-of-position defense patterns
- they create the backbone for practical 6-max study

### Tier 3: Open Plus Call

- `6max_cash_100bb_BTN_vs_UTG_open_2bb_HJ_call`
- `6max_cash_100bb_BB_vs_BTN_open_2.5bb_SB_call`

Why:

- useful squeeze and multiway baseline
- lower priority than the single-open map

### Tier 4: 3-Bet / 4-Bet Families

- `6max_cash_100bb_SB_vs_HJ_open_2.5bb_CO_3bet_8bb`
- `6max_cash_100bb_BTN_vs_UTG_open_2.5bb_HJ_3bet_8bb_CO_4bet_22bb`

Why:

- important strategically
- but not the first place to spend pack-building effort while the single-open tree is still sparse

## Current Focus

Current active push:

- finish broadening Tier 1 RFI coverage
- continue broadening Tier 2 single-open response nodes

## Working Rule

If a decision must be made between:

- adding one more obscure node family
- or making a priority family materially deeper

choose the deeper priority family.
