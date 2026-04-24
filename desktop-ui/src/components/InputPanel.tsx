import { useMemo, useState } from "react";

import type { EvaluatePreflopRequest, PlayerActionKind, Position } from "../types/api";

const positions: Position[] = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];
const actions: PlayerActionKind[] = ["fold", "call", "open", "raise", "all_in"];
const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const suits = [
  { code: "s", label: "Spades", symbol: "S" },
  { code: "h", label: "Hearts", symbol: "H" },
  { code: "d", label: "Diamonds", symbol: "D" },
  { code: "c", label: "Clubs", symbol: "C" },
] as const;
const aggressiveActions = new Set<PlayerActionKind>(["open", "raise", "all_in"]);
const seatLayoutClass: Record<Position, string> = {
  UTG: "seat-utg",
  HJ: "seat-hj",
  CO: "seat-co",
  BTN: "seat-btn",
  SB: "seat-sb",
  BB: "seat-bb",
};

interface Props {
  value: EvaluatePreflopRequest;
  onChange: (next: EvaluatePreflopRequest) => void;
  onBackToSetup: () => void;
}

interface SeatEntry {
  position: Position;
  action: PlayerActionKind;
  size_bb?: number;
}

function orderedSeats(heroPosition: Position): Position[] {
  const heroIndex = positions.indexOf(heroPosition);
  return positions.filter((position) => positions.indexOf(position) < heroIndex);
}

export function InputPanel({ value, onChange, onBackToSetup }: Props) {
  const [activeCardSlot, setActiveCardSlot] = useState<0 | 1>(0);

  const seatEntries = useMemo(() => {
    const existing = new Map(value.action_history.map((entry) => [entry.position, entry] as const));
    return orderedSeats(value.hero_position).map<SeatEntry>((position) => {
      const current = existing.get(position);
      return {
        position,
        action: current?.action ?? "fold",
        size_bb: current?.size_bb,
      };
    });
  }, [value.action_history, value.hero_position]);

  const update = <K extends keyof EvaluatePreflopRequest>(key: K, next: EvaluatePreflopRequest[K]) => {
    onChange({ ...value, [key]: next });
  };

  const updateHeroPosition = (heroPosition: Position) => {
    const nextEntries = orderedSeats(heroPosition).map<SeatEntry>((position) => {
      const current = value.action_history.find((entry) => entry.position === position);
      return {
        position,
        action: current?.action ?? "fold",
        size_bb: current?.size_bb,
      };
    });

    onChange({
      ...value,
      hero_position: heroPosition,
      action_history: nextEntries,
    });
  };

  const commitSeatEntries = (nextEntries: SeatEntry[]) => {
    onChange({
      ...value,
      action_history: nextEntries.map((entry) => ({
        position: entry.position,
        action: entry.action,
        size_bb: aggressiveActions.has(entry.action) ? entry.size_bb : undefined,
      })),
    });
  };

  const updateSeat = (position: Position, patch: Partial<SeatEntry>) => {
    commitSeatEntries(
      seatEntries.map((entry) =>
        entry.position === position
          ? {
              ...entry,
              ...patch,
              size_bb:
                patch.action && !aggressiveActions.has(patch.action)
                  ? undefined
                  : patch.size_bb ?? entry.size_bb,
            }
          : entry,
      ),
    );
  };

  const allowedActionsForSeat = (position: Position): PlayerActionKind[] => {
    let seenAggression = false;

    for (const seat of seatEntries) {
      if (seat.position === position) {
        break;
      }
      if (aggressiveActions.has(seat.action)) {
        seenAggression = true;
      }
    }

    return seenAggression ? actions : ["fold", "open", "all_in"];
  };

  const pickCard = (card: string) => {
    const nextCards: [string, string] = [...value.hero_cards] as [string, string];

    if (nextCards[activeCardSlot] === card) {
      nextCards[activeCardSlot] = "";
      update("hero_cards", nextCards);
      return;
    }

    const otherSlot: 0 | 1 = activeCardSlot === 0 ? 1 : 0;
    if (nextCards[otherSlot] === card) {
      nextCards[otherSlot] = "";
    }

    nextCards[activeCardSlot] = card;
    update("hero_cards", nextCards);
    setActiveCardSlot(otherSlot);
  };

  const cardGrid = suits.flatMap((suit) =>
    ranks.map((rank) => ({
      code: `${rank}${suit.code}`,
      label: `${rank}${suit.symbol}`,
      suit: suit.code,
    })),
  );

  return (
    <div className="study-input-stack">
      <section className="panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Hero Setup</p>
            <h2>Cards And Position</h2>
          </div>
          <button type="button" className="ghost-button" onClick={onBackToSetup}>
            Change Table
          </button>
        </div>

        <div className="hero-config-grid">
          <label>
            <span>Hero Position</span>
            <select value={value.hero_position} onChange={(event) => updateHeroPosition(event.target.value as Position)}>
              {positions.map((position) => (
                <option key={position} value={position}>
                  {position}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Decision Mode</span>
            <select value={value.mode} onChange={(event) => update("mode", event.target.value as EvaluatePreflopRequest["mode"])}>
              <option value="highest_ev_pure">Highest EV pure</option>
              <option value="highest_frequency_simplification">Highest frequency simplification</option>
              <option value="strict_gto_frequencies">Strict GTO frequencies</option>
            </select>
          </label>
        </div>

        <div className="card-slot-row">
          {[0, 1].map((slot) => (
            <button
              key={slot}
              type="button"
              className={`card-slot ${activeCardSlot === slot ? "active" : ""}`}
              onClick={() => setActiveCardSlot(slot as 0 | 1)}
            >
              <span>Card {slot + 1}</span>
              <strong>{value.hero_cards[slot] || "Select"}</strong>
            </button>
          ))}
        </div>

        <div className="deck-grid">
          {cardGrid.map((card) => {
            const isSelected = value.hero_cards.includes(card.code);
            return (
              <button
                key={card.code}
                type="button"
                className={`deck-card suit-${card.suit} ${isSelected ? "selected" : ""}`}
                onClick={() => pickCard(card.code)}
              >
                {card.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="panel table-panel">
        <div className="panel-header">
          <div>
            <p className="eyebrow">Table Action</p>
            <h2>Players Before Hero</h2>
          </div>
        </div>

        <div className="table-stage wide-table-stage">
          <div className="table-felt">
            <div className="table-center">
              <span>Hero</span>
              <strong>{value.hero_position}</strong>
              <small>{value.hero_cards.filter(Boolean).join(" ") || "Awaiting cards"}</small>
            </div>

            {positions.map((position) => {
              const seat = seatEntries.find((entry) => entry.position === position);
              const isHero = position === value.hero_position;
              const isBeforeHero = Boolean(seat);

              return (
                <div
                  key={position}
                  className={`seat-card table-seat ${seatLayoutClass[position]} ${isHero ? "hero-seat" : ""} ${isBeforeHero ? "action-seat" : "inactive-seat"}`}
                >
                  <div className="seat-header">
                    <strong>{position}</strong>
                    <span>{isHero ? "Hero" : isBeforeHero ? "Acts first" : "Out of node"}</span>
                  </div>

                  {isHero ? (
                    <div className="seat-summary">
                      <span>Current hand</span>
                      <strong>{value.hero_cards.filter(Boolean).join(" ") || "Not selected"}</strong>
                    </div>
                  ) : isBeforeHero && seat ? (
                    <div className="seat-controls">
                      <select
                        value={seat.action}
                        onChange={(event) => updateSeat(position, { action: event.target.value as PlayerActionKind })}
                      >
                        {allowedActionsForSeat(position).map((action) => (
                          <option key={action} value={action}>
                            {action}
                          </option>
                        ))}
                      </select>

                      {aggressiveActions.has(seat.action) ? (
                        <input
                          type="number"
                          placeholder="size bb"
                          value={seat.size_bb ?? ""}
                          min={seat.action === "open" ? 1 : 2}
                          max={seat.action === "open" ? 10 : 150}
                          step="0.1"
                          onChange={(event) =>
                            updateSeat(position, {
                              size_bb: event.target.value ? Number(event.target.value) : undefined,
                            })
                          }
                        />
                      ) : (
                        <div className="seat-note">No size needed</div>
                      )}
                    </div>
                  ) : (
                    <div className="seat-note">Seat is behind Hero</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
