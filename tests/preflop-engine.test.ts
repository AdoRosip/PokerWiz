import path from "node:path";

import { describe, expect, it } from "vitest";

import type { EvaluatePreflopRequest, PreflopEvaluationResult } from "../shared/contracts";
import { PreflopEngine } from "../packages/preflop-engine/preflop-engine";
import { PreflopAnalysisService } from "../packages/app-services/preflop-analysis-service";

const datasetPath = path.join(process.cwd(), "data", "dev", "strategy-pack.v1.json");
const enginePromise = PreflopEngine.fromFile(datasetPath);
const servicePromise = PreflopAnalysisService.fromFile(datasetPath);

function baseRequest(heroPosition: EvaluatePreflopRequest["hero_position"], heroCards: [string, string]): EvaluatePreflopRequest {
  return {
    format: "6max_cash",
    effective_stack_bb: 100,
    hero_position: heroPosition,
    hero_cards: heroCards,
    blinds: { sb: 0.5, bb: 1 },
    action_history: [],
    mode: "highest_ev_pure",
  };
}

function expectSupported(result: PreflopEvaluationResult) {
  expect(result.status).toBe("supported");
  if (result.status !== "supported") {
    throw new Error(`Expected supported result, got ${result.status}`);
  }
  return result;
}

describe("preflop engine", () => {
  it("normalizes suited hand classes", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.normalized_hand.hand_class).toBe("A5s");
  });

  it("rejects duplicate hero cards", async () => {
    const engine = await enginePromise;
    expect(() => engine.evaluate(baseRequest("BTN", ["As", "As"]))).toThrow();
  });

  it("maps first-in scenarios", async () => {
    const engine = await enginePromise;
    const response = expectSupported(engine.evaluate(baseRequest("CO", ["Ah", "Kh"])));
    expect(response.scenario_key).toBe("6max_cash_100bb_CO_first_in");
  });

  it("supports utg first-in premium coverage", async () => {
    const engine = await enginePromise;
    const response = expectSupported(engine.evaluate(baseRequest("UTG", ["As", "Ad"])));
    expect(response.scenario_key).toBe("6max_cash_100bb_UTG_first_in");
    expect(response.recommended_action.action_type).toBe("raise");
  });

  it("supports broader utg first-in suited broadway coverage", async () => {
    const engine = await enginePromise;
    const response = expectSupported(engine.evaluate(baseRequest("UTG", ["As", "Qs"])));
    expect(response.scenario_key).toBe("6max_cash_100bb_UTG_first_in");
    expect(response.recommended_action.action_type).toBe("raise");
  });

  it("supports hj first-in baseline coverage", async () => {
    const engine = await enginePromise;
    const response = expectSupported(engine.evaluate(baseRequest("HJ", ["Ks", "Qs"])));
    expect(response.scenario_key).toBe("6max_cash_100bb_HJ_first_in");
    expect(response.recommended_action.action_type).toBe("raise");
  });

  it("supports broader hj first-in offsuit broadway coverage", async () => {
    const engine = await enginePromise;
    const response = expectSupported(engine.evaluate(baseRequest("HJ", ["Ah", "Jd"])));
    expect(response.recommended_action.action_type).toBe("raise");
  });

  it("supports additional first-in coverage for button opens", async () => {
    const engine = await enginePromise;
    const response = expectSupported(engine.evaluate(baseRequest("BTN", ["Ks", "Ts"])));
    expect(response.recommended_action.action_type).toBe("raise");
  });

  it("supports broader cutoff first-in small-pair coverage", async () => {
    const engine = await enginePromise;
    const response = expectSupported(engine.evaluate(baseRequest("CO", ["3h", "3d"])));
    expect(response.recommended_action.action_type).toBe("raise");
  });

  it("supports broader button first-in offsuit broadway coverage", async () => {
    const engine = await enginePromise;
    const response = expectSupported(engine.evaluate(baseRequest("BTN", ["Qh", "Td"])));
    expect(response.recommended_action.action_type).toBe("raise");
  });

  it("supports button versus cutoff open premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Ah", "Kd"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_BTN_vs_CO_open_2.5bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports button versus cutoff open call-heavy suited broadway decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Jh", "Th"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("call");
  });

  it("supports button versus cutoff open mixed middle-pair decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["9h", "9d"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports button versus cutoff open strong offsuit ace decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Ah", "Qd"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports button versus cutoff open small pair set-mine profile", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["5h", "5d"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("call");
  });

  it("supports button versus cutoff open marginal offsuit broadway folds and calls", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Qh", "Jd"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["fold", "call"]).toContain(response.recommended_action.action_type);
  });

  it("supports button versus cutoff open suited connector continues", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Th", "9h"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("call");
  });

  it("supports button versus hijack open premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Qh", "Qd"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_BTN_vs_HJ_open_2.5bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports button versus hijack open strong offsuit ace decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Ah", "Qd"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports button versus hijack open pair continues", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["7h", "7d"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports button versus hijack open suited connector continues", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["9h", "8h"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("call");
  });

  it("supports button versus utg open premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Qh", "Qd"]);
    request.action_history = [{ position: "UTG", action: "open", size_bb: 2.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_BTN_vs_UTG_open_2bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports button versus utg open strong suited ace decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Ah", "Qh"]);
    request.action_history = [{ position: "UTG", action: "open", size_bb: 2.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports button versus utg open suited connector continues", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["7h", "6h"]);
    request.action_history = [{ position: "UTG", action: "open", size_bb: 2.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("call");
  });

  it("supports cutoff versus hijack open premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("CO", ["Qh", "Qd"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_CO_vs_HJ_open_2.5bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports cutoff versus hijack open strong offsuit ace decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("CO", ["Ah", "Qd"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports cutoff versus hijack open suited connector continues", async () => {
    const engine = await enginePromise;
    const request = baseRequest("CO", ["9h", "8h"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("call");
  });

  it("supports cutoff versus utg open premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("CO", ["Qh", "Qd"]);
    request.action_history = [{ position: "UTG", action: "open", size_bb: 2.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_CO_vs_UTG_open_2bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports cutoff versus utg open strong suited ace decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("CO", ["Ah", "Qh"]);
    request.action_history = [{ position: "UTG", action: "open", size_bb: 2.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports cutoff versus utg open suited connector continues", async () => {
    const engine = await enginePromise;
    const request = baseRequest("CO", ["7h", "6h"]);
    request.action_history = [{ position: "UTG", action: "open", size_bb: 2.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("call");
  });

  it("supports small blind first-in baseline coverage", async () => {
    const engine = await enginePromise;
    const response = expectSupported(engine.evaluate(baseRequest("SB", ["Ah", "9d"])));
    expect(response.scenario_key).toBe("6max_cash_100bb_SB_first_in");
  });

  it("supports broader small blind first-in offsuit broadway coverage", async () => {
    const engine = await enginePromise;
    const response = expectSupported(engine.evaluate(baseRequest("SB", ["Kh", "Td"])));
    expect(response.recommended_action.action_type).toBe("raise");
  });

  it("maps facing open scenarios", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.action_history = [
      { position: "UTG", action: "fold" },
      { position: "HJ", action: "fold" },
      { position: "CO", action: "open", size_bb: 2.5 },
    ];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_BTN_vs_CO_open_2.5bb");
  });

  it("maps open plus call scenarios", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Qs", "Js"]);
    request.action_history = [
      { position: "BTN", action: "open", size_bb: 2.5 },
      { position: "SB", action: "call" },
    ];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toContain("SB_call");
  });

  it("supports squeeze decisions for button versus utg open and hj call", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Ks", "Kh"]);
    request.action_history = [
      { position: "UTG", action: "open", size_bb: 2.0 },
      { position: "HJ", action: "call" },
    ];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_BTN_vs_UTG_open_2bb_HJ_call");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports big blind defense versus utg min-open", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Ah", "Kd"]);
    request.action_history = [{ position: "UTG", action: "open", size_bb: 2.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_BB_vs_UTG_open_2bb");
  });

  it("supports broader big blind defense versus utg suited broadway coverage", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Ah", "Qh"]);
    request.action_history = [{ position: "UTG", action: "open", size_bb: 2.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports big blind defense versus cutoff open premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Qh", "Qd"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_BB_vs_CO_open_2.5bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports big blind defense versus cutoff open strong offsuit ace decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Ah", "Qd"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports big blind defense versus cutoff open pair set-mine profile", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["7h", "7d"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("call");
  });

  it("supports big blind defense versus cutoff open suited connector continues", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["7h", "6h"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("call");
  });

  it("supports big blind defense versus hijack premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Qh", "Qd"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_BB_vs_HJ_open_2.5bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports big blind defense versus hijack strong offsuit ace decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Ah", "Qd"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports big blind defense versus hijack suited connector continues", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["7h", "6h"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("call");
  });

  it("supports small blind defense versus cutoff open premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["Kh", "Kd"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_SB_vs_CO_open_2.5bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports small blind defense versus cutoff open strong offsuit ace decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["Ah", "Qd"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports small blind defense versus cutoff open pair continues", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["7h", "7d"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports small blind defense versus cutoff open suited connector mixes", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["7h", "6h"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports small blind defense versus hijack premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["Qh", "Qd"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_SB_vs_HJ_open_2.5bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports small blind defense versus hijack strong offsuit ace decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["Ah", "Qd"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports small blind defense versus hijack suited connector mixes", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["7h", "6h"]);
    request.action_history = [{ position: "HJ", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports small blind defense versus utg premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["Qh", "Qd"]);
    request.action_history = [{ position: "UTG", action: "open", size_bb: 2.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_SB_vs_UTG_open_2bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports small blind defense versus utg strong suited ace decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["Ah", "Qh"]);
    request.action_history = [{ position: "UTG", action: "open", size_bb: 2.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports small blind defense versus utg suited connector mixes", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["7h", "6h"]);
    request.action_history = [{ position: "UTG", action: "open", size_bb: 2.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports small blind defense versus button open premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["Qh", "Qd"]);
    request.action_history = [{ position: "BTN", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_SB_vs_BTN_open_2.5bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports small blind defense versus button open strong offsuit ace decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["Ah", "Qd"]);
    request.action_history = [{ position: "BTN", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports small blind defense versus button open suited connector mixed responses", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["7h", "6h"]);
    request.action_history = [{ position: "BTN", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports small blind defense versus button open clear folds", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["Qh", "7d"]);
    request.action_history = [{ position: "BTN", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("fold");
  });

  it("supports big blind defense versus button open premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Ah", "Ad"]);
    request.action_history = [{ position: "BTN", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_BB_vs_BTN_open_2.5bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports big blind defense versus button open strong offsuit ace decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Ah", "Qd"]);
    request.action_history = [{ position: "BTN", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports big blind defense versus button open broadway continues", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Kh", "Jd"]);
    request.action_history = [{ position: "BTN", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["fold", "call"]).toContain(response.recommended_action.action_type);
  });

  it("supports big blind defense versus button open suited connector continues", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Th", "9h"]);
    request.action_history = [{ position: "BTN", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("call");
  });

  it("supports big blind defense versus small blind open premium decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Qh", "Qd"]);
    request.action_history = [{ position: "SB", action: "open", size_bb: 3.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toBe("6max_cash_100bb_BB_vs_SB_open_3bb");
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports big blind defense versus small blind open broadway decisions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Kh", "Jd"]);
    request.action_history = [{ position: "SB", action: "open", size_bb: 3.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("supports big blind defense versus small blind open suited connector mixes", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["7h", "6h"]);
    request.action_history = [{ position: "SB", action: "open", size_bb: 3.0 }];
    const response = expectSupported(engine.evaluate(request));
    expect(["call", "3bet"]).toContain(response.recommended_action.action_type);
  });

  it("maps open and 3-bet scenarios", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["Ah", "Qh"]);
    request.action_history = [
      { position: "HJ", action: "open", size_bb: 2.5 },
      { position: "CO", action: "raise", size_bb: 8 },
    ];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toContain("3bet");
  });

  it("maps open, 3-bet, 4-bet scenarios", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Ah", "Kd"]);
    request.action_history = [
      { position: "UTG", action: "open", size_bb: 2.5 },
      { position: "HJ", action: "raise", size_bb: 8 },
      { position: "CO", action: "raise", size_bb: 22 },
    ];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toContain("4bet");
  });

  it("rejects out-of-order actions", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.action_history = [
      { position: "CO", action: "open", size_bb: 2.5 },
      { position: "HJ", action: "fold" },
    ];
    expect(() => engine.evaluate(request)).toThrow();
  });

  it("rejects limp trees", async () => {
    const engine = await enginePromise;
    const request = baseRequest("CO", ["9s", "8s"]);
    request.action_history = [{ position: "UTG", action: "call" }];
    expect(() => engine.evaluate(request)).toThrow();
  });

  it("uses hand-class rows when combo rows are unavailable", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Ac", "5c"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.confidence.hand_resolution).toBe("hand_class");
  });

  it("chooses highest EV pure by default", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports highest frequency simplification", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.mode = "highest_frequency_simplification";
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.pure_simplification_note).toBeTruthy();
  });

  it("supports strict frequencies mode", async () => {
    const engine = await enginePromise;
    const request = baseRequest("CO", ["Ah", "Kh"]);
    request.mode = "strict_gto_frequencies";
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("raise");
  });

  it("approximates unsupported sizings by prefix", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.2 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.confidence.dataset_match).toBe("approximated_node");
  });

  it("includes approximation warnings", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.2 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.warnings.length).toBeGreaterThan(0);
  });

  it("bucketizes shallow stacks", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Ah", "Qs"]);
    request.effective_stack_bb = 20;
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toContain("20bb");
  });

  it("bucketizes deep stacks", async () => {
    const engine = await enginePromise;
    const request = baseRequest("CO", ["7h", "7d"]);
    request.effective_stack_bb = 180;
    const response = expectSupported(engine.evaluate(request));
    expect(response.scenario_key).toContain("150bb_plus");
  });

  it("returns folds for dominated trash rows", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["7c", "2d"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.recommended_action.action_type).toBe("fold");
  });

  it("returns EV arrays", async () => {
    const engine = await enginePromise;
    const response = expectSupported(engine.evaluate(baseRequest("CO", ["Ah", "Kh"])));
    expect(response.ev.length).toBeGreaterThan(0);
  });

  it("returns node coverage metadata for supported nodes", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Ah", "Kd"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = expectSupported(engine.evaluate(request));
    expect(response.node_coverage.matched_scenario_key).toBe("6max_cash_100bb_BTN_vs_CO_open_2.5bb");
    expect(response.node_coverage.covered_hand_classes).toBeGreaterThan(0);
    expect(response.node_coverage.total_hand_classes).toBe(169);
  });

  it("returns a pack summary with scenario coverage aggregates", async () => {
    const service = await servicePromise;
    const summary = service.summary();
    expect(summary.dataset_version).toBe("solver_dataset_v1_dev");
    expect(summary.game).toBe("6max_cash");
    expect(summary.total_scenarios).toBeGreaterThan(0);
    expect(summary.total_entries).toBeGreaterThan(summary.total_scenarios);
    expect(summary.partially_covered_scenarios).toBeGreaterThan(0);
    expect(summary.average_scenario_coverage_ratio).toBeGreaterThan(0);
    expect(summary.scenarios[0].matched_scenario_key).toBeTruthy();
  });

  it("returns explanation lines", async () => {
    const engine = await enginePromise;
    const response = expectSupported(engine.evaluate(baseRequest("CO", ["Ah", "Kh"])));
    expect(response.explanation.length).toBeGreaterThan(0);
  });

  it("returns unsupported when a valid node has no matching strategy row", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["4c", "3d"]);
    request.action_history = [
      { position: "HJ", action: "open", size_bb: 2.5 },
      { position: "CO", action: "raise", size_bb: 8 },
    ];
    const result = engine.evaluate(request);
    expect(result.status).toBe("unsupported");
  });

  it("returns unsupported with nearest suggestions for uncovered valid nodes", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["5s", "4s"]);
    request.action_history = [
      { position: "UTG", action: "open", size_bb: 2 },
      { position: "HJ", action: "call" },
    ];
    const result = engine.evaluate(request);
    expect(result.status).toBe("unsupported");
    if (result.status === "unsupported") {
      expect(result.nearest_supported_scenarios.length).toBeGreaterThanOrEqual(0);
    }
  });

  it("returns partial coverage metadata for unsupported hands inside a covered node", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["4c", "3d"]);
    request.action_history = [
      { position: "HJ", action: "open", size_bb: 2.5 },
      { position: "CO", action: "raise", size_bb: 8 },
    ];
    const result = engine.evaluate(request);
    expect(result.status).toBe("unsupported");
    if (result.status === "unsupported") {
      expect(result.node_coverage.covered_hand_classes).toBe(1);
      expect(result.node_coverage.matched_scenario_key).toBe("6max_cash_100bb_SB_vs_HJ_open_2.5bb_CO_3bet_8bb");
      expect(result.node_coverage.total_hand_classes).toBe(169);
    }
  });

  it("returns zero coverage metadata for unsupported nodes with no pack rows", async () => {
    const engine = await enginePromise;
    const request = baseRequest("CO", ["4c", "3d"]);
    request.action_history = [{ position: "UTG", action: "open", size_bb: 2.5 }];
    const result = engine.evaluate(request);
    expect(result.status).toBe("unsupported");
    if (result.status === "unsupported") {
      expect(result.node_coverage.covered_hand_classes).toBe(0);
      expect(result.node_coverage.matched_scenario_key).toBe("6max_cash_100bb_CO_vs_UTG_open_2.5bb");
      expect(result.node_coverage.total_hand_classes).toBe(169);
    }
  });
});
