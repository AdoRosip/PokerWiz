use anyhow::{bail, Result};

use crate::api::EvaluatePreflopResponse;
use crate::domain::{
    ActionEv, Confidence, DatasetMatch, HandResolution, HeroActionRecommendation, HeroActionType,
    Mode, NormalizedRequest, ScenarioDescriptor, StrategyAction, StrategyLookupResult, WeightedAction,
};

#[derive(Debug, Default)]
pub struct DecisionService;

impl DecisionService {
    pub fn select(
        &self,
        normalized: &NormalizedRequest,
        scenario: &ScenarioDescriptor,
        lookup: Option<&StrategyLookupResult>,
    ) -> Result<EvaluatePreflopResponse> {
        let Some(lookup) = lookup else {
            bail!("unsupported scenario: {}", scenario.scenario_key);
        };

        if lookup.entry.actions.is_empty() {
            bail!("strategy entry contained no actions");
        }

        let recommended_action = match normalized.mode {
            Mode::StrictGtoFrequencies => self.strict_mode_action(&lookup.entry.actions),
            Mode::HighestFrequencySimplification => {
                self.highest_frequency_action(&lookup.entry.actions, true)
            }
            Mode::HighestEvPure => self.highest_ev_action(&lookup.entry.actions),
        };

        let confidence = Confidence {
            dataset_match: lookup.dataset_match.clone(),
            hand_resolution: lookup.entry.hand_resolution.clone(),
            source: lookup.entry.source.clone(),
        };

        let strategy_mix = lookup
            .entry
            .actions
            .iter()
            .map(|action| WeightedAction {
                action_key: action.action_key.clone(),
                frequency: action.frequency,
            })
            .collect();

        let ev = lookup
            .entry
            .actions
            .iter()
            .map(|action| ActionEv {
                action_key: action.action_key.clone(),
                ev_bb: action.ev_bb.unwrap_or(0.0),
            })
            .collect();

        Ok(EvaluatePreflopResponse {
            scenario_key: lookup.entry.scenario_key.clone(),
            normalized_hand: normalized.hand_identity.clone(),
            recommended_action,
            strategy_mix,
            ev,
            confidence,
            explanation: Vec::new(),
            warnings: lookup.warnings.clone(),
        })
    }

    fn strict_mode_action(&self, actions: &[StrategyAction]) -> HeroActionRecommendation {
        self.highest_frequency_action(actions, false)
    }

    fn highest_frequency_action(
        &self,
        actions: &[StrategyAction],
        add_note: bool,
    ) -> HeroActionRecommendation {
        let top = actions
            .iter()
            .max_by(|left, right| left.frequency.total_cmp(&right.frequency))
            .expect("actions are non-empty");
        let mut action = recommendation_from_key(top);
        if add_note && top.frequency < 0.95 {
            action.pure_simplification_note = Some(format!(
                "Pure simplification chosen from a mixed strategy; highest frequency action was {:.0}%",
                top.frequency * 100.0
            ));
        }
        action
    }

    fn highest_ev_action(&self, actions: &[StrategyAction]) -> HeroActionRecommendation {
        let top = actions
            .iter()
            .max_by(|left, right| left.ev_bb.unwrap_or(0.0).total_cmp(&right.ev_bb.unwrap_or(0.0)))
            .expect("actions are non-empty");
        let mut action = recommendation_from_key(top);
        action.pure_simplification_note = Some("Highest-EV pure action selected".to_string());
        action
    }
}

fn recommendation_from_key(strategy_action: &StrategyAction) -> HeroActionRecommendation {
    let action_key = strategy_action.action_key.to_lowercase();
    let action_type = if action_key.starts_with("fold") {
        HeroActionType::Fold
    } else if action_key.starts_with("call") {
        HeroActionType::Call
    } else if action_key.starts_with("5bet_jam") {
        HeroActionType::FiveBetJam
    } else if action_key.starts_with("4bet") {
        HeroActionType::FourBet
    } else if action_key.starts_with("3bet") {
        HeroActionType::ThreeBet
    } else {
        HeroActionType::Raise
    };

    HeroActionRecommendation {
        action_type,
        size_bb: strategy_action.size_bb.or_else(|| parse_size_bb(&action_key)),
        pure_simplification_note: None,
    }
}

fn parse_size_bb(action_key: &str) -> Option<f32> {
    let marker = action_key.rsplit('_').next()?;
    if marker.ends_with("bb") {
        return marker.trim_end_matches("bb").parse::<f32>().ok();
    }
    None
}
