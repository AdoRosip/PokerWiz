import { useEffect, useMemo, useState } from "react";
import { DecisionPanel } from "../components/DecisionPanel";
import { InputPanel } from "../components/InputPanel";
import { evaluatePreflop, getPreflopSummary } from "../lib/engine";
import type { EvaluatePreflopRequest, PreflopEvaluationResult, PreflopPackSummary } from "../types/api";

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
type CoverageLineFilter = "all" | "first_in" | "facing_open" | "facing_open_plus_call" | "facing_open_and_3bet" | "facing_open_3bet_4bet";

const coveragePositions = ["all", "UTG", "HJ", "CO", "BTN", "SB", "BB"] as const;
const coverageLineOptions: CoverageLineFilter[] = [
  "all",
  "first_in",
  "facing_open",
  "facing_open_plus_call",
  "facing_open_and_3bet",
  "facing_open_3bet_4bet",
];

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
  const [summary, setSummary] = useState<PreflopPackSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [coveragePositionFilter, setCoveragePositionFilter] = useState<(typeof coveragePositions)[number]>("all");
  const [coverageLineFilter, setCoverageLineFilter] = useState<CoverageLineFilter>("all");

  const readyForEvaluation = useMemo(() => isStudyReady(request), [request]);
  const filteredScenarios = useMemo(() => {
    if (!summary) return [];
    return summary.scenarios
      .filter((scenario) => coveragePositionFilter === "all" || scenario.hero_position === coveragePositionFilter)
      .filter((scenario) => coverageLineFilter === "all" || scenario.line_signature === coverageLineFilter)
      .slice(0, 8);
  }, [summary, coverageLineFilter, coveragePositionFilter]);

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

  useEffect(() => {
    void (async () => {
      try {
        const next = await getPreflopSummary();
        setSummary(next);
        setSummaryError(null);
      } catch (summaryLoadError) {
        setSummary(null);
        setSummaryError(summaryLoadError instanceof Error ? summaryLoadError.message : "Unable to load pack summary");
      }
    })();
  }, []);

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

          <div className="setup-summary-grid">
            <div className="detail-card">
              <h3>Current Pack</h3>
              {summaryError ? (
                <p className="setup-summary-text">{summaryError}</p>
              ) : !summary ? (
                <p className="setup-summary-text">Loading pack coverage...</p>
              ) : (
                <div className="setup-pack-grid">
                  <div className="stat-card">
                    <span>Dataset</span>
                    <strong>{summary.dataset_version}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Scenarios</span>
                    <strong>{summary.total_scenarios}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Entries</span>
                    <strong>{summary.total_entries}</strong>
                  </div>
                  <div className="stat-card">
                    <span>Average Coverage</span>
                    <strong>{(summary.average_scenario_coverage_ratio * 100).toFixed(1)}%</strong>
                  </div>
                </div>
              )}
            </div>

            <div className="detail-card">
              <h3>Most Populated Nodes</h3>
              {summary ? (
                <ul className="plain-list">
                  {summary.scenarios.slice(0, 4).map((scenario) => (
                    <li key={scenario.matched_scenario_key}>
                      {scenario.matched_scenario_key}{" "}
                      <span className="inline-metric">
                        {scenario.covered_hand_classes}/{scenario.total_hand_classes}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="setup-summary-text">Top node coverage will appear here once the pack summary is loaded.</p>
              )}
            </div>
          </div>

          <div className="detail-card setup-browser-card">
            <div className="subsection-header">
              <div>
                <h3>Coverage Browser</h3>
                <p className="setup-summary-text">Inspect covered nodes by hero position and line family.</p>
              </div>
            </div>

            <div className="setup-browser-filters">
              <label>
                <span>Hero Position</span>
                <select
                  value={coveragePositionFilter}
                  onChange={(event) => setCoveragePositionFilter(event.target.value as (typeof coveragePositions)[number])}
                >
                  {coveragePositions.map((position) => (
                    <option key={position} value={position}>
                      {position === "all" ? "All positions" : position}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Line Family</span>
                <select
                  value={coverageLineFilter}
                  onChange={(event) => setCoverageLineFilter(event.target.value as CoverageLineFilter)}
                >
                  {coverageLineOptions.map((line) => (
                    <option key={line} value={line}>
                      {line === "all" ? "All line families" : line}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {summary ? (
              filteredScenarios.length > 0 ? (
                <div className="coverage-browser-list">
                  {filteredScenarios.map((scenario) => (
                    <div className="coverage-browser-row" key={scenario.matched_scenario_key}>
                      <div>
                        <strong>{scenario.matched_scenario_key}</strong>
                        <p className="setup-summary-text">
                          {scenario.hero_position} · {scenario.line_signature}
                        </p>
                      </div>
                      <div className="coverage-browser-metric">
                        <strong>{(scenario.coverage_ratio * 100).toFixed(1)}%</strong>
                        <span>
                          {scenario.covered_hand_classes}/{scenario.total_hand_classes}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="setup-summary-text">No nodes match the current coverage filters.</p>
              )
            ) : (
              <p className="setup-summary-text">Coverage browser will appear once the pack summary is loaded.</p>
            )}
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
