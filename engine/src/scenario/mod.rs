use anyhow::{bail, Result};

use crate::domain::{
    format_bb, DomainError, NormalizedAction, NormalizedRequest, PlayerActionKind, Position,
    ScenarioDescriptor,
};

#[derive(Debug, Default)]
pub struct ScenarioMapper;

impl ScenarioMapper {
    pub fn map(&self, request: &NormalizedRequest) -> Result<ScenarioDescriptor> {
        let mut warnings = Vec::new();
        let aggressive: Vec<&NormalizedAction> = request
            .action_history
            .iter()
            .filter(|entry| matches!(entry.action, PlayerActionKind::Open | PlayerActionKind::Raise | PlayerActionKind::AllIn))
            .collect();
        let callers: Vec<&NormalizedAction> = request
            .action_history
            .iter()
            .filter(|entry| matches!(entry.action, PlayerActionKind::Call))
            .collect();

        let stack = request.stack_bucket.to_string();
        let hero = format!("{:?}", request.hero_position);

        let descriptor = match aggressive.len() {
            0 => ScenarioDescriptor {
                scenario_key: format!("6max_cash_{stack}_{hero}_first_in"),
                line_signature: "first_in".to_string(),
                hero_position: request.hero_position,
                stack_bucket: request.stack_bucket,
                open_size_bb: None,
                facing_raise_level: 0,
                has_cold_call: false,
                warnings,
            },
            1 => {
                let open = aggressive[0];
                let open_size = open.size_bb.unwrap_or(2.5);
                let mut suffix = format!("vs_{:?}_open_{}", open.position, format_bb(open_size));
                if !callers.is_empty() {
                    if callers.len() > 1 {
                        bail!(DomainError::UnsupportedTree(
                            "more than one cold caller before hero is unsupported in v1".to_string(),
                        ));
                    }
                    suffix.push('_');
                    suffix.push_str(&format!("{:?}_call", callers[0].position));
                    warnings.push("approximating multiway pressure with single-caller abstraction".to_string());
                }
                ScenarioDescriptor {
                    scenario_key: format!("6max_cash_{stack}_{hero}_{suffix}"),
                    line_signature: if callers.is_empty() {
                        "facing_open".to_string()
                    } else {
                        "facing_open_plus_call".to_string()
                    },
                    hero_position: request.hero_position,
                    stack_bucket: request.stack_bucket,
                    open_size_bb: Some(open_size),
                    facing_raise_level: 1,
                    has_cold_call: !callers.is_empty(),
                    warnings,
                }
            }
            2 => {
                let open = aggressive[0];
                let three_bet = aggressive[1];
                ScenarioDescriptor {
                    scenario_key: format!(
                        "6max_cash_{stack}_{hero}_vs_{:?}_open_{}_{:?}_3bet_{}",
                        open.position,
                        format_bb(open.size_bb.unwrap_or(2.5)),
                        three_bet.position,
                        format_bb(three_bet.size_bb.unwrap_or(8.0))
                    ),
                    line_signature: "facing_open_and_3bet".to_string(),
                    hero_position: request.hero_position,
                    stack_bucket: request.stack_bucket,
                    open_size_bb: open.size_bb,
                    facing_raise_level: 2,
                    has_cold_call: !callers.is_empty(),
                    warnings,
                }
            }
            3 => {
                let open = aggressive[0];
                let three_bet = aggressive[1];
                let four_bet = aggressive[2];
                ScenarioDescriptor {
                    scenario_key: format!(
                        "6max_cash_{stack}_{hero}_vs_{:?}_open_{}_{:?}_3bet_{}_{:?}_4bet_{}",
                        open.position,
                        format_bb(open.size_bb.unwrap_or(2.5)),
                        three_bet.position,
                        format_bb(three_bet.size_bb.unwrap_or(8.0)),
                        four_bet.position,
                        format_bb(four_bet.size_bb.unwrap_or(22.0))
                    ),
                    line_signature: "facing_open_3bet_4bet".to_string(),
                    hero_position: request.hero_position,
                    stack_bucket: request.stack_bucket,
                    open_size_bb: open.size_bb,
                    facing_raise_level: 3,
                    has_cold_call: !callers.is_empty(),
                    warnings,
                }
            }
            _ => bail!(DomainError::UnsupportedTree(
                "five-bet and deeper branches are not yet mapped in v1".to_string(),
            )),
        };

        Ok(descriptor)
    }
}
