/** Strongly typed models for Bhabi Thulla */

export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

export type Rank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'J'
  | 'Q'
  | 'K'
  | 'A';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export type PlayerStatus = 'active' | 'escaped' | 'bhabhi';

export type PlayerType = 'human' | 'ai';

export type AiDifficulty = 'easy' | 'medium' | 'hard';

export type GamePhase =
  | 'waiting'
  | 'dealing'
  | 'playing'
  | 'thulla'
  | 'player_escaped'
  | 'round_complete'
  | 'game_complete';

export type GameMode = 'offline_pass_play' | 'offline_ai' | 'online';

export interface Player {
  id: string;
  name: string;
  seat: number; // 1–4
  type: PlayerType;
  status: PlayerStatus;
  hand: Card[];
  aiDifficulty?: AiDifficulty;
}

export interface TrickPlay {
  playerId: string;
  card: Card;
  isThulla: boolean;
}

export interface TrickState {
  leadSuit: Suit | null;
  plays: TrickPlay[];
  leaderId: string | null;
}

export interface GameEvent {
  type:
    | 'deal'
    | 'card_played'
    | 'thulla'
    | 'trick_won'
    | 'pile_collected'
    | 'player_escaped'
    | 'bhabhi'
    | 'game_complete'
    | 'pass_device';
  payload?: Record<string, unknown>;
  timestamp: number;
}

export interface GameState {
  id: string;
  mode: GameMode;
  phase: GamePhase;
  players: Player[];
  currentTurnPlayerId: string | null;
  trick: TrickState;
  discarded: Card[];
  events: GameEvent[];
  escapedOrder: string[];
  bhabhiId: string | null;
  roundNumber: number;
  /** Pass-and-play: hide hand until player confirms */
  handRevealed: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PlayCardResult {
  success: boolean;
  error?: string;
  state: GameState;
  events: GameEvent[];
}

export const SUITS: readonly Suit[] = [
  'spades',
  'hearts',
  'diamonds',
  'clubs',
] as const;

export const RANKS: readonly Rank[] = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
  'A',
] as const;

/** Ace highest → 2 lowest */
export const RANK_VALUES: Record<Rank, number> = {
  '2': 2,
  '3': 3,
  '4': 4,
  '5': 5,
  '6': 6,
  '7': 7,
  '8': 8,
  '9': 9,
  '10': 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

export const ACE_OF_SPADES_ID = 'spades-A';

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
