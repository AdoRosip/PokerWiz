use std::collections::BTreeMap;
use std::fmt::{Display, Formatter};
use std::str::FromStr;

use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Debug, Error)]
pub enum DomainError {
    #[error("invalid card notation: {0}")]
    InvalidCard(String),
    #[error("duplicate hero cards are not allowed")]
    DuplicateHeroCards,
    #[error("unsupported table format")]
    UnsupportedFormat,
    #[error("invalid action sequence: {0}")]
    InvalidActionSequence(String),
    #[error("unsupported action tree: {0}")]
    UnsupportedTree(String),
    #[error("unsupported stack depth: {0}")]
    UnsupportedStackDepth(f32),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Position {
    UTG,
    HJ,
    CO,
    BTN,
    SB,
    BB,
}

impl Position {
    pub const ORDER: [Position; 6] = [
        Position::UTG,
        Position::HJ,
        Position::CO,
        Position::BTN,
        Position::SB,
        Position::BB,
    ];

    pub fn index(self) -> usize {
        match self {
            Position::UTG => 0,
            Position::HJ => 1,
            Position::CO => 2,
            Position::BTN => 3,
            Position::SB => 4,
            Position::BB => 5,
        }
    }

    pub fn acts_before(self, other: Position) -> bool {
        self.index() < other.index()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TableFormat {
    #[serde(rename = "6max_cash")]
    SixMaxCash,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Mode {
    StrictGtoFrequencies,
    HighestFrequencySimplification,
    HighestEvPure,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum Suit {
    #[serde(rename = "s")]
    Spades,
    #[serde(rename = "h")]
    Hearts,
    #[serde(rename = "d")]
    Diamonds,
    #[serde(rename = "c")]
    Clubs,
}

impl Suit {
    pub fn as_char(self) -> char {
        match self {
            Suit::Spades => 's',
            Suit::Hearts => 'h',
            Suit::Diamonds => 'd',
            Suit::Clubs => 'c',
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Rank {
    Two = 2,
    Three = 3,
    Four = 4,
    Five = 5,
    Six = 6,
    Seven = 7,
    Eight = 8,
    Nine = 9,
    Ten = 10,
    Jack = 11,
    Queen = 12,
    King = 13,
    Ace = 14,
}

impl Rank {
    pub fn symbol(self) -> char {
        match self {
            Rank::Two => '2',
            Rank::Three => '3',
            Rank::Four => '4',
            Rank::Five => '5',
            Rank::Six => '6',
            Rank::Seven => '7',
            Rank::Eight => '8',
            Rank::Nine => '9',
            Rank::Ten => 'T',
            Rank::Jack => 'J',
            Rank::Queen => 'Q',
            Rank::King => 'K',
            Rank::Ace => 'A',
        }
    }
}

impl FromStr for Rank {
    type Err = DomainError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        match value {
            "2" => Ok(Rank::Two),
            "3" => Ok(Rank::Three),
            "4" => Ok(Rank::Four),
            "5" => Ok(Rank::Five),
            "6" => Ok(Rank::Six),
            "7" => Ok(Rank::Seven),
            "8" => Ok(Rank::Eight),
            "9" => Ok(Rank::Nine),
            "T" | "t" => Ok(Rank::Ten),
            "J" | "j" => Ok(Rank::Jack),
            "Q" | "q" => Ok(Rank::Queen),
            "K" | "k" => Ok(Rank::King),
            "A" | "a" => Ok(Rank::Ace),
            _ => Err(DomainError::InvalidCard(value.to_string())),
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Card {
    pub rank: Rank,
    pub suit: Suit,
}

impl Display for Card {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}{}", self.rank.symbol(), self.suit.as_char())
    }
}

impl FromStr for Card {
    type Err = DomainError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        if value.len() != 2 {
            return Err(DomainError::InvalidCard(value.to_string()));
        }
        let rank = Rank::from_str(&value[0..1])?;
        let suit = match &value[1..2] {
            "s" | "S" => Suit::Spades,
            "h" | "H" => Suit::Hearts,
            "d" | "D" => Suit::Diamonds,
            "c" | "C" => Suit::Clubs,
            _ => return Err(DomainError::InvalidCard(value.to_string())),
        };
        Ok(Self { rank, suit })
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HeroHand {
    pub cards: [Card; 2],
}

impl HeroHand {
    pub fn combo_key(&self) -> String {
        let [a, b] = self.cards;
        if a.rank > b.rank || (a.rank == b.rank && a.suit.as_char() >= b.suit.as_char()) {
            format!("{a}{b}")
        } else {
            format!("{b}{a}")
        }
    }

    pub fn hand_class_key(&self) -> String {
        let [a, b] = self.cards;
        let (hi, lo) = if a.rank >= b.rank { (a, b) } else { (b, a) };
        if hi.rank == lo.rank {
            return format!("{}{}", hi.rank.symbol(), lo.rank.symbol());
        }
        let suitedness = if hi.suit == lo.suit { 's' } else { 'o' };
        format!("{}{}{}", hi.rank.symbol(), lo.rank.symbol(), suitedness)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct HandIdentity {
    pub combo: String,
    pub hand_class: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize)]
pub struct BlindStructure {
    pub sb: f32,
    pub bb: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum PlayerActionKind {
    Fold,
    Call,
    Open,
    Raise,
    AllIn,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct PlayerActionInput {
    pub position: Position,
    pub action: PlayerActionKind,
    #[serde(default)]
    pub size_bb: Option<f32>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct NormalizedAction {
    pub position: Position,
    pub action: PlayerActionKind,
    pub size_bb: Option<f32>,
    pub raise_level: u8,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum StackBucket {
    #[serde(rename = "20bb")]
    Bb20,
    #[serde(rename = "40bb")]
    Bb40,
    #[serde(rename = "60bb")]
    Bb60,
    #[serde(rename = "100bb")]
    Bb100,
    #[serde(rename = "150bb_plus")]
    Bb150Plus,
}

impl Display for StackBucket {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let label = match self {
            StackBucket::Bb20 => "20bb",
            StackBucket::Bb40 => "40bb",
            StackBucket::Bb60 => "60bb",
            StackBucket::Bb100 => "100bb",
            StackBucket::Bb150Plus => "150bb_plus",
        };
        write!(f, "{label}")
    }
}

#[derive(Debug, Clone, PartialEq)]
pub struct NormalizedRequest {
    pub format: TableFormat,
    pub effective_stack_bb: f32,
    pub stack_bucket: StackBucket,
    pub hero_position: Position,
    pub hero_hand: HeroHand,
    pub hand_identity: HandIdentity,
    pub blinds: BlindStructure,
    pub action_history: Vec<NormalizedAction>,
    pub mode: Mode,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HandResolution {
    Combo,
    HandClass,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DatasetMatch {
    ExactNode,
    ApproximatedNode,
    Unsupported,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub struct Confidence {
    pub dataset_match: DatasetMatch,
    pub hand_resolution: HandResolution,
    pub source: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum HeroActionType {
    Fold,
    Call,
    Raise,
    ThreeBet,
    FourBet,
    FiveBetJam,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct HeroActionRecommendation {
    pub action_type: HeroActionType,
    #[serde(default)]
    pub size_bb: Option<f32>,
    #[serde(default)]
    pub pure_simplification_note: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct WeightedAction {
    pub action_key: String,
    pub frequency: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ActionEv {
    pub action_key: String,
    pub ev_bb: f32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StrategyAction {
    pub action_key: String,
    pub frequency: f32,
    #[serde(default)]
    pub ev_bb: Option<f32>,
    #[serde(default)]
    pub size_bb: Option<f32>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StrategyEntry {
    pub scenario_key: String,
    pub line_signature: String,
    pub stack_bucket: StackBucket,
    pub hero_position: Position,
    pub hand_key: String,
    pub hand_resolution: HandResolution,
    pub actions: Vec<StrategyAction>,
    #[serde(default)]
    pub tags: Vec<String>,
    pub source: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct StrategyPack {
    pub schema_version: u32,
    pub dataset_version: String,
    pub game: TableFormat,
    pub entries: Vec<StrategyEntry>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct ScenarioDescriptor {
    pub scenario_key: String,
    pub line_signature: String,
    pub hero_position: Position,
    pub stack_bucket: StackBucket,
    pub open_size_bb: Option<f32>,
    pub facing_raise_level: u8,
    pub has_cold_call: bool,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct StrategyLookupResult {
    pub entry: StrategyEntry,
    pub dataset_match: DatasetMatch,
    pub warnings: Vec<String>,
}

pub type ActionMap = BTreeMap<String, f32>;

pub fn stack_bucket_for(effective_stack_bb: f32) -> Result<StackBucket, DomainError> {
    if effective_stack_bb <= 0.0 {
        return Err(DomainError::UnsupportedStackDepth(effective_stack_bb));
    }
    let bucket = if effective_stack_bb <= 30.0 {
        StackBucket::Bb20
    } else if effective_stack_bb <= 50.0 {
        StackBucket::Bb40
    } else if effective_stack_bb <= 80.0 {
        StackBucket::Bb60
    } else if effective_stack_bb <= 125.0 {
        StackBucket::Bb100
    } else {
        StackBucket::Bb150Plus
    };
    Ok(bucket)
}

pub fn format_bb(value: f32) -> String {
    let rounded = (value * 10.0).round() / 10.0;
    if (rounded.fract() - 0.0).abs() < 0.001 {
        format!("{rounded:.0}bb")
    } else {
        format!("{rounded:.1}bb")
    }
}
