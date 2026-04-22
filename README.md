# PokerWiz

Local-first poker study application, currently focused on preflop but being architected for full-game expansion.

## Final Stack Choice

Electron + React + TypeScript.

- Electron owns the desktop shell and IPC bridge.
- TypeScript owns the poker engine, dataset loading, normalization, lookup, decision selection, and explanations.
- React + TypeScript handles fast manual input, output rendering, and future range-browser workflows.
- JSON is used for the development strategy pack. The repository interface is designed so SQLite or a compact binary pack can replace it later without changing UI contracts.

## Why This Instead Of The Alternatives

- `Electron + TypeScript` is enough for v1 because preflop evaluation is lookup-heavy, not solver-heavy.
- It removes the Rust/MSVC toolchain friction while preserving strong typing, good modularity, and local-first performance.
- `C# + WPF/Avalonia` remains a strong Windows-first option, but it would force a full UI/runtime rewrite away from the existing React renderer.
- `Rust + Tauri` is still attractive for a future native-core rewrite if the engine eventually needs heavier compute or binary-pack optimization.

## Planning Source Of Truth

- [`docs/plan.md`](docs/plan.md)
- [`docs/full-game-architecture.md`](docs/full-game-architecture.md)
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/coverage-policy.md`](docs/coverage-policy.md)
- [`docs/preflop-priority-coverage.md`](docs/preflop-priority-coverage.md)
- [`docs/progress.md`](docs/progress.md)
- [`docs/solver-import-contract.md`](docs/solver-import-contract.md)

The repository has completed `Phase 1` and is now in `Phase 2`, which is the reproducible pack-pipeline phase.

Important current constraints:

- JSON is the only active pack backend
- SQLite is deferred until it is justified by actual pack/runtime pressure
- validation and manifest generation are already part of Phase 1
- Phase 1 closeout status is tracked with a generated status artifact

## Repo Layout

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/plan.md`](docs/plan.md)
- [`docs/full-game-architecture.md`](docs/full-game-architecture.md)
- [`docs/coverage-policy.md`](docs/coverage-policy.md)
- [`docs/preflop-priority-coverage.md`](docs/preflop-priority-coverage.md)
- [`docs/progress.md`](docs/progress.md)
- [`preflop-engine`](preflop-engine)
- [`desktop-shell`](desktop-shell)
- [`desktop-ui`](desktop-ui)
- [`data/dev/strategy-pack.v1.json`](data/dev/strategy-pack.v1.json)
- [`shared/contracts.ts`](shared/contracts.ts)

## Run Locally

1. Install root dependencies:

```powershell
npm.cmd install
```

2. Install renderer dependencies:

```powershell
cd desktop-ui
npm.cmd install
```

3. Start the desktop app from the repo root:

```powershell
npm.cmd run dev
```

4. Build the desktop app assets:

```powershell
npm.cmd run build
```

5. Run the TypeScript test suite:

```powershell
npm.cmd test
```

6. Validate the strategy pack structure and row integrity:

```powershell
npm.cmd run validate:pack
```

7. Generate the deterministic pack manifest:

```powershell
npm.cmd run build:manifest
```

8. Convert a canonical solver-import document into an app-native strategy pack:

```powershell
npm.cmd run import:solver
```

9. Normalize the sample flat raw solver export into the canonical import contract:

```powershell
npm.cmd run normalize:solver:flat
```

10. Generate the current Phase 1 closeout/status report:

```powershell
npm.cmd run build:phase1-status
```
