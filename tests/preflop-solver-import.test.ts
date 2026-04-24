import { describe, expect, it } from "vitest";

import type { PreflopSolverImportDocument } from "../shared/contracts";
import {
  convertPreflopSolverImportToStrategyPack,
  validatePreflopSolverImportDocument,
} from "../tools/solver-import/import-preflop-solver";

describe("preflop solver import", () => {
  it("converts the canonical import document into a strategy pack", () => {
    const document: PreflopSolverImportDocument = {
      schema_version: 1,
      import_version: 1,
      dataset_version: "import_test_v1",
      game: "6max_cash",
      source_solver: "test_solver",
      source_format: "canonical_preflop_import_json",
      source_tree: "6max_cash_100bb_test_tree",
      default_source_label: "test_import_source",
      rows: [
        {
          scenario_key: "6max_cash_100bb_CO_first_in",
          line_signature: "first_in",
          stack_bucket: "100bb",
          hero_position: "CO",
          hand_key: "AJo",
          hand_resolution: "hand_class",
          tags: ["rfi", "broadway", "rfi"],
          actions: [
            {
              action_key: "raise_2.5",
              frequency: 1,
              ev_bb: 0.4,
              size_bb: 2.5,
            },
          ],
        },
      ],
    };

    const pack = convertPreflopSolverImportToStrategyPack(document);

    expect(pack.dataset_version).toBe("import_test_v1");
    expect(pack.entries).toHaveLength(1);
    expect(pack.entries[0].source).toBe("test_import_source");
    expect(pack.entries[0].tags).toEqual(["rfi", "broadway"]);
    expect(pack.entries[0].actions[0]).toMatchObject({
      action_key: "raise_2.5",
      frequency: 1,
      ev_bb: 0.4,
      size_bb: 2.5,
    });
  });

  it("flags duplicate canonical import rows", () => {
    const document: PreflopSolverImportDocument = {
      schema_version: 1,
      import_version: 1,
      dataset_version: "import_dup_v1",
      game: "6max_cash",
      source_solver: "test_solver",
      source_format: "canonical_preflop_import_json",
      source_tree: "dup_tree",
      rows: [
        {
          scenario_key: "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
          line_signature: "facing_open",
          stack_bucket: "100bb",
          hero_position: "BTN",
          hand_key: "A5s",
          hand_resolution: "hand_class",
          actions: [{ action_key: "3bet_7.5", frequency: 1, size_bb: 7.5 }],
        },
        {
          scenario_key: "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
          line_signature: "facing_open",
          stack_bucket: "100bb",
          hero_position: "BTN",
          hand_key: "A5s",
          hand_resolution: "hand_class",
          actions: [{ action_key: "call", frequency: 1 }],
        },
      ],
    };

    const summary = validatePreflopSolverImportDocument(document);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("Duplicate import row"),
        }),
      ]),
    );
  });

  it("flags scenario metadata that is inconsistent with the row fields", () => {
    const document: PreflopSolverImportDocument = {
      schema_version: 1,
      import_version: 1,
      dataset_version: "import_bad_meta_v1",
      game: "6max_cash",
      source_solver: "test_solver",
      source_format: "canonical_preflop_import_json",
      source_tree: "bad_meta_tree",
      rows: [
        {
          scenario_key: "6max_cash_100bb_CO_vs_HJ_open_2.5bb",
          line_signature: "first_in",
          stack_bucket: "100bb",
          hero_position: "BTN",
          hand_key: "KQs",
          hand_resolution: "hand_class",
          actions: [{ action_key: "call", frequency: 1 }],
        },
      ],
    };

    const summary = validatePreflopSolverImportDocument(document);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("hero position CO does not match entry hero position BTN"),
        }),
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("line signature facing_open does not match entry line signature first_in"),
        }),
      ]),
    );
  });

  it("flags invalid import action metadata", () => {
    const document: PreflopSolverImportDocument = {
      schema_version: 1,
      import_version: 1,
      dataset_version: "import_bad_action_v1",
      game: "6max_cash",
      source_solver: "test_solver",
      source_format: "canonical_preflop_import_json",
      source_tree: "bad_action_tree",
      rows: [
        {
          scenario_key: "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
          line_signature: "facing_open",
          stack_bucket: "100bb",
          hero_position: "BTN",
          hand_key: "A5s",
          hand_resolution: "hand_class",
          actions: [
            { action_key: "3bet_7.5", frequency: 1.2, size_bb: -7.5, ev_bb: Number.NaN },
          ],
        },
      ],
    };

    const summary = validatePreflopSolverImportDocument(document);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("invalid frequency"),
        }),
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("invalid ev_bb"),
        }),
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("invalid size_bb"),
        }),
      ]),
    );
  });

  it("flags action families that do not fit the line signature", () => {
    const document: PreflopSolverImportDocument = {
      schema_version: 1,
      import_version: 1,
      dataset_version: "import_bad_semantics_v1",
      game: "6max_cash",
      source_solver: "test_solver",
      source_format: "canonical_preflop_import_json",
      source_tree: "bad_semantics_tree",
      rows: [
        {
          scenario_key: "6max_cash_100bb_CO_first_in",
          line_signature: "first_in",
          stack_bucket: "100bb",
          hero_position: "CO",
          hand_key: "AJo",
          hand_resolution: "hand_class",
          actions: [{ action_key: "call", frequency: 1 }],
        },
      ],
    };

    const summary = validatePreflopSolverImportDocument(document);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("is not valid for line signature first_in"),
        }),
      ]),
    );
  });

  it("flags passive sizing and missing aggressive sizing in canonical imports", () => {
    const document: PreflopSolverImportDocument = {
      schema_version: 1,
      import_version: 1,
      dataset_version: "import_bad_sizing_semantics_v1",
      game: "6max_cash",
      source_solver: "test_solver",
      source_format: "canonical_preflop_import_json",
      source_tree: "bad_sizing_semantics_tree",
      rows: [
        {
          scenario_key: "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
          line_signature: "facing_open",
          stack_bucket: "100bb",
          hero_position: "BTN",
          hand_key: "A5s",
          hand_resolution: "hand_class",
          actions: [
            { action_key: "call", frequency: 0.5, size_bb: 2.5 },
            { action_key: "3bet_7.5bb", frequency: 0.5 },
          ],
        },
      ],
    };

    const summary = validatePreflopSolverImportDocument(document);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("Passive import action call must not include size_bb"),
        }),
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("Aggressive import action 3bet_7.5bb requires size_bb"),
        }),
      ]),
    );
  });

  it("flags inconsistent size_bb for the same action key within one scenario", () => {
    const document: PreflopSolverImportDocument = {
      schema_version: 1,
      import_version: 1,
      dataset_version: "import_inconsistent_sizing_v1",
      game: "6max_cash",
      source_solver: "test_solver",
      source_format: "canonical_preflop_import_json",
      source_tree: "inconsistent_sizing_tree",
      rows: [
        {
          scenario_key: "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
          line_signature: "facing_open",
          stack_bucket: "100bb",
          hero_position: "BTN",
          hand_key: "A5s",
          hand_resolution: "hand_class",
          actions: [{ action_key: "3bet_7.5bb", frequency: 1, size_bb: 7.5 }],
        },
        {
          scenario_key: "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
          line_signature: "facing_open",
          stack_bucket: "100bb",
          hero_position: "BTN",
          hand_key: "KQs",
          hand_resolution: "hand_class",
          actions: [{ action_key: "3bet_7.5bb", frequency: 1, size_bb: 8 }],
        },
      ],
    };

    const summary = validatePreflopSolverImportDocument(document);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("uses inconsistent size_bb within scenario"),
        }),
      ]),
    );
  });

  it("flags inconsistent scenario descriptors across rows with the same scenario key", () => {
    const document: PreflopSolverImportDocument = {
      schema_version: 1,
      import_version: 1,
      dataset_version: "import_inconsistent_scenario_v1",
      game: "6max_cash",
      source_solver: "test_solver",
      source_format: "canonical_preflop_import_json",
      source_tree: "inconsistent_scenario_tree",
      rows: [
        {
          scenario_key: "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
          line_signature: "facing_open",
          stack_bucket: "100bb",
          hero_position: "BTN",
          hand_key: "A5s",
          hand_resolution: "hand_class",
          actions: [{ action_key: "3bet_7.5bb", frequency: 1, size_bb: 7.5 }],
        },
        {
          scenario_key: "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
          line_signature: "facing_open_plus_call",
          stack_bucket: "100bb",
          hero_position: "SB",
          hand_key: "KQs",
          hand_resolution: "hand_class",
          actions: [{ action_key: "call", frequency: 1 }],
        },
      ],
    };

    const summary = validatePreflopSolverImportDocument(document);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("uses inconsistent line_signature across rows"),
        }),
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("uses inconsistent hero_position across rows"),
        }),
      ]),
    );
  });

  it("flags source_tree stack-bucket hints that do not match row metadata", () => {
    const document: PreflopSolverImportDocument = {
      schema_version: 1,
      import_version: 1,
      dataset_version: "import_bad_tree_stack_v1",
      game: "6max_cash",
      source_solver: "test_solver",
      source_format: "canonical_preflop_import_json",
      source_tree: "6max_cash_40bb_btn_open_tree",
      rows: [
        {
          scenario_key: "6max_cash_100bb_BTN_first_in",
          line_signature: "first_in",
          stack_bucket: "100bb",
          hero_position: "BTN",
          hand_key: "AJo",
          hand_resolution: "hand_class",
          actions: [{ action_key: "raise_2.5", frequency: 1, size_bb: 2.5 }],
        },
      ],
    };

    const summary = validatePreflopSolverImportDocument(document);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("does not match source_tree stack hint 40bb"),
        }),
      ]),
    );
  });

  it("flags source_tree open-size hints that do not match scenario keys", () => {
    const document: PreflopSolverImportDocument = {
      schema_version: 1,
      import_version: 1,
      dataset_version: "import_bad_tree_open_v1",
      game: "6max_cash",
      source_solver: "test_solver",
      source_format: "canonical_preflop_import_json",
      source_tree: "6max_cash_100bb_btn_vs_co_open_3.0_tree",
      rows: [
        {
          scenario_key: "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
          line_signature: "facing_open",
          stack_bucket: "100bb",
          hero_position: "BTN",
          hand_key: "A5s",
          hand_resolution: "hand_class",
          actions: [{ action_key: "3bet_7.5bb", frequency: 1, size_bb: 7.5 }],
        },
      ],
    };

    const summary = validatePreflopSolverImportDocument(document);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("does not match source_tree open-size hint 3"),
        }),
      ]),
    );
  });
});
