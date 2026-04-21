import path from "node:path";

import { describe, expect, it } from "vitest";

import type { EvaluatePreflopRequest } from "../shared/contracts";
import { PreflopEngine } from "../preflop-engine/preflop-engine";

const datasetPath = path.join(process.cwd(), "data", "dev", "strategy-pack.v1.json");
const enginePromise = PreflopEngine.fromFile(datasetPath);

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

describe("preflop engine", () => {
  it("normalizes suited hand classes", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = engine.evaluate(request);
    expect(response.normalized_hand.hand_class).toBe("A5s");
  });

  it("rejects duplicate hero cards", async () => {
    const engine = await enginePromise;
    expect(() => engine.evaluate(baseRequest("BTN", ["As", "As"]))).toThrow();
  });

  it("maps first-in scenarios", async () => {
    const engine = await enginePromise;
    const response = engine.evaluate(baseRequest("CO", ["Ah", "Kh"]));
    expect(response.scenario_key).toBe("6max_cash_100bb_CO_first_in");
  });

  it("maps facing open scenarios", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.action_history = [
      { position: "UTG", action: "fold" },
      { position: "HJ", action: "fold" },
      { position: "CO", action: "open", size_bb: 2.5 },
    ];
    const response = engine.evaluate(request);
    expect(response.scenario_key).toBe("6max_cash_100bb_BTN_vs_CO_open_2.5bb");
  });

  it("maps open plus call scenarios", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BB", ["Qs", "Js"]);
    request.action_history = [
      { position: "BTN", action: "open", size_bb: 2.5 },
      { position: "SB", action: "call" },
    ];
    const response = engine.evaluate(request);
    expect(response.scenario_key).toContain("SB_call");
  });

  it("maps open and 3-bet scenarios", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["Ah", "Qh"]);
    request.action_history = [
      { position: "HJ", action: "open", size_bb: 2.5 },
      { position: "CO", action: "raise", size_bb: 8 },
    ];
    const response = engine.evaluate(request);
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
    const response = engine.evaluate(request);
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
    const response = engine.evaluate(request);
    expect(response.confidence.hand_resolution).toBe("hand_class");
  });

  it("chooses highest EV pure by default", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = engine.evaluate(request);
    expect(response.recommended_action.action_type).toBe("3bet");
  });

  it("supports highest frequency simplification", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.mode = "highest_frequency_simplification";
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = engine.evaluate(request);
    expect(response.recommended_action.pure_simplification_note).toBeTruthy();
  });

  it("supports strict frequencies mode", async () => {
    const engine = await enginePromise;
    const request = baseRequest("CO", ["Ah", "Kh"]);
    request.mode = "strict_gto_frequencies";
    const response = engine.evaluate(request);
    expect(response.recommended_action.action_type).toBe("raise");
  });

  it("approximates unsupported sizings by prefix", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.2 }];
    const response = engine.evaluate(request);
    expect(response.confidence.dataset_match).toBe("approximated_node");
  });

  it("includes approximation warnings", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["As", "5s"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.2 }];
    const response = engine.evaluate(request);
    expect(response.warnings.length).toBeGreaterThan(0);
  });

  it("bucketizes shallow stacks", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["Ah", "Qs"]);
    request.effective_stack_bb = 20;
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = engine.evaluate(request);
    expect(response.scenario_key).toContain("20bb");
  });

  it("bucketizes deep stacks", async () => {
    const engine = await enginePromise;
    const request = baseRequest("CO", ["7h", "7d"]);
    request.effective_stack_bb = 180;
    const response = engine.evaluate(request);
    expect(response.scenario_key).toContain("150bb_plus");
  });

  it("returns folds for dominated trash rows", async () => {
    const engine = await enginePromise;
    const request = baseRequest("BTN", ["7c", "2d"]);
    request.action_history = [{ position: "CO", action: "open", size_bb: 2.5 }];
    const response = engine.evaluate(request);
    expect(response.recommended_action.action_type).toBe("fold");
  });

  it("returns EV arrays", async () => {
    const engine = await enginePromise;
    const response = engine.evaluate(baseRequest("CO", ["Ah", "Kh"]));
    expect(response.ev.length).toBeGreaterThan(0);
  });

  it("returns explanation lines", async () => {
    const engine = await enginePromise;
    const response = engine.evaluate(baseRequest("CO", ["Ah", "Kh"]));
    expect(response.explanation.length).toBeGreaterThan(0);
  });

  it("errors when a supported node has no matching hand row", async () => {
    const engine = await enginePromise;
    const request = baseRequest("SB", ["4c", "3d"]);
    request.action_history = [
      { position: "HJ", action: "open", size_bb: 2.5 },
      { position: "CO", action: "raise", size_bb: 8 },
    ];
    expect(() => engine.evaluate(request)).toThrow();
  });
});
