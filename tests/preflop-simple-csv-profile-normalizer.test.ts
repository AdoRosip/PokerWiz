import { describe, expect, it } from "vitest";

import {
  normalizeSimpleCsvProfileToCanonicalImport,
  parseSimpleCsvProfile,
  validatePreflopSimpleCsvProfileDocument,
} from "../tools/solver-import/normalize-simple-csv-profile";

describe("preflop simple csv profile normalizer", () => {
  it("normalizes the named simple csv profile into the canonical import contract", () => {
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
        "action_1_key",
        "action_1_freq",
        "action_1_ev_bb",
        "action_1_size_bb",
        "action_2_key",
        "action_2_freq",
        "action_2_ev_bb",
        "action_2_size_bb",
      ].join(","),
      [
        "simple_profile_test_v1",
        "6max_cash",
        "test_solver",
        "simple_csv_profile_v1",
        "6max_cash_100bb_simple_profile_tree",
        "simple_profile_source",
        "6max_cash_100bb_BTN_vs_CO_open_2.5bb",
        "facing_open",
        "100bb",
        "BTN",
        "A5s",
        "hand_class",
        "single_open|solver_bluff",
        "3bet_7.5bb",
        "0.82",
        "0.31",
        "7.5",
        "call",
        "0.18",
        "0.14",
        "",
      ].join(","),
    ].join("\n");

    const document = parseSimpleCsvProfile(raw);
    const canonical = normalizeSimpleCsvProfileToCanonicalImport(document);

    expect(canonical.dataset_version).toBe("simple_profile_test_v1");
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

  it("flags rows with no populated action slots", () => {
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
      ].join(","),
      [
        "simple_profile_bad_v1",
        "6max_cash",
        "test_solver",
        "simple_csv_profile_v1",
        "bad_tree",
        "6max_cash_100bb_CO_first_in",
        "first_in",
        "100bb",
        "CO",
        "AJo",
        "hand_class",
      ].join(","),
    ].join("\n");

    const document = parseSimpleCsvProfile(raw);
    const summary = validatePreflopSimpleCsvProfileDocument(document);

    expect(summary.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: "error",
          message: expect.stringContaining("contains no action slots with data"),
        }),
      ]),
    );
  });
});
