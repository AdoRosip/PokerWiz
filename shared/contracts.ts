export const ORDERED_POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB", "BB"] as const;

export type Position = (typeof ORDERED_POSITIONS)[number];
export type TableFormat = "6max_cash";
export type Mode =
  | "strict_gto_frequencies"
  | "highest_frequency_simplification"
  | "highest_ev_pure";
export type PlayerActionKind = "fold" | "call" | "open" | "raise" | "all_in";
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

export interface EvaluatePreflopResponse {
  status: "supported";
  scenario_key: string;
  normalized_hand: HandIdentity;
  recommended_action: HeroActionRecommendation;
  strategy_mix: WeightedAction[];
  ev: ActionEv[];
  confidence: Confidence;
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
}
