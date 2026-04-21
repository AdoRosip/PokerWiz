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

The repository is currently in `Phase 0`, which is the architecture and foundation phase for a hybrid full-game system.

## Repo Layout

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/plan.md`](docs/plan.md)
- [`docs/full-game-architecture.md`](docs/full-game-architecture.md)
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
