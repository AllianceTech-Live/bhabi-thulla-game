import { create } from 'zustand';
import {
  chooseCard,
  chooseCardDeterministic,
  createGame,
  playCard,
  revealHand,
  sortHand,
} from '../game';
import type {
  AiDifficulty,
  Card,
  GameMode,
  GameState,
  PlayerType,
  Suit,
  TrickPlay,
} from '../game/types';

export interface OfflineSetup {
  mode: Extract<GameMode, 'offline_pass_play' | 'offline_ai'>;
  humanCount: number;
  aiCount: number;
  aiDifficulty: AiDifficulty;
  humanNames: string[];
}

export interface ThullaMoment {
  plays: TrickPlay[];
  leadSuit: Suit;
  thullaPlayerId: string;
  thullaPlayerName: string;
  collectorId: string;
  collectorName: string;
  thullaCard: Card;
}

interface GameStore {
  state: GameState | null;
  lastError: string | null;
  thullaCountThisGame: number;
  localHumanIds: string[];
  thullaMoment: ThullaMoment | null;
  /** Holds completed trick cards on table briefly so all 4 stay visible */
  heldTrickPlays: TrickPlay[] | null;
  startOfflineGame: (setup: OfflineSetup) => void;
  playLocalCard: (playerId: string, cardId: string) => boolean;
  revealLocalHand: () => void;
  sortLocalHand: (playerId: string) => void;
  runAiTurnIfNeeded: () => void;
  clearThullaMoment: () => void;
  clearHeldTrick: () => void;
  clearGame: () => void;
  clearError: () => void;
}

function buildPlayerConfigs(setup: OfflineSetup) {
  const configs: Array<{
    id: string;
    name: string;
    type: PlayerType;
    aiDifficulty?: AiDifficulty;
  }> = [];

  for (let i = 0; i < setup.humanCount; i++) {
    configs.push({
      id: `human-${i + 1}`,
      name: setup.humanNames[i] ?? `Player ${i + 1}`,
      type: 'human',
    });
  }
  for (let i = 0; i < setup.aiCount; i++) {
    configs.push({
      id: `ai-${i + 1}`,
      name: `AI ${i + 1}`,
      type: 'ai',
      aiDifficulty: setup.aiDifficulty,
    });
  }
  return configs;
}

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  lastError: null,
  thullaCountThisGame: 0,
  localHumanIds: [],
  thullaMoment: null,
  heldTrickPlays: null,

  startOfflineGame: (setup) => {
    const configs = buildPlayerConfigs(setup);
    const state = createGame({
      mode: setup.mode,
      playerConfigs: configs,
    });
    set({
      state,
      lastError: null,
      thullaCountThisGame: 0,
      localHumanIds: configs.filter((c) => c.type === 'human').map((c) => c.id),
      thullaMoment: null,
      heldTrickPlays: null,
    });
  },

  playLocalCard: (playerId, cardId) => {
    const { state } = get();
    if (!state) return false;

    const prevTrick = state.trick;
    const player = state.players.find((p) => p.id === playerId);
    const playedCard = player?.hand.find((c) => c.id === cardId);

    const result = playCard(state, playerId, cardId);
    if (!result.success) {
      set({ lastError: result.error ?? 'Invalid move' });
      return false;
    }

    const thullaEvent = result.events.find((e) => e.type === 'thulla');
    const trickWon = result.events.find((e) => e.type === 'trick_won');
    let thullaMoment: ThullaMoment | null = null;
    let heldTrickPlays: TrickPlay[] | null = get().heldTrickPlays;

    const completedPlays: TrickPlay[] | null =
      playedCard != null
        ? [
            ...prevTrick.plays,
            {
              playerId,
              card: playedCard,
              isThulla: Boolean(thullaEvent),
            },
          ]
        : null;

    if (thullaEvent && playedCard && prevTrick.leadSuit && completedPlays) {
      const collectorId = String(thullaEvent.payload?.collectorId ?? '');
      const collector = result.state.players.find((p) => p.id === collectorId);
      thullaMoment = {
        plays: completedPlays,
        leadSuit: prevTrick.leadSuit,
        thullaPlayerId: playerId,
        thullaPlayerName: player?.name ?? 'Player',
        collectorId,
        collectorName: collector?.name ?? 'Player',
        thullaCard: playedCard,
      };
      heldTrickPlays = completedPlays;
    } else if (trickWon && completedPlays) {
      // Keep all 4 cards visible until UI clears after delay
      heldTrickPlays = completedPlays;
    } else if (result.state.trick.plays.length > 0) {
      heldTrickPlays = result.state.trick.plays;
    }

    const thullas =
      get().thullaCountThisGame + (thullaEvent ? 1 : 0);

    set({
      state: result.state,
      lastError: null,
      thullaCountThisGame: thullas,
      thullaMoment,
      heldTrickPlays,
    });
    return true;
  },

  revealLocalHand: () => {
    const { state } = get();
    if (!state) return;
    set({ state: revealHand(state) });
  },

  sortLocalHand: (playerId) => {
    const { state } = get();
    if (!state) return;
    set({
      state: {
        ...state,
        players: state.players.map((p) =>
          p.id === playerId ? { ...p, hand: sortHand(p.hand) } : p
        ),
      },
    });
  },

  runAiTurnIfNeeded: () => {
    const { state, playLocalCard, thullaMoment, heldTrickPlays } = get();
    // Wait while 4 cards are held on table after a completed trick
    if (
      !state ||
      state.phase === 'game_complete' ||
      thullaMoment ||
      (heldTrickPlays &&
        heldTrickPlays.length > 0 &&
        state.trick.plays.length === 0)
    ) {
      return;
    }
    const current = state.players.find(
      (p) => p.id === state.currentTurnPlayerId
    );
    if (!current || current.type !== 'ai' || current.status !== 'active') {
      return;
    }

    const difficulty = current.aiDifficulty ?? 'medium';
    const card =
      difficulty === 'easy'
        ? chooseCardDeterministic({
            state,
            playerId: current.id,
            difficulty,
          })
        : chooseCard({
            state,
            playerId: current.id,
            difficulty,
          });

    playLocalCard(current.id, card.id);
  },

  clearThullaMoment: () => set({ thullaMoment: null, heldTrickPlays: null }),

  clearHeldTrick: () => set({ heldTrickPlays: null }),

  clearGame: () =>
    set({
      state: null,
      lastError: null,
      thullaCountThisGame: 0,
      localHumanIds: [],
      thullaMoment: null,
      heldTrickPlays: null,
    }),

  clearError: () => set({ lastError: null }),
}));
