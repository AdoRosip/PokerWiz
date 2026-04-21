use serde::{Deserialize, Serialize};

use crate::domain::{
    BlindStructure, Confidence, HandIdentity, HeroActionRecommendation, Mode, PlayerActionInput,
    Position, TableFormat,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluatePreflopRequest {
    pub format: TableFormat,
    pub effective_stack_bb: f32,
    pub hero_position: Position,
    pub hero_cards: [String; 2],
    pub blinds: BlindStructure,
    #[serde(default)]
    pub action_history: Vec<PlayerActionInput>,
    pub mode: Mode,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvaluatePreflopResponse {
    pub scenario_key: String,
    pub normalized_hand: HandIdentity,
    pub recommended_action: HeroActionRecommendation,
    pub strategy_mix: Vec<crate::domain::WeightedAction>,
    pub ev: Vec<crate::domain::ActionEv>,
    pub confidence: Confidence,
    pub explanation: Vec<String>,
    #[serde(default)]
    pub warnings: Vec<String>,
}
