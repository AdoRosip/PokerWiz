export const ORDERED_POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB", "BB"] as const;

export type Position = (typeof ORDERED_POSITIONS)[number];
export type TableFormat = "6max_cash";
export type Mode =
  | "strict_gto_frequencies"
  | "highest_frequency_simplification"
  | "highest_ev_pure";
export type PlayerActionKind = "fold" | "call" | "open" | "raise" | "all_in";
export const AGGRESSIVE_PLAYER_ACTIONS = ["open", "raise", "all_in"] as const satisfies readonly PlayerActionKind[];
export type StackBucket = "20bb" | "40bb" | "60bb" | "100bb" | "150bb_plus";
export type HandResolution = "combo" | "hand_class";
export type DatasetMatch = "exact_node" | "approximated_node" | "unsupported";
export type HeroActionType = "fold" | "call" | "raise" | "3bet" | "4bet" | "5bet_jam";

export interface BlindStructure {
  sb: number;
  bb: number;
}

export interface PlayerActionInput {
  position: Position;
  action: PlayerActionKind;
  size_bb?: number;
}

export interface EvaluatePreflopRequest {
  format: TableFormat;
  effective_stack_bb: number;
  hero_position: Position;
  hero_cards: [string, string];
  blinds: BlindStructure;
  action_history: PlayerActionInput[];
  mode: Mode;
}

export interface HandIdentity {
  combo: string;
  hand_class: string;
}

export interface HeroActionRecommendation {
  action_type: HeroActionType;
  size_bb?: number | null;
  pure_simplification_note?: string | null;
}

export interface WeightedAction {
  action_key: string;
  frequency: number;
}

export interface ActionEv {
  action_key: string;
  ev_bb: number;
}

export interface Confidence {
  dataset_match: DatasetMatch;
  hand_resolution: HandResolution;
  source: string;
}

export interface NodeCoverage {
  total_hand_classes: number;
  covered_hand_classes: number;
  coverage_ratio: number;
  is_complete: boolean;
  matched_scenario_key: string;
}

export interface PackScenarioCoverageSummary extends NodeCoverage {
  hero_position: Position;
  line_signature: StrategyEntry["line_signature"];
}

export interface PreflopPackSummary {
  dataset_version: string;
  game: TableFormat;
  total_scenarios: number;
  total_entries: number;
  fully_covered_scenarios: number;
  partially_covered_scenarios: number;
  average_scenario_coverage_ratio: number;
  scenarios: PackScenarioCoverageSummary[];
}

export interface PreflopPackManifest {
  schema_version: number;
  manifest_version: number;
  dataset_version: string;
  game: TableFormat;
  source_pack: string;
  entry_count: number;
  scenario_count: number;
  fully_covered_scenarios: number;
  partially_covered_scenarios: number;
  average_scenario_coverage_ratio: number;
  hero_position_scenario_counts: Record<Position, number>;
  line_signature_scenario_counts: Record<ScenarioDescriptor["line_signature"], number>;
  scenarios: PackScenarioCoverageSummary[];
}

export interface EvaluatePreflopResponse {
  status: "supported";
  scenario_key: string;
  normalized_hand: HandIdentity;
  recommended_action: HeroActionRecommendation;
  strategy_mix: WeightedAction[];
  ev: ActionEv[];
  confidence: Confidence;
  node_coverage: NodeCoverage;
  explanation: string[];
  warnings: string[];
}

export interface UnsupportedPreflopResponse {
  status: "unsupported";
  scenario_key: string;
  normalized_hand: HandIdentity;
  confidence: {
    dataset_match: "unsupported";
    hand_resolution: "hand_class";
    source: string;
  };
  explanation: string[];
  warnings: string[];
  unsupported_reason: string;
  nearest_supported_scenarios: string[];
  node_coverage: NodeCoverage;
}

export type PreflopEvaluationResult = EvaluatePreflopResponse | UnsupportedPreflopResponse;

export interface StrategyAction {
  action_key: string;
  frequency: number;
  ev_bb?: number;
  size_bb?: number;
}

export interface StrategyEntry {
  scenario_key: string;
  line_signature: string;
  stack_bucket: StackBucket;
  hero_position: Position;
  hand_key: string;
  hand_resolution: HandResolution;
  actions: StrategyAction[];
  tags: string[];
  source: string;
}

export interface StrategyPack {
  schema_version: number;
  dataset_version: string;
  game: TableFormat;
  entries: StrategyEntry[];
}

export interface PreflopSolverImportAction {
  action_key: string;
  frequency: number;
  ev_bb?: number;
  size_bb?: number;
}

export interface PreflopSolverImportRow {
  scenario_key: string;
  line_signature: StrategyEntry["line_signature"];
  stack_bucket: StackBucket;
  hero_position: Position;
  hand_key: string;
  hand_resolution: HandResolution;
  actions: PreflopSolverImportAction[];
  tags?: string[];
  source_label?: string;
}

export interface PreflopSolverImportDocument {
  schema_version: number;
  import_version: number;
  dataset_version: string;
  game: TableFormat;
  source_solver: string;
  source_format: string;
  source_tree: string;
  default_source_label?: string;
  rows: PreflopSolverImportRow[];
}

export interface PreflopFlatSolverExportRow {
  scenario_key: string;
  line_signature: StrategyEntry["line_signature"];
  stack_bucket: StackBucket;
  hero_position: Position;
  hand_key: string;
  hand_resolution: HandResolution;
  tags?: string[];
  source_label?: string;
  action_frequencies: Record<string, number>;
  action_evs_bb?: Record<string, number>;
  action_sizes_bb?: Record<string, number>;
}

export interface PreflopFlatSolverExportDocument {
  schema_version: number;
  export_version: number;
  dataset_version: string;
  game: TableFormat;
  source_solver: string;
  source_format: "flat_preflop_export_v1";
  source_tree: string;
  default_source_label?: string;
  rows: PreflopFlatSolverExportRow[];
}

export interface PreflopTabularSolverExportRow {
  dataset_version: string;
  game: TableFormat;
  source_solver: string;
  source_format: "tabular_preflop_export_v1";
  source_tree: string;
  default_source_label?: string;
  scenario_key: string;
  line_signature: StrategyEntry["line_signature"];
  stack_bucket: StackBucket;
  hero_position: Position;
  hand_key: string;
  hand_resolution: HandResolution;
  tags?: string[];
  source_label?: string;
  action_frequencies: Record<string, number>;
  action_evs_bb?: Record<string, number>;
  action_sizes_bb?: Record<string, number>;
}

export interface PreflopTabularSolverExportDocument {
  schema_version: number;
  export_version: number;
  dataset_version: string;
  game: TableFormat;
  source_solver: string;
  source_format: "tabular_preflop_export_v1";
  source_tree: string;
  default_source_label?: string;
  rows: PreflopTabularSolverExportRow[];
}

export interface PreflopSimpleCsvProfileRow {
  dataset_version: string;
  game: TableFormat;
  source_solver: string;
  source_format: "simple_csv_profile_v1";
  source_tree: string;
  default_source_label?: string;
  scenario_key: string;
  line_signature: StrategyEntry["line_signature"];
  stack_bucket: StackBucket;
  hero_position: Position;
  hand_key: string;
  hand_resolution: HandResolution;
  tags?: string[];
  source_label?: string;
  actions: PreflopSolverImportAction[];
}

export interface PreflopSimpleCsvProfileDocument {
  schema_version: number;
  export_version: number;
  dataset_version: string;
  game: TableFormat;
  source_solver: string;
  source_format: "simple_csv_profile_v1";
  source_tree: string;
  default_source_label?: string;
  rows: PreflopSimpleCsvProfileRow[];
}

export interface NormalizedAction {
  position: Position;
  action: PlayerActionKind;
  size_bb?: number;
  raise_level: number;
}

export interface NormalizedRequest {
  format: TableFormat;
  effective_stack_bb: number;
  stack_bucket: StackBucket;
  hero_position: Position;
  hero_cards: [string, string];
  hand_identity: HandIdentity;
  blinds: BlindStructure;
  action_history: NormalizedAction[];
  mode: Mode;
}

export interface ScenarioDescriptor {
  scenario_key: string;
  line_signature:
    | "first_in"
    | "facing_open"
    | "facing_open_plus_call"
    | "facing_open_and_3bet"
    | "facing_open_3bet_4bet";
  hero_position: Position;
  stack_bucket: StackBucket;
  open_size_bb?: number;
  facing_raise_level: number;
  has_cold_call: boolean;
  warnings: string[];
}

export interface StrategyLookupResult {
  entry: StrategyEntry;
  dataset_match: DatasetMatch;
  warnings: string[];
  node_coverage: NodeCoverage;
}
