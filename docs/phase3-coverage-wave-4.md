# Phase 3 Coverage Wave 4

## Scope

Deepen `6max_cash_100bb_BTN_vs_HJ_open_2.5bb` with a broader, more realistic in-position response slice.

## Added Hand Classes

- `AA`
- `KK`
- `AQs`
- `A4s`
- `KJs`
- `QTs`
- `33`
- `65s`

## Coverage Intent

This wave broadens the node across:

- top premium pairs
- stronger suited ace continues
- wheel-ace pressure mixes
- additional suited broadway continues
- small pair continues
- lower suited connector continues

## Verification

Verified with:

- `npm.cmd test`
- `npm.cmd run build`
- `npm.cmd run validate:pack`
- `npm.cmd run build:manifest`
