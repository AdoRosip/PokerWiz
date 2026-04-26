# Phase 3 Coverage Wave 6

## Scope

Complete the remaining high-priority Tier 2 facing-open family deepening pass:

- `6max_cash_100bb_SB_vs_CO_open_2.5bb`
- `6max_cash_100bb_BB_vs_HJ_open_2.5bb`
- `6max_cash_100bb_SB_vs_HJ_open_2.5bb`
- `6max_cash_100bb_BB_vs_UTG_open_2bb`
- `6max_cash_100bb_BTN_vs_UTG_open_2bb`

## Added Hand Classes

### SB vs CO open 2.5bb

- `AA`
- `AQs`
- `A4s`
- `KJs`
- `QTs`
- `33`
- `98s`
- `64s`

### BB vs HJ open 2.5bb

- `AA`
- `KK`
- `AJs`
- `KTs`
- `QJs`
- `55`
- `22`
- `65s`

### SB vs HJ open 2.5bb

- `AA`
- `KK`
- `AQs`
- `A4s`
- `KJs`
- `QTs`
- `33`
- `98s`

### BB vs UTG open 2bb

- `AA`
- `KK`
- `AJs`
- `KJs`
- `55`
- `22`
- `65s`

### BTN vs UTG open 2bb

- `AA`
- `KK`
- `AQo`
- `KQs`
- `QJs`
- `55`
- `22`
- `65s`

## Coverage Intent

This wave completes the current Tier 2 facing-open expansion pass by broadening the remaining high-frequency families across:

- top premium pairs
- stronger suited or offsuit ace continues
- additional suited broadway continues
- small pair continue mixes
- lower suited connector continues
- more realistic OOP polarized pressure hands where applicable

## Verification

Verified with:

- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run validate:pack`
- `npm.cmd run build:manifest`
