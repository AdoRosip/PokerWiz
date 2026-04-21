import type {
  EvaluatePreflopResponse,
  HeroActionRecommendation,
  HeroActionType,
  Mode,
  StrategyAction,
  StrategyLookupResult,
} from "../shared/contracts";

function parseRecommendation(action: StrategyAction): HeroActionRecommendation {
  const key = action.action_key.toLowerCase();
  let actionType: HeroActionType;
  if (key.startsWith("fold")) {
    actionType = "fold";
  } else if (key.startsWith("call")) {
    actionType = "call";
  } else if (key.startsWith("5bet_jam")) {
    actionType = "5bet_jam";
  } else if (key.startsWith("4bet")) {
    actionType = "4bet";
  } else if (key.startsWith("3bet")) {
    actionType = "3bet";
  } else {
    actionType = "raise";
  }

  const parsedSize =
    action.size_bb ??
    (() => {
      const lastToken = key.split("_").at(-1);
      return lastToken?.endsWith("bb") ? Number(lastToken.slice(0, -2)) : undefined;
    })();

  return {
    action_type: actionType,
    size_bb: Number.isFinite(parsedSize) ? parsedSize : undefined,
  };
}

export class DecisionService {
  select(mode: Mode, lookup: StrategyLookupResult, handIdentity: EvaluatePreflopResponse["normalized_hand"]): EvaluatePreflopResponse {
    const actions = lookup.entry.actions;
    if (actions.length === 0) {
      throw new Error("Strategy entry contained no actions");
    }

    let selected = actions[0];
    if (mode === "highest_ev_pure") {
      selected = [...actions].sort((left, right) => (right.ev_bb ?? 0) - (left.ev_bb ?? 0))[0];
    } else {
      selected = [...actions].sort((left, right) => right.frequency - left.frequency)[0];
    }

    const recommendedAction = parseRecommendation(selected);
    if (mode === "highest_ev_pure") {
      recommendedAction.pure_simplification_note = "Highest-EV pure action selected";
    } else if (mode === "highest_frequency_simplification" && selected.frequency < 0.95) {
      recommendedAction.pure_simplification_note =
        `Pure simplification chosen from a mixed strategy; highest frequency action was ${Math.round(selected.frequency * 100)}%`;
    }

    return {
      status: "supported",
      scenario_key: lookup.entry.scenario_key,
      normalized_hand: handIdentity,
      recommended_action: recommendedAction,
      strategy_mix: actions.map((action) => ({
        action_key: action.action_key,
        frequency: action.frequency,
      })),
      ev: actions.map((action) => ({
        action_key: action.action_key,
        ev_bb: action.ev_bb ?? 0,
      })),
      confidence: {
        dataset_match: lookup.dataset_match,
        hand_resolution: lookup.entry.hand_resolution,
        source: lookup.entry.source,
      },
      explanation: [],
      warnings: lookup.warnings,
    };
  }
}
