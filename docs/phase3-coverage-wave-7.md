# Phase 3 Coverage Wave 7

## Scope

Grouped Tier 1 RFI broadening pass across:

- `6max_cash_100bb_UTG_first_in`
- `6max_cash_100bb_HJ_first_in`
- `6max_cash_100bb_CO_first_in`
- `6max_cash_100bb_BTN_first_in`
- `6max_cash_100bb_SB_first_in`

## Added Hand Classes

### UTG first-in

- `KK`
- `55`

### HJ first-in

- `AA`
- `AQs`
- `KTs`

### CO first-in

- `AA`
- `KQo`
- `QTs`

### BTN first-in

- `AA`
- `KQo`
- `J9s`
- `64s`

### SB first-in

- `AA`
- `K9s`
- `J8s`
- `33`

## Coverage Intent

This wave broadens the priority RFI map with:

- additional premium pairs
- more suited and offsuit broadway opens
- stronger middle and small pair coverage
- wider late-position suited connector opens
- broader small blind steal and iso-style opening coverage

## Verification

Verified with:

- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run validate:pack`
- `npm.cmd run build:manifest`
