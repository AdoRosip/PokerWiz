use criterion::{criterion_group, criterion_main, Criterion};
use pokerwiz_engine::api::EvaluatePreflopRequest;
use pokerwiz_engine::domain::{BlindStructure, Mode, PlayerActionInput, PlayerActionKind, Position, TableFormat};
use pokerwiz_engine::normalization::NormalizationService;
use pokerwiz_engine::repository::{JsonStrategyRepository, StrategyRepository};
use pokerwiz_engine::scenario::ScenarioMapper;
use pokerwiz_engine::Engine;

fn request() -> EvaluatePreflopRequest {
    EvaluatePreflopRequest {
        format: TableFormat::SixMaxCash,
        effective_stack_bb: 100.0,
        hero_position: Position::BTN,
        hero_cards: ["As".to_string(), "5s".to_string()],
        blinds: BlindStructure { sb: 0.5, bb: 1.0 },
        action_history: vec![
            PlayerActionInput { position: Position::UTG, action: PlayerActionKind::Fold, size_bb: None },
            PlayerActionInput { position: Position::HJ, action: PlayerActionKind::Fold, size_bb: None },
            PlayerActionInput { position: Position::CO, action: PlayerActionKind::Open, size_bb: Some(2.5) },
        ],
        mode: Mode::HighestEvPure,
    }
}

fn benchmark_full_evaluation(c: &mut Criterion) {
    let engine = Engine::from_json_file("../data/dev/strategy-pack.v1.json")
        .expect("sample dataset should load");
    c.bench_function("full_request_evaluation", |b| {
        b.iter(|| {
            let _ = engine.evaluate(request()).expect("evaluation should succeed");
        })
    });
}

fn benchmark_normalization(c: &mut Criterion) {
    let normalizer = NormalizationService::default();
    c.bench_function("normalize_request", |b| {
        b.iter(|| {
            let _ = normalizer.normalize(request()).expect("normalization should succeed");
        })
    });
}

fn benchmark_scenario_mapping(c: &mut Criterion) {
    let normalizer = NormalizationService::default();
    let mapper = ScenarioMapper::default();
    let normalized = normalizer.normalize(request()).expect("normalization should succeed");
    c.bench_function("scenario_key_generation", |b| {
        b.iter(|| {
            let _ = mapper.map(&normalized).expect("scenario mapping should succeed");
        })
    });
}

fn benchmark_strategy_lookup(c: &mut Criterion) {
    let normalizer = NormalizationService::default();
    let mapper = ScenarioMapper::default();
    let repository = JsonStrategyRepository::load_file("../data/dev/strategy-pack.v1.json")
        .expect("sample dataset should load");
    let normalized = normalizer.normalize(request()).expect("normalization should succeed");
    let scenario = mapper.map(&normalized).expect("scenario mapping should succeed");

    c.bench_function("strategy_lookup", |b| {
        b.iter(|| {
            let _ = repository
                .lookup(&scenario, &normalized.hand_identity)
                .expect("lookup should succeed");
        })
    });
}

criterion_group!(
    benches,
    benchmark_normalization,
    benchmark_scenario_mapping,
    benchmark_strategy_lookup,
    benchmark_full_evaluation
);
criterion_main!(benches);
