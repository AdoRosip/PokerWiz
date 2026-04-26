# Phase 3 Coverage Wave 5

## Scope

Deepen `6max_cash_100bb_BB_vs_CO_open_2.5bb` with a broader out-of-position defend slice.

## Added Hand Classes

- `AA`
- `KK`
- `AJs`
- `KTs`
- `QJs`
- `55`
- `22`
- `65s`

## Coverage Intent

This wave broadens the node across:

- top premium pairs
- stronger suited ace continues
- additional suited broadway continues
- small pair defend mixes
- lower suited connector continues

## Verification

Verified with:

- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run validate:pack`
- `npm.cmd run build:manifest`
