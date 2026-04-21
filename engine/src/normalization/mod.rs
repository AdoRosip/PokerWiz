use anyhow::{bail, Result};

use crate::api::EvaluatePreflopRequest;
use crate::domain::{
    stack_bucket_for, Card, DomainError, HandIdentity, HeroHand, NormalizedAction, NormalizedRequest,
    PlayerActionKind, Position, TableFormat,
};

#[derive(Debug, Default)]
pub struct NormalizationService;

impl NormalizationService {
    pub fn normalize(&self, request: EvaluatePreflopRequest) -> Result<NormalizedRequest> {
        if !matches!(request.format, TableFormat::SixMaxCash) {
            bail!(DomainError::UnsupportedFormat);
        }

        let first = request.hero_cards[0].parse::<Card>()?;
        let second = request.hero_cards[1].parse::<Card>()?;
        if first == second {
            bail!(DomainError::DuplicateHeroCards);
        }
        let hero_hand = HeroHand { cards: [first, second] };
        let hand_identity = HandIdentity {
            combo: hero_hand.combo_key(),
            hand_class: hero_hand.hand_class_key(),
        };

        let stack_bucket = stack_bucket_for(request.effective_stack_bb)?;
        let action_history = self.normalize_actions(&request.action_history, request.hero_position)?;

        Ok(NormalizedRequest {
            format: request.format,
            effective_stack_bb: request.effective_stack_bb,
            stack_bucket,
            hero_position: request.hero_position,
            hero_hand,
            hand_identity,
            blinds: request.blinds,
            action_history,
            mode: request.mode,
        })
    }

    fn normalize_actions(
        &self,
        raw: &[crate::domain::PlayerActionInput],
        hero_position: Position,
    ) -> Result<Vec<NormalizedAction>> {
        let mut normalized = Vec::with_capacity(raw.len());
        let mut highest_raise_level = 0_u8;
        let mut any_limp = false;
        let mut previous_position_index = None::<usize>;

        for action in raw {
            if !action.position.acts_before(hero_position) {
                bail!(DomainError::InvalidActionSequence(format!(
                    "action from {:?} occurs after hero position {:?}",
                    action.position, hero_position
                )));
            }

            if let Some(previous_index) = previous_position_index {
                if action.position.index() <= previous_index {
                    bail!(DomainError::InvalidActionSequence(
                        "actions must be in table order before hero".to_string(),
                    ));
                }
            }
            previous_position_index = Some(action.position.index());

            if matches!(action.action, PlayerActionKind::Call) && highest_raise_level == 0 {
                any_limp = true;
            }

            if any_limp {
                bail!(DomainError::UnsupportedTree(
                    "limp and overlimp trees are out of scope for v1".to_string(),
                ));
            }

            let raise_level = match action.action {
                PlayerActionKind::Open => {
                    highest_raise_level = 1;
                    1
                }
                PlayerActionKind::Raise => {
                    highest_raise_level += 1;
                    highest_raise_level
                }
                PlayerActionKind::AllIn => {
                    highest_raise_level += 1;
                    highest_raise_level
                }
                PlayerActionKind::Fold | PlayerActionKind::Call => highest_raise_level,
            };

            match action.action {
                PlayerActionKind::Open | PlayerActionKind::Raise | PlayerActionKind::AllIn => {
                    if action.size_bb.is_none() {
                        bail!(DomainError::InvalidActionSequence(format!(
                            "aggressive action from {:?} requires a size",
                            action.position
                        )));
                    }
                }
                PlayerActionKind::Fold | PlayerActionKind::Call => {}
            }

            normalized.push(NormalizedAction {
                position: action.position,
                action: action.action.clone(),
                size_bb: action.size_bb.map(|value| (value * 10.0).round() / 10.0),
                raise_level,
            });
        }

        Ok(normalized)
    }
}
