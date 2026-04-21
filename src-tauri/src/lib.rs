use std::path::PathBuf;
use std::sync::Arc;

use pokerwiz_engine::api::{EvaluatePreflopRequest, EvaluatePreflopResponse};
use pokerwiz_engine::repository::{JsonStrategyRepository, StrategyRepository};
use pokerwiz_engine::Engine;
use tauri::State;

pub struct AppState {
    engine: Arc<Engine>,
}

#[tauri::command]
pub fn evaluate_preflop(
    request: EvaluatePreflopRequest,
    state: State<'_, AppState>,
) -> Result<EvaluatePreflopResponse, String> {
    state.engine.evaluate(request).map_err(|error| error.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let repository = Arc::new(
        JsonStrategyRepository::load_file(dataset_path()).expect("strategy dataset should load"),
    ) as Arc<dyn StrategyRepository>;

    tauri::Builder::default()
        .manage(AppState {
            engine: Arc::new(Engine::new(repository)),
        })
        .invoke_handler(tauri::generate_handler![evaluate_preflop])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn dataset_path() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../data/dev/strategy-pack.v1.json")
}
