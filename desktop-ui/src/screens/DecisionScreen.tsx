import { useEffect, useMemo, useState } from "react";
import { DecisionPanel } from "../components/DecisionPanel";
import { InputPanel } from "../components/InputPanel";
import { evaluatePreflop } from "../lib/engine";
import type { EvaluatePreflopRequest, PreflopEvaluationResult } from "../types/api";

const initialRequest: EvaluatePreflopRequest = {
  format: "6max_cash",
  effective_stack_bb: 100,
  hero_position: "BTN",
  hero_cards: ["As", "5s"],
  blinds: { sb: 0.5, bb: 1 },
  action_history: [
    { position: "UTG", action: "fold" },
    { position: "HJ", action: "fold" },
    { position: "CO", action: "open", size_bb: 2.5 },
  ],
  mode: "highest_ev_pure",
};

type FlowStage = "setup" | "study";

const aggressiveActions = new Set(["open", "raise", "all_in"]);

function isStudyReady(request: EvaluatePreflopRequest): boolean {
  return (
    request.hero_cards.every((card) => card.length === 2) &&
    request.action_history.every(
      (entry) => !aggressiveActions.has(entry.action) || (entry.size_bb != null && entry.size_bb > 0),
    )
  );
}

export function DecisionScreen() {
  const [request, setRequest] = useState<EvaluatePreflopRequest>(initialRequest);
  const [result, setResult] = useState<PreflopEvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState<FlowStage>("setup");

  const readyForEvaluation = useMemo(() => isStudyReady(request), [request]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await evaluatePreflop(request);
      setResult(next);
    } catch (submissionError) {
      setResult(null);
      setError(submissionError instanceof Error ? submissionError.message : "Unknown evaluation failure");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stage !== "study" || !readyForEvaluation) {
      if (!readyForEvaluation) {
        setResult(null);
      }
      return;
    }

    void handleSubmit();
  }, [request, readyForEvaluation, stage]);

  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">PokerWiz</p>
          <h1>6-max NLHE Preflop Decision Support</h1>
          <p className="hero-copy">
            Deterministic local lookup for preflop study, with a cleaner two-stage workflow:
            table setup first, then one focused study screen for cards, actions, and the recommendation.
          </p>
        </div>
      </header>

      {stage === "setup" ? (
        <section className="panel setup-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Table Setup</p>
              <h2>Configure The Game Once</h2>
            </div>
          </div>

          <div className="setup-grid">
            <label>
              <span>Game Type</span>
              <select defaultValue="cash">
                <option value="cash">Cash Game</option>
                <option value="sng" disabled>
                  Sit &amp; Go (later)
                </option>
                <option value="mtt" disabled>
                  Tournament (later)
                </option>
              </select>
            </label>

            <label>
              <span>Players</span>
              <select defaultValue="6max">
                <option value="6max">6-max</option>
                <option value="9max" disabled>
                  9-max (later)
                </option>
              </select>
            </label>

            <label>
              <span>Betting Structure</span>
              <select value={request.format} onChange={(event) => setRequest({ ...request, format: event.target.value as EvaluatePreflopRequest["format"] })}>
                <option value="6max_cash">NLHE cash</option>
              </select>
            </label>

            <label>
              <span>Small Blind</span>
              <input
                type="number"
                value={request.blinds.sb}
                onChange={(event) =>
                  setRequest({ ...request, blinds: { ...request.blinds, sb: Number(event.target.value) } })
                }
              />
            </label>

            <label>
              <span>Big Blind</span>
              <input
                type="number"
                value={request.blinds.bb}
                onChange={(event) =>
                  setRequest({ ...request, blinds: { ...request.blinds, bb: Number(event.target.value) } })
                }
              />
            </label>

            <label>
              <span>Effective Stack (bb)</span>
              <input
                type="number"
                value={request.effective_stack_bb}
                onChange={(event) => setRequest({ ...request, effective_stack_bb: Number(event.target.value) })}
              />
            </label>
          </div>

          <div className="setup-actions">
            <button className="primary-button" type="button" onClick={() => setStage("study")}>
              Continue To Study Screen
            </button>
            <button
              className="ghost-button"
              type="button"
              onClick={() => {
                setRequest(initialRequest);
                setResult(null);
                setError(null);
              }}
            >
              Reset
            </button>
          </div>
        </section>
      ) : (
        <div className="study-grid">
          <div className="study-top-row">
            <InputPanel value={request} onChange={setRequest} onBackToSetup={() => setStage("setup")} />
            <DecisionPanel request={request} result={result} error={error} loading={loading} />
          </div>
        </div>
      )}
    </main>
  );
}
