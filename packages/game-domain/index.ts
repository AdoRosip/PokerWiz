import {
  AGGRESSIVE_PLAYER_ACTIONS,
  ORDERED_POSITIONS,
  type PlayerActionKind,
  type Position,
  type ScenarioDescriptor,
  type StackBucket,
  type StrategyEntry,
} from "../../shared/contracts";

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"] as const;
const SUITS = ["s", "h", "d", "c"] as const;

export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export function positionIndex(position: Position): number {
  return ORDERED_POSITIONS.indexOf(position);
}

export function actsBefore(left: Position, right: Position): boolean {
  return positionIndex(left) < positionIndex(right);
}

export function isAggressivePlayerAction(action: PlayerActionKind): boolean {
  return (AGGRESSIVE_PLAYER_ACTIONS as readonly PlayerActionKind[]).includes(action);
}

export function parseCard(card: string): { rank: string; suit: string } {
  if (card.length !== 2) {
    throw new DomainError(`Invalid card notation: ${card}`);
  }
  const rank = card[0]?.toUpperCase();
  const suit = card[1]?.toLowerCase();
  if (!RANKS.includes(rank as (typeof RANKS)[number]) || !SUITS.includes(suit as (typeof SUITS)[number])) {
    throw new DomainError(`Invalid card notation: ${card}`);
  }
  return { rank, suit };
}

export function comboKey(cards: [string, string]): string {
  const parsed = cards.map((card) => parseCard(card));
  const ranked = [...parsed].sort((left, right) => {
    const rankDelta =
      RANKS.indexOf(right.rank as (typeof RANKS)[number]) - RANKS.indexOf(left.rank as (typeof RANKS)[number]);
    if (rankDelta !== 0) {
      return rankDelta;
    }
    return right.suit.localeCompare(left.suit);
  });
  return `${ranked[0].rank}${ranked[0].suit}${ranked[1].rank}${ranked[1].suit}`;
}

export function handClassKey(cards: [string, string]): string {
  const [left, right] = cards.map((card) => parseCard(card));
  const ordered = [left, right].sort(
    (a, b) => RANKS.indexOf(b.rank as (typeof RANKS)[number]) - RANKS.indexOf(a.rank as (typeof RANKS)[number]),
  );
  if (ordered[0].rank === ordered[1].rank) {
    return `${ordered[0].rank}${ordered[1].rank}`;
  }
  return `${ordered[0].rank}${ordered[1].rank}${ordered[0].suit === ordered[1].suit ? "s" : "o"}`;
}

export function ensureDistinctCards(cards: [string, string]): void {
  if (cards[0].toLowerCase() === cards[1].toLowerCase()) {
    throw new DomainError("Duplicate hero cards are not allowed");
  }
}

export function stackBucketFor(stackBb: number): StackBucket {
  if (!Number.isFinite(stackBb) || stackBb <= 0) {
    throw new DomainError(`Unsupported stack depth: ${stackBb}`);
  }
  if (stackBb <= 30) return "20bb";
  if (stackBb <= 50) return "40bb";
  if (stackBb <= 80) return "60bb";
  if (stackBb <= 125) return "100bb";
  return "150bb_plus";
}

export function formatBb(sizeBb: number): string {
  const rounded = Math.round(sizeBb * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}bb` : `${rounded.toFixed(1)}bb`;
}

export interface ParsedScenarioKey {
  scenario_key: string;
  game: "6max_cash";
  stack_bucket: StackBucket;
  hero_position: Position;
  line_signature: ScenarioDescriptor["line_signature"];
  open_size_bb?: number;
  open_position?: Position;
  three_bet_position?: Position;
  three_bet_size_bb?: number;
  four_bet_position?: Position;
  four_bet_size_bb?: number;
  caller_position?: Position;
}

export function parseScenarioKey(scenarioKey: string): ParsedScenarioKey | null {
  const firstInMatch = scenarioKey.match(
    /^(6max_cash)_(20bb|40bb|60bb|100bb|150bb_plus)_(UTG|HJ|CO|BTN|SB|BB)_first_in$/,
  );
  if (firstInMatch) {
    return {
      scenario_key: scenarioKey,
      game: "6max_cash",
      stack_bucket: firstInMatch[2] as StackBucket,
      hero_position: firstInMatch[3] as Position,
      line_signature: "first_in",
    };
  }

  const openMatch = scenarioKey.match(
    /^(6max_cash)_(20bb|40bb|60bb|100bb|150bb_plus)_(UTG|HJ|CO|BTN|SB|BB)_vs_(UTG|HJ|CO|BTN|SB|BB)_open_([0-9]+(?:\.[0-9]+)?)bb(?:_(UTG|HJ|CO|BTN|SB|BB)_call)?(?:_(UTG|HJ|CO|BTN|SB|BB)_3bet_([0-9]+(?:\.[0-9]+)?)bb)?(?:_(UTG|HJ|CO|BTN|SB|BB)_4bet_([0-9]+(?:\.[0-9]+)?)bb)?$/,
  );

  if (!openMatch) {
    return null;
  }

  const callerPosition = openMatch[6] as Position | undefined;
  const threeBetPosition = openMatch[7] as Position | undefined;
  const fourBetPosition = openMatch[9] as Position | undefined;

  let lineSignature: ScenarioDescriptor["line_signature"] = "facing_open";
  if (fourBetPosition) {
    lineSignature = "facing_open_3bet_4bet";
  } else if (threeBetPosition) {
    lineSignature = "facing_open_and_3bet";
  } else if (callerPosition) {
    lineSignature = "facing_open_plus_call";
  }

  return {
    scenario_key: scenarioKey,
    game: "6max_cash",
    stack_bucket: openMatch[2] as StackBucket,
    hero_position: openMatch[3] as Position,
    line_signature: lineSignature,
    open_position: openMatch[4] as Position,
    open_size_bb: Number(openMatch[5]),
    caller_position: callerPosition,
    three_bet_position: threeBetPosition,
    three_bet_size_bb: openMatch[8] ? Number(openMatch[8]) : undefined,
    four_bet_position: fourBetPosition,
    four_bet_size_bb: openMatch[10] ? Number(openMatch[10]) : undefined,
  };
}

export function validateScenarioKeyAgainstEntry(entry: Pick<
  StrategyEntry,
  "scenario_key" | "stack_bucket" | "hero_position" | "line_signature"
>): string[] {
  const issues: string[] = [];
  const parsed = parseScenarioKey(entry.scenario_key);
  if (!parsed) {
    issues.push(`Scenario key ${entry.scenario_key} does not match a supported canonical format`);
    return issues;
  }

  if (parsed.stack_bucket !== entry.stack_bucket) {
    issues.push(`Scenario key stack bucket ${parsed.stack_bucket} does not match entry stack bucket ${entry.stack_bucket}`);
  }

  if (parsed.hero_position !== entry.hero_position) {
    issues.push(`Scenario key hero position ${parsed.hero_position} does not match entry hero position ${entry.hero_position}`);
  }

  if (parsed.line_signature !== entry.line_signature) {
    issues.push(
      `Scenario key line signature ${parsed.line_signature} does not match entry line signature ${entry.line_signature}`,
    );
  }

  return issues;
}

export function scenarioApproximationSignature(scenarioKey: string):
  | { prefix: string; open_size_bb: number; has_call_suffix: boolean; line_suffix: string }
  | null {
  const parsed = parseScenarioKey(scenarioKey);
  if (!parsed || parsed.open_size_bb == null || parsed.open_position == null) {
    return null;
  }

  const prefix = `${parsed.game}_${parsed.stack_bucket}_${parsed.hero_position}_vs_${parsed.open_position}`;
  let lineSuffix = "";
  if (parsed.three_bet_position && parsed.three_bet_size_bb != null) {
    lineSuffix += `_${parsed.three_bet_position}_3bet_${formatBb(parsed.three_bet_size_bb)}`;
  }
  if (parsed.four_bet_position && parsed.four_bet_size_bb != null) {
    lineSuffix += `_${parsed.four_bet_position}_4bet_${formatBb(parsed.four_bet_size_bb)}`;
  }

  return {
    prefix,
    open_size_bb: parsed.open_size_bb,
    has_call_suffix: Boolean(parsed.caller_position),
    line_suffix: lineSuffix,
  };
}
