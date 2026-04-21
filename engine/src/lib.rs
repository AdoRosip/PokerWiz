pub mod api;
pub mod decision;
pub mod domain;
pub mod explanation;
pub mod normalization;
pub mod repository;
pub mod scenario;

use std::path::Path;
use std::sync::Arc;

use anyhow::Result;

use crate::api::{EvaluatePreflopRequest, EvaluatePreflopResponse};
use crate::decision::DecisionService;
use crate::explanation::ExplanationService;
use crate::normalization::NormalizationService;
use crate::repository::{JsonStrategyRepository, StrategyRepository};
use crate::scenario::ScenarioMapper;

pub struct Engine {
    repository: Arc<dyn StrategyRepository>,
    normalizer: NormalizationService,
    mapper: ScenarioMapper,
    decision: DecisionService,
    explanation: ExplanationService,
}

impl Engine {
    pub fn from_json_file(path: impl AsRef<Path>) -> Result<Self> {
        let repository = Arc::new(JsonStrategyRepository::load_file(path)?);
        Ok(Self::new(repository))
    }

    pub fn new(repository: Arc<dyn StrategyRepository>) -> Self {
        Self {
            repository,
            normalizer: NormalizationService::default(),
            mapper: ScenarioMapper::default(),
            decision: DecisionService::default(),
            explanation: ExplanationService::default(),
        }
    }

    pub fn evaluate(&self, request: EvaluatePreflopRequest) -> Result<EvaluatePreflopResponse> {
        let normalized = self.normalizer.normalize(request)?;
        let scenario = self.mapper.map(&normalized)?;
        let lookup = self.repository.lookup(&scenario, &normalized.hand_identity)?;
        let mut response = self
            .decision
            .select(&normalized, &scenario, lookup.as_ref())?;
        response.explanation = self.explanation.build(&normalized, &scenario, &response);
        Ok(response)
    }
}
