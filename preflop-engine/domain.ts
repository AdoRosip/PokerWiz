import { ORDERED_POSITIONS, type Position, type StackBucket } from "../shared/contracts";

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
    const rankDelta = RANKS.indexOf(right.rank as (typeof RANKS)[number]) - RANKS.indexOf(left.rank as (typeof RANKS)[number]);
    if (rankDelta !== 0) {
      return rankDelta;
    }
    return right.suit.localeCompare(left.suit);
  });
  return `${ranked[0].rank}${ranked[0].suit}${ranked[1].rank}${ranked[1].suit}`;
}

export function handClassKey(cards: [string, string]): string {
  const [left, right] = cards.map((card) => parseCard(card));
  const ordered = [left, right].sort((a, b) => {
    return RANKS.indexOf(b.rank as (typeof RANKS)[number]) - RANKS.indexOf(a.rank as (typeof RANKS)[number]);
  });
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
  if (stackBb <= 30) {
    return "20bb";
  }
  if (stackBb <= 50) {
    return "40bb";
  }
  if (stackBb <= 80) {
    return "60bb";
  }
  if (stackBb <= 125) {
    return "100bb";
  }
  return "150bb_plus";
}

export function formatBb(sizeBb: number): string {
  const rounded = Math.round(sizeBb * 10) / 10;
  return Number.isInteger(rounded) ? `${rounded.toFixed(0)}bb` : `${rounded.toFixed(1)}bb`;
}
