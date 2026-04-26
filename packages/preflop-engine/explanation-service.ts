import type { EvaluatePreflopResponse, NormalizedRequest, ScenarioDescriptor } from "../../shared/contracts";

export class ExplanationService {
  build(normalized: NormalizedRequest, scenario: ScenarioDescriptor, response: EvaluatePreflopResponse): string[] {
    const topAction = [...response.strategy_mix].sort((left, right) => right.frequency - left.frequency)[0];
    const topFrequency = topAction ? Math.round(topAction.frequency * 100) : 0;
    const lines = [
      `Context note: ${normalized.hand_identity.combo} is normalized to ${normalized.hand_identity.hand_class} for pack lookup.`,
    ];

    if (scenario.line_signature === "first_in") {
      lines.push(
        `Context note: this is an unopened node from ${normalized.hero_position}, so the hand is being compared against the first-in range for the ${scenario.stack_bucket} abstraction.`,
      );
    } else if (scenario.line_signature === "facing_open") {
      lines.push(
        `Context note: this is a single-open decision from ${normalized.hero_position}; price, position, and stack depth drive the continue mix.`,
      );
    } else if (scenario.line_signature === "facing_open_plus_call") {
      lines.push("Context note: a cold caller is already in the pot, so the strategy weighs squeeze pressure against multiway equity realization.");
    } else if (scenario.line_signature === "facing_open_and_3bet") {
      lines.push("Context note: this is already a 3-bet node, so continuing ranges are narrower and blocker effects matter more than in single-open pots.");
    } else {
      lines.push("Context note: this is a 4-bet decision node, so the available range is heavily compressed around premiums and selected bluff candidates.");
    }

    lines.push(
      `Mix note: the highest-frequency action in this node is ${topAction?.action_key ?? response.recommended_action.action_type} at roughly ${topFrequency}%.`,
    );

    if (
      normalized.hand_identity.hand_class.startsWith("A") &&
      normalized.hand_identity.hand_class.endsWith("s") &&
      response.recommended_action.action_type !== "fold"
    ) {
      lines.push("Context note: suited ace classes can combine blocker effects with postflop playability, but the exact weight still comes from the pack frequencies shown here.");
    }

    if (
      response.recommended_action.action_type === "3bet" ||
      response.recommended_action.action_type === "4bet" ||
      response.recommended_action.action_type === "5bet_jam"
    ) {
      lines.push("Interpretation note: the current pack favors an aggressive branch here, so fold equity and range leverage outperform passive realization in this abstraction.");
    } else if (response.recommended_action.action_type === "call") {
      lines.push("Interpretation note: the current pack prefers realizing equity at the offered price instead of inflating the pot immediately.");
    } else if (response.recommended_action.action_type === "fold") {
      lines.push("Interpretation note: this hand class sits below the continue threshold once the current position, stack depth, and action sequence are combined.");
    } else {
      lines.push("Interpretation note: this hand class is inside the active opening region for this node and is strong enough to build the pot immediately.");
    }

    if (response.confidence.dataset_match === "approximated_node") {
      lines.push("Fidelity note: the exact node was unavailable, so this result uses the nearest supported abstraction and should be treated as approximate.");
    }

    return lines;
  }
}
