use std::collections::HashMap;
use std::fs;
use std::path::Path;

use anyhow::{anyhow, Result};

use crate::domain::{
    DatasetMatch, HandIdentity, HandResolution, ScenarioDescriptor, StrategyEntry, StrategyLookupResult,
    StrategyPack,
};

pub trait StrategyRepository: Send + Sync {
    fn lookup(
        &self,
        scenario: &ScenarioDescriptor,
        hand_identity: &HandIdentity,
    ) -> Result<Option<StrategyLookupResult>>;
}

#[derive(Debug)]
pub struct JsonStrategyRepository {
    pack: StrategyPack,
    by_scenario: HashMap<String, Vec<StrategyEntry>>,
}

impl JsonStrategyRepository {
    pub fn load_file(path: impl AsRef<Path>) -> Result<Self> {
        let raw = fs::read_to_string(path)?;
        let pack: StrategyPack = serde_json::from_str(&raw)?;
        let mut by_scenario: HashMap<String, Vec<StrategyEntry>> = HashMap::new();
        for entry in &pack.entries {
            by_scenario
                .entry(entry.scenario_key.clone())
                .or_default()
                .push(entry.clone());
        }
        Ok(Self { pack, by_scenario })
    }

    fn approximate_by_prefix(&self, scenario_key: &str) -> Option<&Vec<StrategyEntry>> {
        let prefix = scenario_key
            .split("_open_")
            .next()
            .unwrap_or(scenario_key)
            .to_string();
        self.by_scenario
            .iter()
            .find(|(candidate, _)| candidate.starts_with(&prefix))
            .map(|(_, entries)| entries)
    }
}

impl StrategyRepository for JsonStrategyRepository {
    fn lookup(
        &self,
        scenario: &ScenarioDescriptor,
        hand_identity: &HandIdentity,
    ) -> Result<Option<StrategyLookupResult>> {
        let source = self.pack.dataset_version.clone();
        let exact = self.by_scenario.get(&scenario.scenario_key);
        let (entries, dataset_match, mut warnings) = if let Some(entries) = exact {
            (entries, DatasetMatch::ExactNode, scenario.warnings.clone())
        } else if let Some(entries) = self.approximate_by_prefix(&scenario.scenario_key) {
            let mut warnings = scenario.warnings.clone();
            warnings.push(format!(
                "exact node {} not found; nearest scenario prefix approximation used",
                scenario.scenario_key
            ));
            (entries, DatasetMatch::ApproximatedNode, warnings)
        } else {
            return Ok(None);
        };

        if let Some(entry) = entries.iter().find(|entry| {
            entry.hand_resolution == HandResolution::Combo && entry.hand_key == hand_identity.combo
        }) {
            return Ok(Some(StrategyLookupResult {
                entry: with_source(entry.clone(), &source),
                dataset_match,
                warnings,
            }));
        }

        if let Some(entry) = entries.iter().find(|entry| {
            entry.hand_resolution == HandResolution::HandClass
                && entry.hand_key == hand_identity.hand_class
        }) {
            return Ok(Some(StrategyLookupResult {
                entry: with_source(entry.clone(), &source),
                dataset_match,
                warnings,
            }));
        }

        Err(anyhow!(
            "scenario {} found but hand {} / {} was unavailable",
            scenario.scenario_key,
            hand_identity.combo,
            hand_identity.hand_class
        ))
    }
}

fn with_source(mut entry: StrategyEntry, source: &str) -> StrategyEntry {
    entry.source = source.to_string();
    entry
}
