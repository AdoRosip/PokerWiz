import type {
  EvaluatePreflopRequest,
  NormalizedAction,
  NormalizedRequest,
  PlayerActionInput,
} from "../shared/contracts";
import { actsBefore, comboKey, DomainError, ensureDistinctCards, handClassKey, stackBucketFor } from "./domain";

const AGGRESSIVE_ACTIONS = new Set(["open", "raise", "all_in"]);

export class NormalizationService {
  normalize(request: EvaluatePreflopRequest): NormalizedRequest {
    if (request.format !== "6max_cash") {
      throw new DomainError(`Unsupported table format: ${request.format}`);
    }

    ensureDistinctCards(request.hero_cards);
    const handIdentity = {
      combo: comboKey(request.hero_cards),
      hand_class: handClassKey(request.hero_cards),
    };

    return {
      format: request.format,
      effective_stack_bb: request.effective_stack_bb,
      stack_bucket: stackBucketFor(request.effective_stack_bb),
      hero_position: request.hero_position,
      hero_cards: request.hero_cards,
      hand_identity: handIdentity,
      blinds: request.blinds,
      action_history: this.normalizeActions(request.action_history, request.hero_position),
      mode: request.mode,
    };
  }

  private normalizeActions(actionHistory: PlayerActionInput[], heroPosition: EvaluatePreflopRequest["hero_position"]): NormalizedAction[] {
    let lastPositionIndex = -1;
    let highestRaiseLevel = 0;
    let sawLimp = false;

    return actionHistory.map((entry) => {
      if (!actsBefore(entry.position, heroPosition)) {
        throw new DomainError(`Invalid action sequence: ${entry.position} acts after hero ${heroPosition}`);
      }

      const currentIndex = ["UTG", "HJ", "CO", "BTN", "SB", "BB"].indexOf(entry.position);
      if (currentIndex <= lastPositionIndex) {
        throw new DomainError("Invalid action sequence: actions must be in table order before hero");
      }
      lastPositionIndex = currentIndex;

      if (entry.action === "call" && highestRaiseLevel === 0) {
        sawLimp = true;
      }
      if (sawLimp) {
        throw new DomainError("Unsupported action tree: limp and overlimp trees are out of scope for v1");
      }

      if (AGGRESSIVE_ACTIONS.has(entry.action) && entry.size_bb == null) {
        throw new DomainError(`Invalid action sequence: aggressive action from ${entry.position} requires a size`);
      }

      const normalizedSize = entry.size_bb == null ? undefined : Math.round(entry.size_bb * 10) / 10;
      if (entry.action === "open" && normalizedSize != null && normalizedSize > 10) {
        throw new DomainError(
          `Unsupported open size: ${normalizedSize}bb. v1 expects realistic preflop open sizes such as 2bb to 4bb; if you meant 3.0bb, enter 3 instead of 30.`,
        );
      }
      if ((entry.action === "raise" || entry.action === "all_in") && normalizedSize != null && normalizedSize > 150) {
        throw new DomainError(`Unsupported raise size: ${normalizedSize}bb`);
      }

      if (entry.action === "open") {
        highestRaiseLevel = 1;
      } else if (entry.action === "raise" || entry.action === "all_in") {
        highestRaiseLevel += 1;
      }

      return {
        position: entry.position,
        action: entry.action,
        size_bb: normalizedSize,
        raise_level: highestRaiseLevel,
      };
    });
  }
}
