import type { EvaluatePreflopResponse, NormalizedRequest, ScenarioDescriptor } from "../../shared/contracts";

export class ExplanationService {
  build(normalized: NormalizedRequest, scenario: ScenarioDescriptor, response: EvaluatePreflopResponse): string[] {
    const lines = [
      `${normalized.hand_identity.combo} is normalized to ${normalized.hand_identity.hand_class} for strategy lookup.`,
    ];

    if (scenario.line_signature === "first_in") {
      lines.push(
        `This is an unopened node from ${normalized.hero_position}, so the engine is comparing the hand against the first-in opening range for ${scenario.stack_bucket}.`,
      );
    } else if (scenario.line_signature === "facing_open") {
      lines.push(
        `You are facing a single open before acting from ${normalized.hero_position}; position, price, and stack depth determine whether the hand prefers folding, flatting, or reraising.`,
      );
    } else if (scenario.line_signature === "facing_open_plus_call") {
      lines.push("A cold caller is already in the pot, so squeeze incentives and equity realization both matter.");
    } else if (scenario.line_signature === "facing_open_and_3bet") {
      lines.push("This is already a 3-bet node, so continuing ranges are narrower and blocker value matters more.");
    } else {
      lines.push("This is a 4-bet decision node, so the range is heavily compressed around premiums and selected blocker-driven bluffs.");
    }

    if (normalized.hand_identity.hand_class.startsWith("A") && normalized.hand_identity.hand_class.endsWith("s")) {
      lines.push("Suited ace holdings gain blocker value while retaining enough playability when called.");
    }

    if (
      response.recommended_action.action_type === "3bet" ||
      response.recommended_action.action_type === "4bet" ||
      response.recommended_action.action_type === "5bet_jam"
    ) {
      lines.push("The preferred line is aggressive, which indicates the hand benefits more from fold equity and range leverage than from passive realization.");
    } else if (response.recommended_action.action_type === "call") {
      lines.push("The strategy prefers realizing equity at the current price rather than inflating the pot immediately.");
    } else if (response.recommended_action.action_type === "fold") {
      lines.push("The hand falls below the continue threshold once position, stack depth, and the action sequence are combined.");
    } else {
      lines.push("The hand belongs to the active opening region for this node and is profitable enough to build the pot immediately.");
    }

    if (response.confidence.dataset_match === "approximated_node") {
      lines.push("The exact node was unavailable, so this result uses the nearest supported abstraction and should be treated as approximate.");
    }

    return lines;
  }
}
