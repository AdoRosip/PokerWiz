import { describe, expect, it } from "vitest";

import {
  normalizeTabularPreflopExportToCanonicalImport,
  parseTabularPreflopExport,
  validatePreflopTabularSolverExportDocument,
} from "../tools/solver-import/normalize-tabular-preflop-export";

describe("preflop tabular export normalizer", () => {
  it("normalizes a tabular export into the canonical import contract", () => {
    const raw = [
      [
        "dataset_version",
        "game",
        "source_solver",
        "source_format",
        "source_tree",
        "default_source_label",
        "scenario_key",
        "line_signature",
        "stack_bucket",
        "hero_position",
        "hand_key",
        "hand_resolution",
        "tags",
        "freq:call",
        "ev:call",
        "freq:3bet_7.5bb",
        "ev:3bet_7.5bb",
        "size:3bet_7.5bb",
      ].join("\t"),
      [
        "tabular_test_v1",
        "6max_cash",
        "test_solver",
        "tabular_preflop_export_v1",
        "6max_cash_100bb_test_tree",
        "tabular_test_source",
        "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
        "facing_open",
        "100bb",
        "BTN",
        "A5s",
        "hand_class",
        "single_open|solver_bluff",
        "0.18",
        "0.14",
        "0.82",
        "0.31",
        "7.5",
      ].join("\t"),
    ].join("\n");

    const document = parseTabularPreflopExport(raw);
    const canonical = normalizeTabularPreflopExportToCanonicalImport(document);

    expect(canonical.dataset_version).toBe("tabular_test_v1");
    expect(canonical.rows).toHaveLength(1);
    expect(canonical.rows[0].actions).toEqual([
      {
        action_key: "3bet_7.5bb",
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
  });

  it("flags mixed document-level metadata across tabular rows", () => {
    const raw = [
      [
        "dataset_version",
        "game",
        "source_solver",
        "source_format",
        "source_tree",
        "scenario_key",
        "line_signature",
        "stack_bucket",
        "hero_position",
        "hand_key",
        "hand_resolution",
        "freq:call",
      ].join("\t"),
      [
        "tabular_bad_meta_v1",
        "6max_cash",
        "solver_a",
        "tabular_preflop_export_v1",
        "tree_a",
        "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
        "facing_open",
        "100bb",
        "BTN",
        "A5s",
        "hand_class",
        "1",
      ].join("\t"),
      [
        "tabular_bad_meta_v1",
        "6max_cash",
        "solver_b",
        "tabular_preflop_export_v1",
        "tree_b",
        "6max_cash_100bb_CO_first_in",
        "first_in",
        "100bb",
        "CO",
        "AJo",
        "hand_class",
        "1",
      ].join("\t"),
    ].join("\n");

    const document = parseTabularPreflopExport(raw);
    const summary = validatePreflopTabularSolverExportDocument(document);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("solver metadata does not match"),
        }),
      ]),
    );
  });
});
