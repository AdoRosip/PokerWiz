use pokerwiz_engine::api::EvaluatePreflopRequest;
use pokerwiz_engine::domain::{BlindStructure, Mode, PlayerActionInput, PlayerActionKind, Position, TableFormat};
use pokerwiz_engine::Engine;

fn sample_engine() -> Engine {
    Engine::from_json_file("../data/dev/strategy-pack.v1.json").expect("sample dataset should load")
}

fn base_request(hero_position: Position, cards: [&str; 2]) -> EvaluatePreflopRequest {
    EvaluatePreflopRequest {
        format: TableFormat::SixMaxCash,
        effective_stack_bb: 100.0,
        hero_position,
        hero_cards: [cards[0].to_string(), cards[1].to_string()],
        blinds: BlindStructure { sb: 0.5, bb: 1.0 },
        action_history: Vec::new(),
        mode: Mode::HighestEvPure,
    }
}

#[test]
fn parses_suited_hand_class() {
    let engine = sample_engine();
    let response = engine
        .evaluate(base_request(Position::CO, ["As", "5s"]))
        .expect("request should evaluate");
    assert_eq!(response.normalized_hand.hand_class, "A5s");
}

#[test]
fn rejects_duplicate_cards() {
    let engine = sample_engine();
    let request = base_request(Position::BTN, ["As", "As"]);
    assert!(engine.evaluate(request).is_err());
}

#[test]
fn maps_first_in_scenario() {
    let engine = sample_engine();
    let response = engine
        .evaluate(base_request(Position::CO, ["Ah", "Kh"]))
        .expect("request should evaluate");
    assert_eq!(response.scenario_key, "6max_cash_100bb_CO_first_in");
}

#[test]
fn maps_facing_cutoff_open() {
    let engine = sample_engine();
    let mut request = base_request(Position::BTN, ["As", "5s"]);
    request.action_history = vec![
        PlayerActionInput { position: Position::UTG, action: PlayerActionKind::Fold, size_bb: None },
        PlayerActionInput { position: Position::HJ, action: PlayerActionKind::Fold, size_bb: None },
        PlayerActionInput { position: Position::CO, action: PlayerActionKind::Open, size_bb: Some(2.5) },
    ];
    let response = engine.evaluate(request).expect("request should evaluate");
    assert_eq!(response.scenario_key, "6max_cash_100bb_BTN_vs_CO_open_2.5bb");
}

#[test]
fn maps_open_plus_call_scenario() {
    let engine = sample_engine();
    let mut request = base_request(Position::BB, ["Qs", "Js"]);
    request.action_history = vec![
        PlayerActionInput { position: Position::BTN, action: PlayerActionKind::Open, size_bb: Some(2.5) },
        PlayerActionInput { position: Position::SB, action: PlayerActionKind::Call, size_bb: None },
    ];
    let response = engine.evaluate(request).expect("request should evaluate");
    assert!(response.scenario_key.contains("SB_call"));
}

#[test]
fn maps_open_three_bet_scenario() {
    let engine = sample_engine();
    let mut request = base_request(Position::SB, ["Ah", "Qh"]);
    request.action_history = vec![
        PlayerActionInput { position: Position::HJ, action: PlayerActionKind::Open, size_bb: Some(2.5) },
        PlayerActionInput { position: Position::CO, action: PlayerActionKind::Raise, size_bb: Some(8.0) },
    ];
    let response = engine.evaluate(request).expect("request should evaluate");
    assert!(response.scenario_key.contains("3bet"));
}

#[test]
fn maps_open_three_bet_four_bet_scenario() {
    let engine = sample_engine();
    let mut request = base_request(Position::BTN, ["Ah", "Kd"]);
    request.action_history = vec![
        PlayerActionInput { position: Position::UTG, action: PlayerActionKind::Open, size_bb: Some(2.5) },
        PlayerActionInput { position: Position::HJ, action: PlayerActionKind::Raise, size_bb: Some(8.0) },
        PlayerActionInput { position: Position::CO, action: PlayerActionKind::Raise, size_bb: Some(22.0) },
    ];
    let response = engine.evaluate(request).expect("request should evaluate");
    assert!(response.scenario_key.contains("4bet"));
}

#[test]
fn rejects_out_of_order_actions() {
    let engine = sample_engine();
    let mut request = base_request(Position::BTN, ["As", "5s"]);
    request.action_history = vec![
        PlayerActionInput { position: Position::CO, action: PlayerActionKind::Open, size_bb: Some(2.5) },
        PlayerActionInput { position: Position::HJ, action: PlayerActionKind::Fold, size_bb: None },
    ];
    assert!(engine.evaluate(request).is_err());
}

#[test]
fn rejects_limp_tree() {
    let engine = sample_engine();
    let mut request = base_request(Position::CO, ["9s", "8s"]);
    request.action_history = vec![
        PlayerActionInput { position: Position::UTG, action: PlayerActionKind::Call, size_bb: None },
    ];
    assert!(engine.evaluate(request).is_err());
}

#[test]
fn uses_hand_class_fallback() {
    let engine = sample_engine();
    let mut request = base_request(Position::BTN, ["Ac", "5c"]);
    request.action_history = vec![
        PlayerActionInput { position: Position::CO, action: PlayerActionKind::Open, size_bb: Some(2.5) },
    ];
    let response = engine.evaluate(request).expect("request should evaluate");
    assert_eq!(response.confidence.hand_resolution, pokerwiz_engine::domain::HandResolution::HandClass);
}

#[test]
fn chooses_highest_ev_pure() {
    let engine = sample_engine();
    let mut request = base_request(Position::BTN, ["As", "5s"]);
    request.action_history = vec![
        PlayerActionInput { position: Position::CO, action: PlayerActionKind::Open, size_bb: Some(2.5) },
    ];
    let response = engine.evaluate(request).expect("request should evaluate");
    assert_eq!(response.recommended_action.action_type, pokerwiz_engine::domain::HeroActionType::ThreeBet);
}

#[test]
fn chooses_highest_frequency_simplification() {
    let engine = sample_engine();
    let mut request = base_request(Position::BTN, ["As", "5s"]);
    request.mode = Mode::HighestFrequencySimplification;
    request.action_history = vec![
        PlayerActionInput { position: Position::CO, action: PlayerActionKind::Open, size_bb: Some(2.5) },
    ];
    let response = engine.evaluate(request).expect("request should evaluate");
    assert!(response.recommended_action.pure_simplification_note.is_some());
}

#[test]
fn strict_mode_returns_strategy_lead_action() {
    let engine = sample_engine();
    let mut request = base_request(Position::CO, ["Ah", "Kh"]);
    request.mode = Mode::StrictGtoFrequencies;
    let response = engine.evaluate(request).expect("request should evaluate");
    assert_eq!(response.recommended_action.action_type, pokerwiz_engine::domain::HeroActionType::Raise);
}

#[test]
fn approximates_nearest_size_when_exact_node_missing() {
    let engine = sample_engine();
    let mut request = base_request(Position::BTN, ["As", "5s"]);
    request.action_history = vec![
        PlayerActionInput { position: Position::CO, action: PlayerActionKind::Open, size_bb: Some(2.2) },
    ];
    let response = engine.evaluate(request).expect("request should evaluate");
    assert_eq!(response.confidence.dataset_match, pokerwiz_engine::domain::DatasetMatch::ApproximatedNode);
}

#[test]
fn includes_approximation_warning() {
    let engine = sample_engine();
    let mut request = base_request(Position::BTN, ["As", "5s"]);
    request.action_history = vec![
        PlayerActionInput { position: Position::CO, action: PlayerActionKind::Open, size_bb: Some(2.2) },
    ];
    let response = engine.evaluate(request).expect("request should evaluate");
    assert!(!response.warnings.is_empty());
}

#[test]
fn supports_20bb_bucket() {
    let engine = sample_engine();
    let mut request = base_request(Position::BTN, ["Ah", "Qs"]);
    request.effective_stack_bb = 20.0;
    request.action_history = vec![
        PlayerActionInput { position: Position::CO, action: PlayerActionKind::Open, size_bb: Some(2.5) },
    ];
    let response = engine.evaluate(request).expect("request should evaluate");
    assert!(response.scenario_key.contains("20bb"));
}

#[test]
fn supports_150bb_plus_bucket() {
    let engine = sample_engine();
    let mut request = base_request(Position::CO, ["7h", "7d"]);
    request.effective_stack_bb = 180.0;
    let response = engine.evaluate(request).expect("request should evaluate");
    assert!(response.scenario_key.contains("150bb_plus"));
}

#[test]
fn returns_fold_for_low_class_when_available() {
    let engine = sample_engine();
    let mut request = base_request(Position::BTN, ["7c", "2d"]);
    request.action_history = vec![
        PlayerActionInput { position: Position::CO, action: PlayerActionKind::Open, size_bb: Some(2.5) },
    ];
    let response = engine.evaluate(request).expect("request should evaluate");
    assert_eq!(response.recommended_action.action_type, pokerwiz_engine::domain::HeroActionType::Fold);
}

#[test]
fn output_contains_ev_lines() {
    let engine = sample_engine();
    let response = engine
        .evaluate(base_request(Position::CO, ["Ah", "Kh"]))
        .expect("request should evaluate");
    assert!(!response.ev.is_empty());
}

#[test]
fn output_contains_explanation() {
    let engine = sample_engine();
    let response = engine
        .evaluate(base_request(Position::CO, ["Ah", "Kh"]))
        .expect("request should evaluate");
    assert!(!response.explanation.is_empty());
}

#[test]
fn unsupported_hand_in_supported_node_errors() {
    let engine = sample_engine();
    let mut request = base_request(Position::SB, ["4c", "3d"]);
    request.action_history = vec![
        PlayerActionInput { position: Position::HJ, action: PlayerActionKind::Open, size_bb: Some(2.5) },
        PlayerActionInput { position: Position::CO, action: PlayerActionKind::Raise, size_bb: Some(8.0) },
    ];
    assert!(engine.evaluate(request).is_err());
}
