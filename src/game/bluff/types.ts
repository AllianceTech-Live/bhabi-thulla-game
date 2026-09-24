import type { Card, Rank, PlayerType, AiDifficulty } from '../types';

export type BluffPhase =
  | 'waiting'
  | 'playing'
  | 'challenge'
  | 'game_complete';

export interface BluffPlay {
  playerId: string;
  cardIds: string[];
  claimedRank: Rank;
  actualCards: Card[];
}

export interface BluffPlayer {
  id: string;
  name: string;
  seat: number;
  type: PlayerType;
  hand: Card[];
  aiDifficulty?: AiDifficulty;
  finishOrder: number | null;
}

export interface BluffState {
  id: string;
  kind: 'bluff';
  phase: BluffPhase;
  players: BluffPlayer[];
  currentTurnPlayerId: string | null;
  pile: Card[];
  lastPlay: BluffPlay | null;
  requiredRank: Rank | null;
  events: {
    type: string;
    payload?: Record<string, unknown>;
    timestamp: number;
  }[];
  winnerId: string | null;
  loserId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface CreateBluffOptions {
  playerConfigs: {
    id: string;
    name: string;
    type: PlayerType;
    aiDifficulty?: AiDifficulty;
  }[];
  randomFn?: () => number;
  gameId?: string;
}

export interface BluffActionResult {
  success: boolean;
  error?: string;
  state: BluffState;
}
