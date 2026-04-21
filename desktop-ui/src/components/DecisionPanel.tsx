import type { EvaluatePreflopRequest, PreflopEvaluationResult } from "../types/api";

interface Props {
  request: EvaluatePreflopRequest;
  result: PreflopEvaluationResult | null;
  error: string | null;
  loading: boolean;
}

export function DecisionPanel({ request, result, error, loading }: Props) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Recommendation</p>
          <h2>Best Action</h2>
        </div>
      </div>

      {error ? <div className="error-box">{error}</div> : null}

      {!result ? (
        <div className="decision-layout">
          <div className="placeholder">
            {loading
              ? "Evaluating the current node..."
              : "Choose hero cards and configure the actions before Hero. The recommendation will appear here automatically."}
          </div>

          <div className="detail-card">
            <h3>Current Input</h3>
            <div className="row">
              <span>Hero Position</span>
              <strong>{request.hero_position}</strong>
            </div>
            <div className="row">
              <span>Hero Cards</span>
              <strong>{request.hero_cards.filter(Boolean).join(" ") || "Not selected"}</strong>
            </div>
            <div className="row">
              <span>Actions Before Hero</span>
              <strong>{request.action_history.length}</strong>
            </div>
          </div>
        </div>
      ) : result.status === "unsupported" ? (
        <div className="decision-layout">
          <div className="warning-box">
            <h3>Unsupported Node</h3>
            <p>{result.unsupported_reason}</p>
          </div>

          <div className="detail-card">
            <h3>Current Node</h3>
            <div className="row">
              <span>Scenario</span>
              <strong>{result.scenario_key}</strong>
            </div>
            <div className="row">
              <span>Hero Hand</span>
              <strong>{result.normalized_hand.hand_class}</strong>
            </div>
          </div>

          <div className="detail-card">
            <h3>What This Means</h3>
            <ul className="plain-list">
              {result.explanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          {result.nearest_supported_scenarios.length > 0 ? (
            <div className="detail-card">
              <h3>Nearest Supported Nodes</h3>
              <ul className="plain-list">
                {result.nearest_supported_scenarios.map((scenarioKey) => (
                  <li key={scenarioKey}>{scenarioKey}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="decision-layout">
          <div className="hero-callout">
            <div className="decision-badge">{result.recommended_action.action_type}</div>
            <p className="decision-size">
              {result.recommended_action.size_bb ? `${result.recommended_action.size_bb}bb` : "No sizing"}
            </p>
            <p className="scenario-key">{result.scenario_key}</p>
          </div>

          <div className="detail-card">
            <h3>Node Snapshot</h3>
            <div className="row">
              <span>Hero</span>
              <strong>
                {request.hero_position} | {request.hero_cards.join(" ")}
              </strong>
            </div>
            <div className="row">
              <span>Blinds</span>
              <strong>
                {request.blinds.sb}/{request.blinds.bb}
              </strong>
            </div>
            <div className="row">
              <span>Effective Stack</span>
              <strong>{request.effective_stack_bb}bb</strong>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <span>Hand Class</span>
              <strong>{result.normalized_hand.hand_class}</strong>
            </div>
            <div className="stat-card">
              <span>Combo</span>
              <strong>{result.normalized_hand.combo}</strong>
            </div>
            <div className="stat-card">
              <span>Dataset Match</span>
              <strong>{result.confidence.dataset_match}</strong>
            </div>
            <div className="stat-card">
              <span>Resolution</span>
              <strong>{result.confidence.hand_resolution}</strong>
            </div>
          </div>

          <div className="grid two">
            <div className="detail-card">
              <h3>Strategy Mix</h3>
              {result.strategy_mix.map((entry) => (
                <div className="row" key={entry.action_key}>
                  <span>{entry.action_key}</span>
                  <strong>{(entry.frequency * 100).toFixed(0)}%</strong>
                </div>
              ))}
            </div>

            <div className="detail-card">
              <h3>EV</h3>
              {result.ev.map((entry) => (
                <div className="row" key={entry.action_key}>
                  <span>{entry.action_key}</span>
                  <strong>{entry.ev_bb.toFixed(2)} bb</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="detail-card">
            <h3>Explanation</h3>
            <ul className="plain-list">
              {result.explanation.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>

          {result.warnings.length > 0 ? (
            <div className="warning-box">
              <h3>Warnings</h3>
              <ul className="plain-list">
                {result.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
