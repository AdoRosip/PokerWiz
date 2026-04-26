# Phase 3 Coverage Wave 1

This is the first deliberate coverage-expansion wave after the Phase 3 entry checklist was completed.

## Target Family

- `6max_cash_100bb_BTN_vs_CO_open_2.5bb`

## Why This Family

- it is already the most populated node in the current dev pack
- it is one of the highest-frequency preflop study spots in 6-max cash
- it is strategically rich enough to exercise premiums, bluff 3-bets, flatting regions, and clear folds in one family

## Wave Goal

Deepen this node with a broader representative hand-class slice rather than spreading rows across unrelated families.

This wave should add:

- additional premiums
- more suited broadways and suited aces
- medium and small pair continues
- more suited connector continues
- more marginal offsuit and suited continue/fold candidates

## Quality Rule

Each added row should be plausible within the current abstraction and should improve the node as a study tool:

- no filler rows just to increase counts
- preserve mixed strategies where they add signal
- keep tags consistent with the current naming style

## Exit Signal

This wave is complete when:

- `BTN vs CO open 2.5bb` is materially deeper than the previous baseline
- regression tests cover the new row families
- build, tests, and pack validation all remain green
