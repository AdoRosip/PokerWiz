import { describe, expect, it } from "vitest";

import type { PreflopFlatSolverExportDocument } from "../shared/contracts";
import { convertPreflopSolverImportToStrategyPack } from "../tools/solver-import/import-preflop-solver";
import {
  normalizeFlatPreflopExportToCanonicalImport,
  validatePreflopFlatSolverExportDocument,
} from "../tools/solver-import/normalize-flat-preflop-export";

describe("preflop flat export normalizer", () => {
  it("normalizes a flat export document into the canonical import contract", () => {
    const document: PreflopFlatSolverExportDocument = {
      schema_version: 1,
      export_version: 1,
      dataset_version: "flat_export_test_v1",
      game: "6max_cash",
      source_solver: "test_solver",
      source_format: "flat_preflop_export_v1",
      source_tree: "6max_cash_100bb_test_tree",
      default_source_label: "flat_export_source",
      rows: [
        {
          scenario_key: "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
          line_signature: "facing_open",
          stack_bucket: "100bb",
          hero_position: "BTN",
          hand_key: "A5s",
          hand_resolution: "hand_class",
          tags: ["solver_bluff"],
          action_frequencies: {
            call: 0.18,
            "3bet_7.5": 0.82,
          },
          action_evs_bb: {
            call: 0.14,
            "3bet_7.5": 0.31,
          },
          action_sizes_bb: {
            "3bet_7.5": 7.5,
          },
        },
      ],
    };

    const canonical = normalizeFlatPreflopExportToCanonicalImport(document);
    const pack = convertPreflopSolverImportToStrategyPack(canonical);

    expect(canonical.source_format).toBe("flat_preflop_export_v1");
    expect(canonical.rows).toHaveLength(1);
    expect(canonical.rows[0].actions).toEqual([
      {
        action_key: "3bet_7.5",
        frequency: 0.82,
        ev_bb: 0.31,
        size_bb: 7.5,
      },
      {
        action_key: "call",
        frequency: 0.18,
        ev_bb: 0.14,
        size_bb: undefined,
      },
    ]);
    expect(pack.entries[0].source).toBe("flat_export_source");
  });

  it("flags unknown action keys in optional maps", () => {
    const document: PreflopFlatSolverExportDocument = {
      schema_version: 1,
      export_version: 1,
      dataset_version: "flat_export_bad_map_v1",
      game: "6max_cash",
      source_solver: "test_solver",
      source_format: "flat_preflop_export_v1",
      source_tree: "bad_map_tree",
      rows: [
        {
          scenario_key: "6max_cash_100bb_CO_first_in",
          line_signature: "first_in",
          stack_bucket: "100bb",
          hero_position: "CO",
          hand_key: "KQs",
          hand_resolution: "hand_class",
          action_frequencies: {
            "raise_2.5": 1,
          },
          action_evs_bb: {
            fold: 0,
          },
        },
      ],
    };

    const summary = validatePreflopFlatSolverExportDocument(document);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("action_evs_bb contains unknown action key fold"),
        }),
      ]),
    );
  });
});
