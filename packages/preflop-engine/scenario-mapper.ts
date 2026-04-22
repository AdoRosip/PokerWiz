import type { NormalizedRequest, ScenarioDescriptor } from "../../shared/contracts";
import { formatBb } from "../game-domain";

const AGGRESSIVE_ACTIONS = new Set(["open", "raise", "all_in"]);

export class ScenarioMapper {
  map(request: NormalizedRequest): ScenarioDescriptor {
    const aggressive = request.action_history.filter((entry) => AGGRESSIVE_ACTIONS.has(entry.action));
    const callers = request.action_history.filter((entry) => entry.action === "call");
    const warnings: string[] = [];
    const prefix = `6max_cash_${request.stack_bucket}_${request.hero_position}`;

    if (aggressive.length === 0) {
      return {
        scenario_key: `${prefix}_first_in`,
        line_signature: "first_in",
        hero_position: request.hero_position,
        stack_bucket: request.stack_bucket,
        facing_raise_level: 0,
        has_cold_call: false,
        warnings,
      };
    }

    if (aggressive.length === 1) {
      const open = aggressive[0];
      const openSize = open.size_bb ?? 2.5;
      let scenarioKey = `${prefix}_vs_${open.position}_open_${formatBb(openSize)}`;
      if (callers.length > 1) {
        throw new Error("Unsupported action tree: more than one cold caller before hero is unsupported in v1");
      }
      if (callers.length === 1) {
        scenarioKey += `_${callers[0].position}_call`;
        warnings.push("Approximating multiway pressure with a single-caller abstraction");
      }
      return {
        scenario_key: scenarioKey,
        line_signature: callers.length === 0 ? "facing_open" : "facing_open_plus_call",
        hero_position: request.hero_position,
        stack_bucket: request.stack_bucket,
        open_size_bb: openSize,
        facing_raise_level: 1,
        has_cold_call: callers.length > 0,
        warnings,
      };
    }

    if (aggressive.length === 2) {
      const [open, threeBet] = aggressive;
      return {
        scenario_key: `${prefix}_vs_${open.position}_open_${formatBb(open.size_bb ?? 2.5)}_${threeBet.position}_3bet_${formatBb(threeBet.size_bb ?? 8)}`,
        line_signature: "facing_open_and_3bet",
        hero_position: request.hero_position,
        stack_bucket: request.stack_bucket,
        open_size_bb: open.size_bb,
        facing_raise_level: 2,
        has_cold_call: callers.length > 0,
        warnings,
      };
    }

    if (aggressive.length === 3) {
      const [open, threeBet, fourBet] = aggressive;
      return {
        scenario_key: `${prefix}_vs_${open.position}_open_${formatBb(open.size_bb ?? 2.5)}_${threeBet.position}_3bet_${formatBb(threeBet.size_bb ?? 8)}_${fourBet.position}_4bet_${formatBb(fourBet.size_bb ?? 22)}`,
        line_signature: "facing_open_3bet_4bet",
        hero_position: request.hero_position,
        stack_bucket: request.stack_bucket,
        open_size_bb: open.size_bb,
        facing_raise_level: 3,
        has_cold_call: callers.length > 0,
        warnings,
      };
    }

    throw new Error("Unsupported action tree: five-bet and deeper branches are not yet mapped in v1");
  }
}
