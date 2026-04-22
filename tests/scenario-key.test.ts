import { describe, expect, it } from "vitest";

import {
  parseScenarioKey,
  scenarioApproximationSignature,
  validateScenarioKeyAgainstEntry,
} from "../packages/game-domain";

describe("scenario key semantics", () => {
  it("parses canonical facing-open-plus-call keys", () => {
    const parsed = parseScenarioKey("6max_cash_100bb_BTN_vs_UTG_open_2bb_HJ_call");
    expect(parsed).toMatchObject({
      stack_bucket: "100bb",
      hero_position: "BTN",
      line_signature: "facing_open_plus_call",
      open_position: "UTG",
      open_size_bb: 2,
      caller_position: "HJ",
    });
  });

  it("builds approximation signatures for facing-open keys", () => {
    const signature = scenarioApproximationSignature("6max_cash_100bb_BTN_vs_CO_open_2.5bb");
    expect(signature).toEqual({
      prefix: "6max_cash_100bb_BTN_vs_CO",
      open_size_bb: 2.5,
      has_call_suffix: false,
      line_suffix: "",
    });
  });

  it("flags mismatched scenario metadata against an entry", () => {
    const issues = validateScenarioKeyAgainstEntry({
      scenario_key: "6max_cash_100bb_CO_vs_HJ_open_2.5bb",
      stack_bucket: "100bb",
      hero_position: "BTN",
      line_signature: "facing_open_plus_call",
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.stringContaining("hero position CO does not match entry hero position BTN"),
        expect.stringContaining("line signature facing_open does not match entry line signature facing_open_plus_call"),
      ]),
    );
  });
});
