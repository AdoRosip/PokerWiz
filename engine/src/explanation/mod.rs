use crate::api::EvaluatePreflopResponse;
use crate::domain::{DatasetMatch, HeroActionType, NormalizedRequest, ScenarioDescriptor};

#[derive(Debug, Default)]
pub struct ExplanationService;

impl ExplanationService {
    pub fn build(
        &self,
        normalized: &NormalizedRequest,
        scenario: &ScenarioDescriptor,
        response: &EvaluatePreflopResponse,
    ) -> Vec<String> {
        let mut lines = Vec::new();

        lines.push(format!(
            "{} is classified as {} in the current strategy pack.",
            normalized.hand_identity.combo, normalized.hand_identity.hand_class
        ));

        match scenario.line_signature.as_str() {
            "first_in" => lines.push(format!(
                "This is an unopened spot from {:?}, so the engine is comparing your hand against the first-in opening range for {}.",
                normalized.hero_position, scenario.stack_bucket
            )),
            "facing_open" => lines.push(format!(
                "You are facing a single open before acting from {:?}; position and stack depth drive whether this hand prefers folding, flatting, or reraising.",
                normalized.hero_position
            )),
            "facing_open_plus_call" => lines.push(
                "A cold caller is already in the pot, so squeeze incentives and realization penalties both matter.".to_string(),
            ),
            "facing_open_and_3bet" => lines.push(
                "The pot is already 3-bet before Hero, which compresses continuing ranges and increases blocker value.".to_string(),
            ),
            "facing_open_3bet_4bet" => lines.push(
                "This is a 4-bet decision node, so only the strongest value hands and selected blocker-driven bluffs continue frequently.".to_string(),
            ),
            _ => {}
        }

        if normalized.hand_identity.hand_class.starts_with('A')
            && normalized.hand_identity.hand_class.ends_with('s')
        {
            lines.push(
                "Suited ace holdings gain blocker value while retaining playable equity when called.".to_string(),
            );
        }

        match response.recommended_action.action_type {
            HeroActionType::ThreeBet | HeroActionType::FourBet | HeroActionType::FiveBetJam => {
                lines.push(
                    "The preferred line is aggressive, which usually means the hand benefits more from fold equity and range leverage than from passive realization."
                        .to_string(),
                );
            }
            HeroActionType::Call => lines.push(
                "The strategy prefers realizing equity in position or at a defendable price rather than inflating the pot immediately."
                    .to_string(),
            ),
            HeroActionType::Fold => lines.push(
                "The hand falls below the continue threshold for this node once position, price, and stack depth are combined."
                    .to_string(),
            ),
            HeroActionType::Raise => lines.push(
                "The hand sits inside the value or pressure portion of the continuing range for this unopened node."
                    .to_string(),
            ),
        }

        if matches!(response.confidence.dataset_match, DatasetMatch::ApproximatedNode) {
            lines.push(
                "The exact node was unavailable, so this result uses the nearest supported abstraction and should be treated as approximate."
                    .to_string(),
            );
        }

        lines
    }
}
